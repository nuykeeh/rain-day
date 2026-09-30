// 한 판의 세계. 대원·쓰레기·수거선·지구를 모두 들고 있다. (PRD 4)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { charOf } from '../data/characters.js';
import { Player } from './player.js';
import { Ship } from './ship.js';
import { Earth } from './earth.js';
import { Junk } from './junk.js';
import { Spawner } from './spawner.js';
import { resolveDashHits } from './collision.js';
import { updateNets, renderNets } from './abilities.js';
import { Particles } from '../fx/particles.js';
import { Popups } from '../fx/popups.js';
import { SHAKE } from '../fx/shake.js';
import { SFX } from '../fx/sfx.js';
import { text, withAlpha, ease, circle, fillRound } from '../ui/draw.js';
import { makeRng } from '../core/rng.js';

export class World {
  constructor({ slots, seed }) {
    this.rng = makeRng(seed);
    this.slots = [...slots];
    this.time = 0;
    this.phase = 'ready';   // ready → play → over
    this.readyT = 0;
    this.overT = 0;
    this.done = false;
    this.win = false;
    this.tons = 0;
    this.lastCount = -1;

    const n = this.slots.length;
    const scale = n <= 1 ? CFG.amount.solo : n === 2 ? CFG.amount.duo : CFG.amount.trio;

    this.players = this.slots.map((slot, i) => {
      const spread = CFG.view.w / (n + 1);
      return new Player(slot, charOf(slot), spread * (i + 1));
    });
    this.ship = new Ship();
    this.earth = new Earth();
    this.spawner = new Spawner(this.rng, scale);
    this.junks = [];
    this.nets = [];
    this.particles = new Particles();
    this.popups = new Popups();
    this.stars = Array.from({ length: 70 }, () => ({
      x: this.rng.range(0, CFG.view.w),
      y: this.rng.range(0, CFG.world.orbitY),
      r: this.rng.range(1, 2.6),
      a: this.rng.range(0.15, 0.6),
    }));
  }

  cfgSlots() { return CFG.player.backpackSlots; }

  get timeLeft() { return Math.max(0, CFG.flow.playSeconds - this.time); }

  get isRush() { return this.phase === 'play' && this.timeLeft <= CFG.junk.rushSeconds; }

  say(player, line) { player.say(line); }

  // 라이벌 충돌 (PRD 4.6)
  onRivalCrash(a, b) {
    for (const p of [a, b]) {
      const line = S.rivalLines[p.char.id];
      if (line) p.say(line);
    }
    this.popups.add((a.x + b.x) / 2, Math.min(a.y, b.y) - 150, '!!', {
      color: THEME.color.warn, size: 64, life: 1.0,
    });
  }

  // O.B.의 보급품 — 잡으면 5초 버프 (PRD 4.4)
  pickSupply(player, junk) {
    junk.alive = false;
    const kind = this.rng() < 0.5 ? 'magnet' : 'booster';
    player.buff = { type: kind, left: CFG.buff.seconds };
    player.happyT = 0.6;
    SFX.buff(kind);
    this.popups.add(player.x, player.y - player.r * 2.2, kind === 'magnet' ? S.popMagnet : S.popBooster, {
      color: kind === 'magnet' ? THEME.color.accent : THEME.color.warn, size: 46, life: 1.1,
    });
    this.particles.emit({
      x: junk.x, y: junk.y, count: 18, color: THEME.color.accent,
      speed: 300, spread: Math.PI * 2, life: 0.6, size: 8, gravity: 200,
    });
  }

