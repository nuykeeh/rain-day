// 떨어지는 우주 쓰레기. (PRD 4.4)

import { CFG } from '../config.js';
import { THEME } from '../data/theme.js';
import { withAlpha, circle, getImage } from '../ui/draw.js';

export function junkDef(type) {
  return CFG.junk[type] ?? CFG.junk.scrap;
}

export class Junk {
  static SPECIAL = new Set(['satellite', 'supply']);

  constructor(type, x, y, vy = null) {
    const d = junkDef(type);
    this.type = type;
    this.x = x;
    this.y = y;
    this.vy = vy ?? d.speed;
    this.r = d.r;
    this.rot = Math.random() * Math.PI;
    this.vr = (Math.random() - 0.5) * 4;
    this.alive = true;
    this.age = 0;
    this.grabbers = [];   // 대형 위성 동시잡기 기록 [{slot, t}]
  }

  get slots() { return junkDef(this.type).slots; }
  get value() { return junkDef(this.type).value; }
  get damage() { return junkDef(this.type).damage; }

  update(dt) {
    this.age += dt;
    // 떨어뜨린 쓰레기는 느리게 시작해 원래 속도까지 가속한다
    const target = junkDef(this.type).speed;
    if (this.vy < target) this.vy = Math.min(target, this.vy + 900 * dt);
    this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }

  render(ctx, t) {
    if (this.type === 'satellite') return this.renderSatellite(ctx, t);
    if (this.type === 'supply') return this.renderSupply(ctx, t);
    const kind = THEME.junkKinds[this.type];
    const img = getImage(kind?.image);
    if (img && img.ok) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.drawImage(img.img, -this.r, -this.r, this.r * 2, this.r * 2);
      ctx.restore();
      return;
    }

    if (this.type === 'meteor') {
      // 불꼬리
      ctx.save();
      const grad = ctx.createLinearGradient(this.x, this.y - this.r * 5.5, this.x, this.y);
      grad.addColorStop(0, withAlpha(THEME.color.warn, 0));
      grad.addColorStop(1, withAlpha('#FF7A3D', 0.75));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(this.x - this.r * 0.55, this.y);
      ctx.lineTo(this.x, this.y - this.r * (4.5 + Math.sin(t * 22) * 0.9));
      ctx.lineTo(this.x + this.r * 0.55, this.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      circle(ctx, this.x, this.y, this.r, '#FF7A3D');
      circle(ctx, this.x, this.y - this.r * 0.15, this.r * 0.62, '#FFD27A');
      circle(ctx, this.x, this.y - this.r * 0.22, this.r * 0.3, '#FFF6DF');
      return;
    }

    // 고철 — 각진 조각
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = kind?.color ?? '#B9BCC4';
    ctx.beginPath();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = this.r * (i % 2 === 0 ? 1 : 0.68);
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha('#000000', 0.35);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

// 대형 위성 — 두 명 이상이 같이 잡아야 한다 (PRD 4.4)
Junk.prototype.renderSatellite = function renderSatellite(ctx, t) {
  const r = this.r;
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate(Math.sin(t * 0.8) * 0.12);
  // 태양전지판
  ctx.fillStyle = '#4A6FA8';
  ctx.fillRect(-r * 2.1, -r * 0.34, r * 1.35, r * 0.68);
  ctx.fillRect(r * 0.75, -r * 0.34, r * 1.35, r * 0.68);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-r * 2.1, -r * 0.34, r * 1.35, r * 0.68);
  ctx.strokeRect(r * 0.75, -r * 0.34, r * 1.35, r * 0.68);
  // 본체
  ctx.fillStyle = '#C9CDD6';
  ctx.fillRect(-r * 0.75, -r * 0.62, r * 1.5, r * 1.24);
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.strokeRect(-r * 0.75, -r * 0.62, r * 1.5, r * 1.24);
  ctx.fillStyle = '#E8B04B';
  ctx.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.28);
  ctx.restore();
  // "둘이서" 표시
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(t * 6));
  ctx.strokeStyle = '#E8B04B';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};

// O.B.의 보급품 — 잡으면 버프 (PRD 4.4)
Junk.prototype.renderSupply = function renderSupply(ctx, t) {
  const r = this.r;
  ctx.save();
  ctx.translate(this.x, this.y);
  // 낙하산
  ctx.fillStyle = 'rgba(95,217,206,.55)';
  ctx.beginPath();
  ctx.arc(0, -r * 1.3, r * 1.1, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, -r * 1.3); ctx.lineTo(-r * 0.55, -r * 0.5);
  ctx.moveTo(r * 1.05, -r * 1.3); ctx.lineTo(r * 0.55, -r * 0.5);
  ctx.stroke();
  // 상자
  ctx.fillStyle = '#C08B4A';
  ctx.fillRect(-r * 0.6, -r * 0.5, r * 1.2, r * 1.1);
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 3;
  ctx.strokeRect(-r * 0.6, -r * 0.5, r * 1.2, r * 1.1);
  ctx.fillStyle = '#5FD9CE';
  ctx.fillRect(-r * 0.6, -r * 0.12, r * 1.2, r * 0.22);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(t * 5));
  ctx.fillStyle = '#5FD9CE';
  ctx.beginPath();
  ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};
