// 대기 화면 (M1은 최소 구성 — 프롤로그 순환·데모 플레이는 M3). (PRD 6)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { ST } from '../core/states.js';
import { CHARACTERS } from '../data/characters.js';
import { Store } from '../core/storage.js';
import { text, drawCharacter, withAlpha, circle, fillRound } from '../ui/draw.js';
import { SFX } from '../fx/sfx.js';
import { makeRng } from '../core/rng.js';

export class AttractScene {
  constructor(gm) {
    this.gm = gm;
    this.t = 0;
    const rng = makeRng(4242);
    this.meteors = Array.from({ length: 12 }, () => ({
      x: rng.range(0, CFG.view.w), y: rng.range(-CFG.view.h, CFG.view.h),
      v: rng.range(200, 480), r: rng.range(4, 11),
    }));
    this.rec = Store.all();
  }

  enter() { this.gm.endSession(); this.rec = Store.all(); }

  update(dt, input) {
    this.t += dt;
    for (const m of this.meteors) {
      m.y += m.v * dt;
      m.x -= m.v * 0.22 * dt;
      if (m.y > CFG.view.h + 40) { m.y = -60; m.x = Math.random() * CFG.view.w * 1.3; }
    }
    const pressed = input.pressedSlots();
    if (pressed.length > 0) {
      SFX.resume();   // 자동재생 정책 — 첫 입력에서 오디오를 깨운다
      SFX.join();
      for (const s of pressed) input.slots[s].joined = true;
      this.gm.setState(ST.JOIN);
    }
  }

  render(ctx) {
    for (const m of this.meteors) {
      ctx.save();
      ctx.strokeStyle = withAlpha(THEME.color.warn, 0.3);
      ctx.lineWidth = m.r * 0.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + m.r * 2.2, m.y - m.r * 7);
      ctx.stroke();
      circle(ctx, m.x, m.y, m.r, withAlpha(THEME.color.warn, 0.8));
      ctx.restore();
    }

    text(ctx, S.title, CFG.view.w / 2, 230, { size: 132, color: THEME.color.accent, weight: 800 });
    text(ctx, S.subtitle, CFG.view.w / 2, 312, { size: 32, color: THEME.color.dim, weight: 600 });

    fillRound(ctx, CFG.view.w / 2 - 620, 380, 1240, 96, 22, withAlpha(THEME.color.card, 0.8));
    text(ctx, S.prologue[2], CFG.view.w / 2, 428, { size: 40, color: THEME.color.textStrong, weight: 600 });

    CHARACTERS.forEach((ch, i) => {
      drawCharacter(ctx, {
        x: CFG.view.w / 2 + (i - 1) * 280, y: 670, r: 92,
        color: ch.color, image: ch.image, expression: 'idle',
        t: this.t, phase: i * 1.7, backpack: { used: 0, max: 5 },
      });
      text(ctx, ch.name, CFG.view.w / 2 + (i - 1) * 280, 800, { size: 30, color: ch.color, weight: 700 });
    });

    const blink = 0.5 + 0.5 * Math.sin(this.t * 4);
    text(ctx, S.pressAnyToJoin, CFG.view.w / 2, 930, {
      size: 50, color: THEME.color.textStrong, weight: 800, alpha: blink,
    });
    text(ctx, S.totalTons(this.rec.totalTons), CFG.view.w / 2, 1000, { size: 28, color: THEME.color.dim });
    text(ctx, S.earthRecord(this.rec.earthSaved, this.rec.earthLost), CFG.view.w / 2, 1042, {
      size: 24, color: THEME.color.dim,
    });
  }
}
