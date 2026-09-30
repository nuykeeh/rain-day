// 화면 흔들림. (PRD 5)

import { CFG } from '../config.js';

class Shake {
  constructor() { this.amount = 0; }
  add(a) { this.amount = Math.min(CFG.fx.maxShake, this.amount + a); }
  update(dt) {
    this.amount = Math.max(0, this.amount - this.amount * CFG.fx.shakeDecay * dt - dt * 6);
  }
  offset() {
    if (this.amount <= 0.01) return [0, 0];
    return [(Math.random() * 2 - 1) * this.amount, (Math.random() * 2 - 1) * this.amount];
  }
  clear() { this.amount = 0; }
}

export const SHAKE = new Shake();
