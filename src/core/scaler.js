// 논리 1920x1080 을 창에 맞춰 비율 유지 확대 + 레터박스. devicePixelRatio 반영. (PRD 7.1)

import { CFG } from '../config.js';
import { THEME } from '../data/theme.js';

export class Scaler {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.scale = 1;
    this.offX = 0;
    this.offY = 0;
    this.resize();
  }

  resize() {
    const cssW = this.canvas.clientWidth || window.innerWidth;
    const cssH = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    const s = Math.min(cssW / CFG.view.w, cssH / CFG.view.h);
    this.scale = s * dpr;
    this.offX = Math.round(((cssW - CFG.view.w * s) / 2) * dpr);
    this.offY = Math.round(((cssH - CFG.view.h * s) / 2) * dpr);
  }

  begin(shakeX = 0, shakeY = 0) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = THEME.color.letterbox;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.offX + shakeX * this.scale, this.offY + shakeY * this.scale);
    ctx.scale(this.scale, this.scale);
    ctx.beginPath();
    ctx.rect(0, 0, CFG.view.w, CFG.view.h);
    ctx.clip();
    ctx.fillStyle = THEME.color.bg;
    ctx.fillRect(0, 0, CFG.view.w, CFG.view.h);
    return ctx;
  }

  end() { this.ctx.restore(); }
}