  // 대형 위성 — 0.3초 안에 두 명 이상이 잡아야 한다. 점수는 나눠 갖는다 (PRD 4.4)
  trySatellite(player, junk) {
    const C = CFG.junk.satellite;
    junk.grabbers = junk.grabbers.filter((g) => this.time - g.t <= C.grabWindow);
    if (!junk.grabbers.some((g) => g.slot === player.slot)) {
      junk.grabbers.push({ slot: player.slot, t: this.time });
    }

    const crew = junk.grabbers
      .map((g) => this.players.find((p) => p.slot === g.slot))
      .filter((p) => p && p.usedSlots + 1 <= p.maxSlots);

    if (crew.length < C.minGrabbers) {
      this.popups.add(junk.x, junk.y - 70, S.popNeedTwo, { color: THEME.color.warn, size: 36, life: 0.7 });
      SFX.whiff();
      return;
    }

    junk.alive = false;
    junk.grabbers = [];
    const share = Math.max(1, Math.round(junk.value / crew.length));
    for (const p of crew) {
      p.backpack.push({ type: 'satellite', slots: 1, value: share });
      p.happyT = 0.6;
      p.squashT = 1;
      p.combo += 1;
      p.comboT = 1.3;
    }
    SFX.together();
    SHAKE.add(12);
    this.popups.add(junk.x, junk.y - 80, S.popTogether, { color: THEME.color.accent, size: 56, life: 1.1, pop: 2 });
    this.particles.emit({
      x: junk.x, y: junk.y, count: 24, color: THEME.color.accent,
      speed: 380, spread: Math.PI * 2, life: 0.55, size: 9, gravity: 400,
    });
  }

  nearestJunkFor(p) {
    let best = null;
    let bestD = Infinity;
    for (const j of this.junks) {
      if (!j.alive) continue;
      const d = Math.hypot(j.x - p.x, (j.y - p.y) * 0.45);
      if (d < bestD) { bestD = d; best = j; }
    }
    return best;
  }

  // 캐릭터가 쳐다볼 곳 — 가까운 쓰레기 (PRD 5)
  lookTargetFor(p) {
    const j = this.nearestJunkFor(p);
    if (j) return { x: j.x, y: j.y };
    return { x: this.ship.x, y: this.ship.y };
  }

  dropJunk(type, x, y) {
    this.junks.push(new Junk(type, x, y, CFG.junk.dropSpeed));
  }

  // --- 업데이트 -------------------------------------------------------------

  update(dt, input) {
    this.particles.update(dt);
    this.popups.update(dt);
    this.ship.update(dt);
    this.earth.update(dt);

    if (this.phase === 'ready') {
      this.readyT += dt;
      const total = CFG.flow.startCountdown;
      const idx = Math.min(3, Math.floor((this.readyT / total) * 4));
      if (idx !== this.lastCount) {
        this.lastCount = idx;
        if (idx < 3) SFX.count(idx); else SFX.go();
      }
      if (this.readyT >= total) this.phase = 'play';
      return;
    }

    if (this.phase === 'over') {
      this.overT += dt;
      for (const j of this.junks) j.update(dt);
      if (this.overT >= CFG.flow.endFreezeSeconds) this.done = true;
      return;
    }

    this.time += dt;
    this.spawner.update(dt, this);

    for (const p of this.players) p.update(dt, input, this);
    resolveDashHits(this);
    updateNets(this, dt);

    for (let i = this.junks.length - 1; i >= 0; i--) {
      const j = this.junks[i];
      if (!j.alive) { this.junks.splice(i, 1); continue; }
      j.update(dt);
      if (j.y >= CFG.world.earthTopY) {
        if (j.damage > 0) this.hitEarth(j);
        this.junks.splice(i, 1);
      } else if (j.y > CFG.view.h + 120) {
        this.junks.splice(i, 1);
      }
    }

    if (this.earth.danger) SFX.warn(this.time);

    if (this.earth.dead) this.finish(false);
    else if (this.time >= CFG.flow.playSeconds) this.finish(true);
  }

  hitEarth(j) {
    const big = j.type === 'meteor';
    this.earth.damage(j.damage);
    SHAKE.add(big ? 26 : 14);
    SFX.earthHit(big);
    this.particles.emit({
      x: j.x, y: CFG.world.earthTopY, count: big ? 22 : 13,
      color: big ? '#FF9A4D' : '#C9CDD6',
      speed: big ? 480 : 320, spread: Math.PI * 0.9, angle: -Math.PI / 2,
      life: 0.6, size: big ? 11 : 8, gravity: 900, shape: 'square',
    });
    this.popups.add(j.x, CFG.world.earthTopY - 70, `-${j.damage}`, {
      color: THEME.color.danger, size: 46, life: 0.8,
    });
  }

