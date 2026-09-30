// U.S. 수거선. 위쪽을 천천히 왕복한다 → 대원들이 그 밑으로 몰려 충돌이 생긴다. (PRD 4.1)

import { CFG } from '../config.js';
import { THEME } from '../data/theme.js';
import { fillRound, strokeRound, text, withAlpha, circle, getImage } from '../ui/draw.js';

export class Ship {
  constructor() {
    this.x = CFG.view.w / 2;
    this.dir = 1;
    this.glow = 0;
  }

  get left() { return CFG.ship.rangePad; }
  get right() { return CFG.view.w - CFG.ship.rangePad; }
  get w() { return CFG.ship.w; }
  get y() { return CFG.world.shipY; }

  update(dt) {
    this.x += this.dir * CFG.ship.speed * dt;
    if (this.x < this.left) { this.x = this.left; this.dir = 1; }
    if (this.x > this.right) { this.x = this.right; this.dir = -1; }
    this.glow = Math.max(0, this.glow - dt * 2.2);
  }

  isUnder(px) {
    return Math.abs(px - this.x) <= this.w / 2 + CFG.ship.catchPad;
  }

  pulse() { this.glow = 1; }

  render(ctx, t) {
    const w = this.w;
    const h = CFG.ship.h;
    const x = this.x - w / 2;
    const y = this.y - h / 2;

    // 흡입구 빛
    ctx.save();
    const g = ctx.createLinearGradient(0, this.y, 0, CFG.world.orbitY);
    g.addColorStop(0, withAlpha(THEME.color.accent, 0.16 + this.glow * 0.3));
    g.addColorStop(1, withAlpha(THEME.color.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(this.x - w * 0.34, this.y + h * 0.4);
    ctx.lineTo(this.x + w * 0.34, this.y + h * 0.4);
    ctx.lineTo(this.x + w * 0.62, CFG.world.orbitY);
    ctx.lineTo(this.x - w * 0.62, CFG.world.orbitY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const img = getImage(THEME.shipImage);
    if (img && img.ok) {
      ctx.drawImage(img.img, x, y, w, h);
      return;
    }

    fillRound(ctx, x, y, w, h, 26, THEME.color.ship);
    fillRound(ctx, x + w * 0.1, y + h * 0.16, w * 0.8, h * 0.4, 16, withAlpha('#0E0E12', 0.55));
    strokeRound(ctx, x, y, w, h, 26, withAlpha('#000000', 0.4), 3);
    // 입구
    fillRound(ctx, this.x - w * 0.2, y + h * 0.74, w * 0.4, h * 0.3, 10,
      withAlpha(THEME.color.accent, 0.55 + this.glow * 0.45));
    // 점멸등
    const blink = (Math.sin(t * 4) + 1) / 2;
    circle(ctx, x + 26, y + h * 0.35, 8, withAlpha(THEME.color.warn, 0.4 + blink * 0.6));
    circle(ctx, x + w - 26, y + h * 0.35, 8, withAlpha(THEME.color.warn, 0.4 + (1 - blink) * 0.6));
    text(ctx, 'U.S.', this.x, y + h * 0.36, { size: 30, color: '#141418', weight: 800 });
  }
}
