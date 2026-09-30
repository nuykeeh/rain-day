// 캐릭터 특수 능력 — M 을 길게(0.4초) 누르면 발동. (PRD 4.5)
//
// 토끼   그물 설치   — 머리 위에 4초짜리 그물. 닿는 쓰레기를 자동으로 배낭에 넣는다
// 개구리 혀 훔치기   — 바라보는 쪽 가장 가까운 대원의 배낭에서 1개를 뺏어 온다
// 원숭이 꼬리 채찍   — 아주 길게 위로 뻗어 가장 가까운 쓰레기 1개를 즉시 낚아챈다

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { SFX } from '../fx/sfx.js';
import { SHAKE } from '../fx/shake.js';

export function abilitySpec(charId) {
  return CFG.ability[charId] ?? CFG.ability.rabbit;
}

export function abilityCooldown(charId) {
  return abilitySpec(charId).cooldown;
}

/** 발동. 성공하면 true (성공해야 쿨다운이 돈다). */
export function useAbility(player, world) {
  switch (player.char.id) {
    case 'frog': return steal(player, world);
    case 'monkey': return whip(player, world);
    default: return net(player, world);
  }
}

// --- 토끼: 그물 ------------------------------------------------------------

function net(player, world) {
  const a = abilitySpec('rabbit');
  world.nets.push({
    owner: player,
    x: player.x,
    y: player.y - a.netOffY,
    w: a.netW,
    h: a.netH,
    life: a.netSeconds,
    max: a.netSeconds,
  });
  world.popups.add(player.x, player.y - player.r * 2, S.popNet, { color: player.char.color, size: 40, life: 0.7 });
  SFX.net();
  return true;
}

// --- 개구리: 혀 훔치기 -----------------------------------------------------

function steal(player, world) {
  const a = abilitySpec('frog');
  let target = null;
  let bestD = Infinity;
  for (const p of world.players) {
    if (p === player || p.backpack.length === 0) continue;
    const dx = p.x - player.x;
    if (Math.sign(dx) !== player.facing) continue;   // 바라보는 쪽만
    const d = Math.abs(dx);
    if (d <= a.range && d < bestD) { bestD = d; target = p; }
  }

  // 혀는 실패해도 뻗는다 (헛손질 연출)
  player.tongue = { t: a.showSeconds, max: a.showSeconds, len: target ? bestD : a.range * 0.45, hit: !!target };

  if (!target) { SFX.whiff(); return false; }
  if (player.usedSlots >= player.maxSlots) {
    SFX.full();
    world.popups.add(player.x, player.y - player.r * 2, S.popFull, { color: THEME.color.danger, size: 34, life: 0.7 });
    return false;
  }

  const item = target.backpack.pop();
  player.backpack.push(item);
  player.happyT = 0.5;
  target.combo = 0;

  SFX.steal();
  SHAKE.add(6);
  world.popups.add(target.x, target.y - target.r * 2, S.popSteal, { color: THEME.color.danger, size: 40, life: 0.9 });
  world.popups.add(player.x, player.y - player.r * 2.4, S.popStole, { color: player.char.color, size: 40, life: 0.9 });

  // 라이벌한테서 뺏으면 전용 대사 (PRD 4.5)
  if (target.char.id === player.char.rival) {
    world.say(target, S.rivalLines[target.char.id] ?? '');
  }
  return true;
}

// --- 원숭이: 꼬리 채찍 -----------------------------------------------------

function whip(player, world) {
  const a = abilitySpec('monkey');
  const g = player.grabSpec();
  const rx = g.rx * a.rxMul;
  const ry = g.ry * a.ryMul;
  const cx = player.x;
  const cy = player.y - ry * 0.5;

  let best = null;
  let bestD = Infinity;
  for (const j of world.junks) {
    if (!j.alive || j.type === 'satellite') continue;   // 위성은 둘이서만
    const nx = (j.x - cx) / rx;
    const ny = (j.y - cy) / ry;
    if (nx * nx + ny * ny > 1) continue;
    const d = Math.hypot(j.x - cx, j.y - cy);
    if (d < bestD) { bestD = d; best = j; }
  }

  player.whip = { t: a.showSeconds, max: a.showSeconds, tx: best ? best.x : cx, ty: best ? best.y : cy - ry * 0.6 };

  if (!best) { SFX.whiff(); return false; }
  if (player.usedSlots + best.slots > player.maxSlots) {
    SFX.full();
    return false;
  }

  player.takeJunk(best, world);
  world.popups.add(player.x, player.y - player.r * 2, S.popWhip, { color: player.char.color, size: 38, life: 0.7 });
  SFX.whip();
  return true;
}

// --- 그물 갱신 -------------------------------------------------------------

export function updateNets(world, dt) {
  for (let i = world.nets.length - 1; i >= 0; i--) {
    const n = world.nets[i];
    n.life -= dt;
    if (n.life <= 0) { world.nets.splice(i, 1); continue; }

    const p = n.owner;
    if (p.usedSlots >= p.maxSlots) continue;   // 배낭이 차면 그물도 멈춘다 (PRD 4.5)

    for (const j of world.junks) {
      if (!j.alive || j.type === 'satellite') continue;
      if (Math.abs(j.x - n.x) > n.w / 2) continue;
      if (j.y < n.y - n.h / 2 || j.y > n.y + n.h / 2 + 18) continue;
      if (p.usedSlots + j.slots > p.maxSlots) break;
      p.takeJunk(j, world);
      SFX.grab(1);
    }
  }
}

export function renderNets(ctx, world, t) {
  for (const n of world.nets) {
    const a = Math.min(1, n.life / 0.5) * 0.9;
    const col = n.owner.char.color;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.strokeRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h);
    ctx.lineWidth = 2;
    ctx.globalAlpha = a * 0.75;
    for (let gx = -n.w / 2; gx <= n.w / 2 + 1; gx += 26) {
      ctx.beginPath();
      ctx.moveTo(n.x + gx, n.y - n.h / 2);
      ctx.lineTo(n.x + gx + 12, n.y + n.h / 2);
      ctx.stroke();
    }
    for (let gy = -n.h / 2; gy <= n.h / 2 + 1; gy += 14) {
      ctx.beginPath();
      ctx.moveTo(n.x - n.w / 2, n.y + gy);
      ctx.lineTo(n.x + n.w / 2, n.y + gy);
      ctx.stroke();
    }
    // 기둥
    ctx.globalAlpha = a * 0.4;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y + n.h / 2);
    ctx.lineTo(n.x, n.owner.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
