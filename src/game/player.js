// 대원 한 명. 길게 누르기·더블탭 판정은 여기서 한다. (PRD 4.2, 7.3)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { drawCharacter, drawGrabShape, text, withAlpha, clamp, fillRound, strokeRound, circle } from '../ui/draw.js';
import { SFX } from '../fx/sfx.js';
import { HITSTOP } from '../fx/hitstop.js';
import { SHAKE } from '../fx/shake.js';
import { useAbility, abilityCooldown } from './abilities.js';

export class Player {
  constructor(slot, char, x) {
    this.slot = slot;
    this.char = char;
    this.x = x;
    this.facing = 1;
    this.backpack = [];
    this.score = 0;

    this.grabCd = 0;
    this.grabFx = null;
    this.abilityCd = 0;
    this.holdT = 0;
    this.holdFired = false;

    this.dashTime = 0;
    this.dashDir = 1;
    this.dashCd = 0;
    this.stagger = 0;
    this.stunned = false;

    this.happyT = 0;
    this.squashT = 0;
    this.combo = 0;
    this.comboT = 0;

    this.buff = null;        // {type:'magnet'|'booster', left}
    this.tongue = null;      // 개구리 혀 연출
    this.whip = null;        // 원숭이 꼬리 연출
    this.sayT = 0;
    this.sayText = '';

    this.lastTap = { L: -99, R: -99 };
    this.trail = [];
  }

  get y() { return CFG.world.orbitY - CFG.player.radius * 0.9 - this.slot * 11; }
  get r() { return CFG.player.radius; }
  get usedSlots() { return this.backpack.reduce((a, it) => a + it.slots, 0); }
  get maxSlots() { return CFG.player.backpackSlots; }
  get isFull() { return this.usedSlots >= this.maxSlots; }
  get busy() { return this.stagger > 0 || this.dashTime > 0; }

  get speed() {
    if (this.buff?.type === 'booster') return CFG.player.moveSpeed * CFG.buff.boosterMul; // 무게 무시
    const slow = 1 - CFG.player.slowPerSlot * this.usedSlots;
    return CFG.player.moveSpeed * Math.max(0.25, slow);
  }

  grabSpec() {
    const g = CFG.grab[this.char.id] ?? CFG.grab.rabbit;
    const m = this.buff?.type === 'magnet' ? CFG.buff.magnetMul : 1;
    return { rx: g.rx * m, ry: g.ry * m, offY: g.offY * m, cooldown: g.cooldown };
  }

  // --- 업데이트 -------------------------------------------------------------