  finish(win) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.overT = 0;
    this.win = win;
    SHAKE.add(win ? 10 : 34);
    if (win) SFX.win(); else SFX.lose();
  }

  result() {
    const scores = {};
    for (const p of this.players) scores[p.slot] = p.score;
    return {
      win: this.win,
      scores,
      tons: Math.round(this.tons * 10) / 10,
      order: [...this.players].sort((a, b) => b.score - a.score).map((p) => p.slot),
    };
  }

  // --- 렌더 -----------------------------------------------------------------

  render(ctx, t) {
    // 별
    for (const s of this.stars) {
      circle(ctx, s.x, s.y, s.r, withAlpha('#FFFFFF', s.a * (0.6 + 0.4 * Math.sin(t * 2 + s.x))));
    }

    this.earth.render(ctx, t);

    // 궤도선
    ctx.save();
    ctx.strokeStyle = withAlpha(THEME.color.accent, 0.35);
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 18]);
    ctx.beginPath();
    ctx.moveTo(CFG.world.wallPad, CFG.world.orbitY);
    ctx.lineTo(CFG.view.w - CFG.world.wallPad, CFG.world.orbitY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    this.ship.render(ctx, t);
    this.spawner.render(ctx, this);
    renderNets(ctx, this, t);

    for (const j of this.junks) j.render(ctx, t);
    for (const p of this.players) p.render(ctx, this, t, CFG.loop.step);

    if (this.isRush) this.renderRush(ctx, t);

    this.particles.render(ctx);

    for (const p of this.popups.list) {
      const k = 1 - p.life / p.maxLife;
      const scale = 1 + (1 - ease.outCubic(Math.min(1, k * 3))) * (p.pop - 1);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      text(ctx, p.text, 0, 0, { size: p.size, color: p.color, weight: 800 });
      ctx.restore();
    }

    if (this.phase === 'ready') this.renderReady(ctx);
    if (this.phase === 'over') this.renderOver(ctx);
  }

  // R.A.I.N. 러시 — 배경이 붉어지고 쏟아진다 (PRD 4.4)
  renderRush(ctx, t) {
    const pulse = 0.12 + 0.1 * Math.abs(Math.sin(t * 3));
    ctx.save();
    const g = ctx.createRadialGradient(
      CFG.view.w / 2, CFG.view.h / 2, CFG.view.h * 0.25,
      CFG.view.w / 2, CFG.view.h / 2, CFG.view.w * 0.72,
    );
    g.addColorStop(0, withAlpha(THEME.color.danger, 0));
    g.addColorStop(1, withAlpha(THEME.color.danger, pulse));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.view.w, CFG.view.h);
    ctx.restore();
    text(ctx, S.hudRush, CFG.view.w / 2, 250, {
      size: 44, color: THEME.color.danger, weight: 800,
      alpha: 0.5 + 0.5 * Math.abs(Math.sin(t * 5)),
    });
  }

  renderReady(ctx) {
    const total = CFG.flow.startCountdown;
    const idx = Math.min(3, Math.floor((this.readyT / total) * 4));
    const local = ((this.readyT / total) * 4) % 1;
    ctx.save();
    ctx.fillStyle = withAlpha('#000000', 0.35);
    ctx.fillRect(0, 0, CFG.view.w, CFG.view.h);
    ctx.translate(CFG.view.w / 2, CFG.view.h / 2 - 60);
    const k = 1 + (1 - ease.outCubic(local)) * 0.5;
    ctx.scale(k, k);
    text(ctx, S.ready[idx], 0, 0, {
      size: 210, weight: 800,
      color: idx === 3 ? THEME.color.accent : THEME.color.textStrong,
    });
    ctx.restore();
  }

  renderOver(ctx) {
    const a = Math.min(1, this.overT * 3);
    ctx.save();
    ctx.fillStyle = withAlpha(this.win ? '#000000' : '#FFFFFF', this.win ? 0.45 * a : 0.55 * Math.max(0, 1 - this.overT * 1.6));
    ctx.fillRect(0, 0, CFG.view.w, CFG.view.h);
    ctx.restore();

    const label = this.win ? S.resultWin : S.resultLose;
    const col = this.win ? THEME.color.accent : THEME.color.danger;
    const k = ease.outBack(Math.min(1, this.overT / 0.5));
    ctx.save();
    ctx.translate(CFG.view.w / 2, 440);
    ctx.scale(k, k);
    fillRound(ctx, -620, -70, 1240, 140, 30, withAlpha('#0A0A0C', 0.8));
    text(ctx, label, 0, 0, { size: 96, color: col, weight: 800 });
    ctx.restore();
  }
}
