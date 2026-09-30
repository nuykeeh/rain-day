// 지구. 쓰레기가 닿으면 게이지가 깎이고, 0이면 전원 패배. (PRD 4.7)

import { CFG } from '../config.js';
import { THEME } from '../data/theme.js';
import { withAlpha, mix } from '../ui/draw.js';

export class Earth {
  constructor() {
    this.max = CFG.earth.max;
    this.hp = CFG.earth.max;
    this.flash = 0;
    this.shakeT = 0;
  }

  get ratio() { return Math.max(0, this.hp / this.max); }
  get danger() { return this.ratio * 100 <= CFG.earth.warnThreshold; }
  get dead() { return this.hp <= 0; }

  damage(n) {
    this.hp = Math.max(0, this.hp - n);
    this.flash = Math.min(1, this.flash + 0.55);
    this.shakeT = 0.4;
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 2.4);
    this.shakeT = Math.max(0, this.shakeT - dt);
  }

  render(ctx, t) {
    const topY = CFG.world.earthTopY;
    const w = CFG.view.w;
    const h = CFG.view.h;
    // 지구는 아주 큰 원의 윗부분
    const R = w * 1.15;
    const cx = w / 2;
    const cy = topY + R;

    ctx.save();
    // 대기광
    const glow = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.06);
    const healthy = mix(THEME.color.danger, THEME.color.accent, this.ratio);
    glow.addColorStop(0, withAlpha(healthy, 0.0));
    glow.addColorStop(0.5, withAlpha(healthy, 0.35 + this.flash * 0.4));
    glow.addColorStop(1, withAlpha(healthy, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
    ctx.fill();

    // 본체
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = mix('#1C2A46', THEME.color.earth, 0.55 + this.ratio * 0.45);
    ctx.fillRect(0, topY - 20, w, h - topY + 40);

    // 대륙 (단순 도형)
    ctx.fillStyle = withAlpha(mix('#3A4A3A', THEME.color.earthLand, this.ratio), 0.9);
    const lands = [
      [w * 0.18, topY + 90, 220, 70],
      [w * 0.46, topY + 60, 300, 58],
      [w * 0.78, topY + 110, 190, 62],
      [w * 0.32, topY + 170, 150, 44],
    ];
    for (const [lx, ly, lw, lh] of lands) {
      ctx.beginPath();
      ctx.ellipse(lx, ly, lw / 2, lh / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 피격 붉은 번쩍임 (PRD 5)
    if (this.flash > 0.001) {
      ctx.fillStyle = withAlpha(THEME.color.danger, this.flash * 0.5);
      ctx.fillRect(0, topY - 20, w, h - topY + 40);
    }
    ctx.restore();

    // 표면선
    ctx.save();
    ctx.strokeStyle = withAlpha(healthy, 0.55);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
    ctx.restore();
  }
}
