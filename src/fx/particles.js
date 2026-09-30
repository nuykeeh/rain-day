// 파티클. 잡기·폭발·수거 연출에 쓴다. (PRD 5)

export class Particles {
  constructor(max = 600) {
    this.list = [];
    this.max = max;
  }

  clear() { this.list.length = 0; }

  emit(opts) {
    const {
      x, y, count = 8, color = '#FFFFFF', speed = 240, spread = Math.PI * 2,
      angle = -Math.PI / 2, life = 0.5, size = 6, gravity = 900, shape = 'circle',
    } = opts;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) break;
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.7 + Math.random() * 0.6),
        maxLife: life,
        color, gravity, shape,
        size: size * (0.6 + Math.random() * 0.8),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
      });
    }
  }

  // 목표 지점으로 빨려 들어가는 파티클 (수거선에 던져 넣기)
  emitTo(opts) {
    const { x, y, tx, ty, count = 5, color = '#FFF', life = 0.5, size = 14 } = opts;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) break;
      this.list.push({
        x, y, tx, ty, homing: true,
        delay: i * 0.05,
        life: life, maxLife: life,
        color, size, shape: 'circle',
        sx: x, sy: y,
        arc: (Math.random() - 0.5) * 260,
      });
    }
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.homing) {
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.life -= dt;
        const k = 1 - Math.max(0, p.life) / p.maxLife;
        p.x = p.sx + (p.tx - p.sx) * k + Math.sin(k * Math.PI) * p.arc;
        p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * 120;
      } else {
        p.life -= dt;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }

  render(ctx) {
    for (const p of this.list) {
      if (p.delay > 0) continue;
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'square') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.homing ? 1 : a), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
