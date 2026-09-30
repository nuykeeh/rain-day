// 떠오르는 점수·텍스트. (PRD 5)

export class Popups {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }

  add(x, y, text, { color = '#FFFFFF', size = 44, life = 0.9, pop = 1.6, vy = -120 } = {}) {
    this.list.push({ x, y, text, color, size, life, maxLife: life, pop, vy });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.y += p.vy * dt;
      p.vy *= 0.92;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }
}
