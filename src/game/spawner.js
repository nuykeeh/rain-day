// 쓰레기 생성. 간격은 시간이 갈수록 짧아진다. (PRD 4.4)
// 떨어질 자리는 warnSeconds 전에 화면 위쪽에 경고로 먼저 보인다.

import { CFG } from '../config.js';
import { THEME } from '../data/theme.js';
import { Junk } from './junk.js';
import { withAlpha, text } from '../ui/draw.js';

const WARN_Y = 250;

export class Spawner {
  constructor(rng, amountScale = 1) {
    this.rng = rng;
    this.scale = amountScale;
    this.timer = 0.6;
    this.pending = [];
  }

  progress(playTime) {
    const total = Math.max(1, CFG.flow.playSeconds);
    return Math.max(0, Math.min(1, playTime / total));
  }

  // 마지막 rushSeconds 는 R.A.I.N. 러시 — 간격이 더 줄어든다 (PRD 4.4)
  isRush(playTime) {
    return CFG.flow.playSeconds - playTime <= CFG.junk.rushSeconds;
  }

  interval(playTime) {
    const k = this.progress(playTime);
    const base = CFG.junk.intervalStart + (CFG.junk.intervalEnd - CFG.junk.intervalStart) * k;
    const rush = this.isRush(playTime) ? CFG.junk.rushIntervalMul : 1;
    return (base * rush) / Math.max(0.1, this.scale);
  }

  pickType(playTime, playerCount) {
    const roll = this.rng();
    // 대형 위성은 둘 이상일 때만 (혼자서는 잡을 수 없다)
    if (playerCount >= CFG.junk.satellite.minGrabbers && roll < CFG.junk.satellite.chance) return 'satellite';
    if (roll < CFG.junk.satellite.chance + CFG.junk.supply.chance) return 'supply';
    // 운석 비율은 시간이 갈수록 오른다 (PRD 4.4 v3.1)
    const k = this.progress(playTime);
    const mr = CFG.junk.meteorRatioStart + (CFG.junk.meteorRatioEnd - CFG.junk.meteorRatioStart) * k;
    return this.rng() < mr ? 'meteor' : 'scrap';
  }

  update(dt, world) {
    this.timer -= dt;
    if (this.timer <= 0) {
      const pad = CFG.world.wallPad + 70;
      this.pending.push({
        x: this.rng.range(pad, CFG.view.w - pad),
        type: this.pickType(world.time, world.players.length),
        at: world.time + CFG.junk.warnSeconds,
      });
      this.timer += this.interval(world.time);
      if (this.timer <= 0) this.timer = 0.1;
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (world.time >= p.at) {
        world.junks.push(new Junk(p.type, p.x, -50));
        this.pending.splice(i, 1);
      }
    }
  }

  render(ctx, world) {
    for (const p of this.pending) {
      const left = Math.max(0.0001, p.at - world.time);
      const k = 1 - left / Math.max(0.0001, CFG.junk.warnSeconds);
      const blink = 0.35 + 0.65 * Math.abs(Math.sin(world.time * 26));
      const col = p.type === 'meteor' ? THEME.color.danger
        : p.type === 'satellite' ? '#8FA8D8'
          : p.type === 'supply' ? THEME.color.accent : THEME.color.warn;

      ctx.save();
      ctx.globalAlpha = blink;
      // 낙하 예고선
      ctx.strokeStyle = withAlpha(col, 0.18 + k * 0.2);
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 16]);
      ctx.beginPath();
      ctx.moveTo(p.x, WARN_Y + 30);
      ctx.lineTo(p.x, CFG.world.orbitY);
      ctx.stroke();
      ctx.setLineDash([]);
      // 경고 삼각형
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(p.x, WARN_Y - 22);
      ctx.lineTo(p.x + 22, WARN_Y + 16);
      ctx.lineTo(p.x - 22, WARN_Y + 16);
      ctx.closePath();
      ctx.fill();
      text(ctx, '!', p.x, WARN_Y + 4, { size: 26, color: '#141418', weight: 800 });
      ctx.restore();
    }
  }
}