  update(dt, input, world) {
    this.grabCd = Math.max(0, this.grabCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    this.squashT = Math.max(0, this.squashT - dt * 4.5);
    this.sayT = Math.max(0, this.sayT - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    if (this.comboT <= 0) this.combo = 0;

    if (this.grabFx) { this.grabFx.t -= dt; if (this.grabFx.t <= 0) this.grabFx = null; }
    if (this.tongue) { this.tongue.t -= dt; if (this.tongue.t <= 0) this.tongue = null; }
    if (this.whip) { this.whip.t -= dt; if (this.whip.t <= 0) this.whip = null; }

    if (this.buff) {
      this.buff.left -= dt;
      if (this.buff.left <= 0) this.buff = null;
    }

    if (this.stagger > 0) {
      this.stagger -= dt;
      if (this.stagger <= 0) this.stunned = false;
      this.x += Math.sin(this.stagger * 30) * 60 * dt;
      this.clampX();
      return;
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.x += this.dashDir * CFG.player.dashSpeed * dt;
      this.trail.push({ x: this.x, y: this.y, t: 0.22 });
      this.clampX();
      return;
    }

    this.readDoubleTap(input, world);
    if (this.dashTime > 0) return;

    const l = input.held(this.slot, 'L');
    const r = input.held(this.slot, 'R');
    const dir = (r ? 1 : 0) - (l ? 1 : 0);
    if (dir !== 0) {
      this.facing = dir;
      this.x += dir * this.speed * dt;
      this.clampX();
    }

    // M — 짧게 누르면 잡기/넣기, 0.4초 넘게 누르면 특수능력 (PRD 4.2)
    if (input.down(this.slot, 'M')) {
      this.holdT = 0;
      this.holdFired = false;
      this.action(world);
    }
    if (input.held(this.slot, 'M')) {
      this.holdT += dt;
      if (!this.holdFired && this.holdT >= CFG.player.longPressSeconds) {
        this.holdFired = true;
        this.tryAbility(world);
      }
    } else {
      this.holdT = 0;
      this.holdFired = false;
    }
  }

  clampX() {
    const pad = CFG.world.wallPad + this.r;
    this.x = clamp(this.x, pad, CFG.view.w - pad);
  }

  // 같은 방향 버튼을 빠르게 두 번 = 그 방향으로 돌진 (PRD 4.2 v3.1)
  // 예전에는 L+R 동시였는데, 동시 입력으로는 방향을 지정할 수 없어 조작이 안 됐다.
  readDoubleTap(input, world) {
    for (const btn of ['L', 'R']) {
      if (!input.down(this.slot, btn)) continue;
      const t = input.pressTime(this.slot, btn);
      const prev = this.lastTap[btn];
      this.lastTap[btn] = t;
      if (t - prev > CFG.player.doubleTapSeconds) continue;
      this.lastTap[btn] = -99;                 // 세 번째 탭이 또 발동하지 않게
      if (this.dashCd > 0) continue;
      this.startDash(btn === 'L' ? -1 : 1, world);
    }
  }

  startDash(dir, world) {
    this.dashTime = CFG.player.dashSeconds;
    this.dashDir = dir;
    this.facing = dir;
    this.dashCd = CFG.player.dashCooldown;
    this.trail.length = 0;
    SFX.dash();
    world.particles.emit({
      x: this.x - dir * this.r, y: this.y + this.r * 0.4,
      count: 8, color: withAlpha(this.char.color, 0.85), speed: 240,
      angle: dir > 0 ? Math.PI : 0, spread: 1.1, life: 0.3, size: 7, gravity: 300,
    });
  }

  // --- 행동 -----------------------------------------------------------------

  action(world) {
    if (this.grabCd > 0) return;
    if (world.ship.isUnder(this.x) && this.backpack.length > 0) { this.deposit(world); return; }
    this.tryGrab(world);
  }

  tryAbility(world) {
    if (this.abilityCd > 0) {
      world.popups.add(this.x, this.y - this.r * 2, S.popCool, { color: THEME.color.dim, size: 30, life: 0.5 });
      return;
    }
    const ok = useAbility(this, world);
    // 실패해도 절반은 먹는다 — 남발 방지
    this.abilityCd = abilityCooldown(this.char.id) * (ok ? 1 : 0.5);
  }

  // 쓰레기 하나를 배낭에 넣는다 (잡기·그물·채찍 공통)
  takeJunk(junk, world) {
    junk.alive = false;
    this.backpack.push({ type: junk.type, slots: junk.slots, value: junk.value });
    this.combo += 1;
    this.comboT = 1.3;
    this.happyT = 0.35;
    this.squashT = 1;
    world.particles.emit({
      x: junk.x, y: junk.y, count: 10, color: this.char.color,
      speed: 260, spread: Math.PI * 2, life: 0.4, size: 7, gravity: 500,
    });
  }

  tryGrab(world) {
    const g = this.grabSpec();
    const cx = this.x;
    const cy = this.y - g.offY;
    this.grabCd = g.cooldown;

    let best = null;
    let bestD = Infinity;
    for (const j of world.junks) {
      if (!j.alive) continue;
      const nx = (j.x - cx) / g.rx;
      const ny = (j.y - cy) / g.ry;
      if (nx * nx + ny * ny > 1) continue;
      const d = Math.hypot(j.x - cx, j.y - cy);
      if (d < bestD) { bestD = d; best = j; }
    }

    if (!best) {
      this.grabFx = { t: CFG.player.grabShowSeconds, hit: false, rx: g.rx, ry: g.ry, cy };
      SFX.whiff();
      return;
    }

    // 보급품은 배낭에 안 들어가고 즉시 버프 (PRD 4.4)
    if (best.type === 'supply') {
      this.grabFx = { t: CFG.player.grabShowSeconds, hit: true, rx: g.rx, ry: g.ry, cy };
      world.pickSupply(this, best);
      return;
    }

    // 대형 위성은 두 명 이상이 같이 잡아야 한다 (PRD 4.4)
    if (best.type === 'satellite') {
      this.grabFx = { t: CFG.player.grabShowSeconds, hit: true, rx: g.rx, ry: g.ry, cy };
      world.trySatellite(this, best);
      return;
    }

    if (this.usedSlots + best.slots > this.maxSlots) {
      this.grabFx = { t: CFG.player.grabShowSeconds, hit: false, rx: g.rx, ry: g.ry, cy };
      SFX.full();
      world.popups.add(this.x, this.y - this.r * 2, S.popFull, { color: THEME.color.danger, size: 34, life: 0.7 });
      return;
    }

    this.grabFx = { t: CFG.player.grabShowSeconds, hit: true, rx: g.rx, ry: g.ry, cy };
    this.takeJunk(best, world);
    SFX.grab(this.combo - 1);
  }

  deposit(world) {
    const count = this.backpack.length;
    const wasFull = this.isFull;
    const sumValue = this.backpack.reduce((a, it) => a + it.value, 0);

    const table = CFG.score.depositBonus;
    const base = table[Math.min(count, table.length - 1)] ?? count;
    const mult = base / count;
    const pts = Math.max(1, Math.round(sumValue * mult));

    this.score += pts;
    world.tons += sumValue * CFG.score.tonsPerValue;
    world.ship.pulse();

    world.particles.emitTo({
      x: this.x, y: this.y - this.r,
      tx: world.ship.x, ty: world.ship.y + CFG.ship.h * 0.4,
      count, color: THEME.color.warn, life: 0.55, size: 16,
    });
    world.popups.add(this.x, this.y - this.r * 1.6, `+${pts}`, {
      color: THEME.color.accent, size: 64, life: 1.0, pop: 2,
    });

    if (wasFull) {
      world.popups.add(this.x, this.y - this.r * 2.6, S.popBig, { color: THEME.color.warn, size: 54, life: 1.1 });
      SHAKE.add(14);
      SFX.jackpot();
    } else {
      if (count >= 3) world.popups.add(this.x, this.y - this.r * 2.6, S.popNice, { color: THEME.color.warn, size: 40, life: 0.8 });
      SFX.deposit(count);
    }

    this.backpack = [];
    this.happyT = 0.5;
    this.squashT = 1;
    this.grabCd = this.grabSpec().cooldown;
  }

  // 박치기에 맞음. stun=true 면 라이벌 충돌(더 길게 기절) (PRD 4.2, 4.6)
  hurt(world, stun = false) {
    if (this.stagger > 0) return false;
    this.stagger = stun ? CFG.player.stunSeconds : CFG.player.staggerSeconds;
    this.stunned = stun;
    this.combo = 0;

    const dropped = this.backpack.pop();
    if (dropped) world.dropJunk(dropped.type, this.x, this.y - this.r * 1.2);

    HITSTOP.add(CFG.fx.hitstopSeconds);
    SHAKE.add(stun ? 28 : 20);
    if (stun) SFX.stun(); else SFX.hit();
    world.particles.emit({
      x: this.x, y: this.y - this.r * 0.4, count: 14, color: '#FFFFFF',
      speed: 340, spread: Math.PI * 2, life: 0.35, size: 8, gravity: 700,
    });
    return true;
  }

  say(textStr) {
    this.sayText = textStr;
    this.sayT = 1.8;
  }

  // --- 렌더 -----------------------------------------------------------------

  // 머리 위 상태 표시 — 배낭 잔여 칸 + 특수능력 게이지.
  // 화면 아래 HUD 카드만으로는 캐릭터를 보는 동안 눈에 안 들어온다.
  renderStatus(ctx, t) {
    const max = this.maxSlots;
    const used = Math.min(max, this.usedSlots);
    const left = Math.max(0, max - used);

    const pipW = 15;
    const gap = 5;
    const barW = max * pipW + (max - 1) * gap;
    const sx = this.x - barW / 2;
    // 대원끼리 겹쳐도 위젯이 뭉치지 않게 슬롯마다 높이를 벌린다
    const pipY = this.y - this.r - 40 - this.slot * 48;
    const gaugeY = pipY - 20;

    ctx.save();

    // 바탕 — 누구 것인지 알 수 있게 캐릭터 색을 섞는다
    fillRound(ctx, sx - 22, gaugeY - 8, barW + 34, 58, 14, withAlpha('#08080A', 0.78));
    fillRound(ctx, sx - 22, gaugeY - 8, barW + 34, 58, 14, withAlpha(this.char.color, 0.16));
    circle(ctx, sx - 12, gaugeY + 21, 5, this.char.color);

    // --- 특수능력 게이지 ---
    const total = Math.max(0.001, abilityCooldown(this.char.id));
    const ready = this.abilityCd <= 0;
    const ratio = ready ? 1 : 1 - this.abilityCd / total;
    fillRound(ctx, sx, gaugeY, barW, 10, 5, withAlpha('#FFFFFF', 0.14));
    if (ready) {
      const glow = 0.75 + 0.25 * Math.abs(Math.sin(t * 6));
      fillRound(ctx, sx, gaugeY, barW, 10, 5, withAlpha(THEME.color.accent, glow));
      text(ctx, 'M', sx + barW + 14, gaugeY + 5, {
        size: 19, color: THEME.color.accent, weight: 800, alpha: glow,
      });
    } else {
      fillRound(ctx, sx, gaugeY, barW * ratio, 10, 5, withAlpha(THEME.color.accent, 0.45));
      text(ctx, `${this.abilityCd.toFixed(1)}`, sx + barW + 16, gaugeY + 5, {
        size: 17, color: THEME.color.dim, weight: 700,
      });
    }

    // --- 배낭 칸 ---
    for (let i = 0; i < max; i++) {
      const filled = i < used;
      fillRound(ctx, sx + i * (pipW + gap), pipY, pipW, 19, 5,
        filled ? THEME.color.warn : withAlpha('#FFFFFF', 0.2));
    }

    // 꽉 차면 붉게 깜빡이고, 아니면 남은 칸 수를 적는다
    if (this.isFull) {
      const blink = 0.45 + 0.55 * Math.abs(Math.sin(t * 9));
      strokeRound(ctx, sx - 4, pipY - 4, barW + 8, 27, 8, withAlpha(THEME.color.danger, blink), 3);
      text(ctx, S.packFull, sx + barW + 18, pipY + 10, {
        size: 18, color: THEME.color.danger, weight: 800, align: 'left', alpha: blink,
      });
    } else {
      text(ctx, S.packLeft(left), sx + barW + 18, pipY + 10, {
        size: 18, color: THEME.color.text, weight: 700, align: 'left',
      });
    }

    ctx.restore();
  }

  expression(world) {
    if (this.stunned) return 'stunned';
    if (this.stagger > 0) return 'hurt';
    if (this.happyT > 0) return 'happy';
    if (this.dashTime > 0) return 'surprised';
    if (world.earth.danger) return 'worried';
    return 'idle';
  }

  render(ctx, world, t, dt = 0) {
    // 돌진 잔상
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const s = this.trail[i];
      s.t -= dt;
      if (s.t <= 0) { this.trail.splice(i, 1); continue; }
      circle(ctx, s.x, s.y, this.r * 0.86, withAlpha(this.char.color, s.t * 0.5));
    }

    if (this.grabFx) {
      const a = this.grabFx.t / CFG.player.grabShowSeconds;
      drawGrabShape(ctx, this.x, this.grabFx.cy, this.grabFx.rx, this.grabFx.ry, a, this.char.color, this.grabFx.hit);
    }

    // 개구리 혀
    if (this.tongue) {
      const k = 1 - Math.abs(this.tongue.t / this.tongue.max - 0.5) * 2;
      ctx.save();
      ctx.strokeStyle = this.tongue.hit ? '#FF7A9C' : withAlpha('#FF7A9C', 0.6);
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.facing * this.tongue.len * k, this.y - 10);
      ctx.stroke();
      ctx.restore();
    }

    // 원숭이 꼬리
    if (this.whip) {
      const k = 1 - Math.abs(this.whip.t / this.whip.max - 0.5) * 2;
      ctx.save();
      ctx.strokeStyle = withAlpha(this.char.color, 0.95);
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.quadraticCurveTo(
        this.x + (this.whip.tx - this.x) * 0.3 + 70, this.y - (this.y - this.whip.ty) * 0.6,
        this.x + (this.whip.tx - this.x) * k, this.y - (this.y - this.whip.ty) * k,
      );
      ctx.stroke();
      ctx.restore();
    }

    const wobble = this.isFull ? Math.sin(t * 9 + this.slot) * 0.1 : 0;
    const squash = 1 + this.squashT * 0.22 * Math.sin(this.squashT * Math.PI);

    // 버프 링
    if (this.buff) {
      const col = this.buff.type === 'booster' ? THEME.color.warn : THEME.color.accent;
      ctx.save();
      ctx.strokeStyle = withAlpha(col, 0.45 + 0.35 * Math.sin(t * 10));
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * 1.35, this.r * 1.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawCharacter(ctx, {
      x: this.x, y: this.y, r: this.r, color: this.char.color, image: this.char.image,
      expression: this.expression(world), t, phase: this.slot * 1.3,
      squash: 1 / Math.max(0.6, squash),
      lookAt: world.lookTargetFor(this),
      backpack: { used: this.usedSlots, max: this.maxSlots },
      tilt: wobble,
    });

    fillRound(ctx, this.x - 58, this.y + this.r + 12, 116, 38, 19, withAlpha(this.char.color, 0.16));
    text(ctx, this.char.name, this.x, this.y + this.r + 31, { size: 24, color: this.char.color, weight: 700 });

    this.renderStatus(ctx, t);

    if (this.combo >= 2 && this.comboT > 0) {
      text(ctx, `x${this.combo}`, this.x + this.r + 26, this.y - this.r, {
        size: 34, color: THEME.color.warn, weight: 800, alpha: Math.min(1, this.comboT),
      });
    }

    // 말풍선 (라이벌 충돌 등)
    if (this.sayT > 0 && this.sayText) {
      const a = Math.min(1, this.sayT);
      ctx.save();
      ctx.globalAlpha = a;
      const w = Math.max(220, this.sayText.length * 19 + 40);
      // 둘이 동시에 말할 때 겹치지 않게 슬롯마다 높이를 띄운다
      const sy = this.y - this.r * 3.1 - 130 - this.slot * 70;
      fillRound(ctx, this.x - w / 2, sy, w, 56, 16, withAlpha('#0A0A0C', 0.92));
      text(ctx, this.sayText, this.x, sy + 28, {
        size: 26, color: this.char.color, weight: 700,
      });
      ctx.restore();
    }
  }
}
