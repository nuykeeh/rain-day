// 작전 브리핑 — 조작 그림 한 장. 글보다 아이콘. (PRD 6)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { ST } from '../core/states.js';
import { text, buttonGlyph, withAlpha, fillRound, ease, circle } from '../ui/draw.js';
import { charOf } from '../data/characters.js';

export class BriefingScene {
  constructor(gm) { this.gm = gm; this.t = 0; }

  update(dt) {
    this.t += dt;
    if (this.t >= CFG.flow.briefingSeconds) this.gm.setState(ST.PLAY);
  }

  render(ctx) {
    const W = CFG.view.w;
    const k = ease.outBack(Math.min(1, this.t / 0.45));
    ctx.save();
    ctx.translate(W / 2, 150);
    ctx.scale(k, k);
    text(ctx, S.briefTitle, 0, 0, { size: 62, color: THEME.color.accent, weight: 800 });
    ctx.restore();

    const y = 380;
    const cols = [
      { x: W * 0.16, glyphs: ['L', 'R'], label: S.briefMove },
      { x: W * 0.40, glyphs: ['M'], label: S.briefGrab },
      { x: W * 0.64, glyphs: ['L', 'L'], label: S.briefDash, twice: true },
      { x: W * 0.87, glyphs: ['M'], label: S.briefHold, hold: true },
    ];

    for (const c of cols) {
      fillRound(ctx, c.x - 180, y - 140, 360, 300, 26, withAlpha(THEME.color.card, 0.7));
      const n = c.glyphs.length;
      c.glyphs.forEach((g, i) => {
        const gx = c.x + (i - (n - 1) / 2) * 118;
        buttonGlyph(ctx, gx, y - 40, g, 92, THEME.color.accent);
      });
      if (c.twice) {
        // 두 번 빠르게 — 두 번째 버튼이 깜빡인다
        const blink = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 6));
        ctx.save();
        ctx.globalAlpha = blink;
        buttonGlyph(ctx, c.x + 59, y - 40, 'L', 92, THEME.color.warn);
        ctx.restore();
        text(ctx, 'x2', c.x, y + 34, { size: 30, color: THEME.color.warn, weight: 800 });
      }
      if (c.hold) {
        // 길게 누르기 표시
        const k = (this.t * 1.2) % 1;
        for (let i = 0; i < 3; i++) {
          circle(ctx, c.x - 22 + i * 22, y + 34, 7,
            withAlpha(THEME.color.warn, k > i / 3 ? 0.95 : 0.25));
        }
      }
      text(ctx, c.label, c.x, y + 86, {
        size: 26, color: THEME.color.textStrong, weight: 700, maxWidth: 330,
      });
    }

    // 참가한 대원의 특수능력 안내
    const slots = this.gm.session?.slots ?? [];
    slots.forEach((slot, i) => {
      const ch = charOf(slot);
      const cw = 420;
      const total = slots.length * cw;
      const x = W / 2 - total / 2 + cw * i + cw / 2;
      fillRound(ctx, x - cw / 2 + 12, 610, cw - 24, 78, 20, withAlpha(ch.color, 0.14));
      text(ctx, S.abilityOf[ch.id] ?? ch.name, x, 649, { size: 30, color: ch.color, weight: 700 });
    });

    fillRound(ctx, W / 2 - 560, 730, 1120, 92, 22, withAlpha(THEME.color.accent, 0.1));
    text(ctx, S.briefGoal, W / 2, 776, { size: 40, color: THEME.color.textStrong, weight: 700 });

    const left = Math.ceil(CFG.flow.briefingSeconds - this.t);
    text(ctx, String(Math.max(0, left)), W / 2, 900, { size: 44, color: THEME.color.dim, weight: 800 });
  }
}
