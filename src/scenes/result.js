// 결과 화면. (M1은 순위·수거량까지. 결과 대사는 M2) (PRD 6)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { ST } from '../core/states.js';
import { charOf } from '../data/characters.js';
import { text, drawCharacter, fillRound, withAlpha, progressBar, ease } from '../ui/draw.js';

export class ResultScene {
  constructor(gm) {
    this.gm = gm;
    this.t = 0;
    this.r = gm.session.result;
    this.maxScore = Math.max(1, ...Object.values(this.r.scores));
    // 1등 대사 — 지구를 지켰는지에 따라 다르다 (PRD 6.5)
    const winner = charOf(this.r.order[0]);
    this.line = this.r.win ? winner.lines.win : winner.lines.winLost;
    this.lineColor = winner.color;
  }

  update(dt, input) {
    this.t += dt;
    if (this.t > 0.7 && input.anyDown()) { this.gm.forceAttract(); return; }
    if (this.t >= CFG.flow.resultSeconds) this.gm.forceAttract();
  }

  render(ctx) {
    const W = CFG.view.w;
    const r = this.r;
    const win = r.win;

    const k = ease.outBack(Math.min(1, this.t / 0.5));
    ctx.save();
    ctx.translate(W / 2, 130);
    ctx.scale(k, k);
    text(ctx, win ? S.resultWin : S.resultLose, 0, 0, {
      size: 84, color: win ? THEME.color.accent : THEME.color.danger, weight: 800,
    });
    ctx.restore();
    if (!win) text(ctx, S.resultLoseSub, W / 2, 196, { size: 30, color: THEME.color.dim, weight: 600 });

    // 1등 대사
    if (this.t > 0.6) {
      const a = Math.min(1, (this.t - 0.6) * 3);
      ctx.save();
      ctx.globalAlpha = a;
      fillRound(ctx, W / 2 - 620, 218, 1240, 78, 20, withAlpha(this.lineColor, 0.12));
      text(ctx, `"${this.line}"`, W / 2, 257, { size: 34, color: THEME.color.textStrong, weight: 600 });
      ctx.restore();
    }

    const order = r.order;
    order.forEach((slot, i) => {
      const ch = charOf(slot);
      const y = 326 + i * 176;
      const appear = ease.outCubic(Math.max(0, Math.min(1, (this.t - 0.2 - i * 0.18) / 0.35)));
      ctx.save();
      ctx.globalAlpha = appear;
      ctx.translate((1 - appear) * -70, 0);

      fillRound(ctx, 360, y, 1200, 160, 26, withAlpha(ch.color, 0.1));
      drawCharacter(ctx, {
        x: 450, y: y + 80, r: 56, color: ch.color, image: ch.image,
        expression: i === 0 ? 'happy' : (win ? 'idle' : 'lose'),
        t: this.t, phase: slot, backpack: { used: 0, max: 5 },
      });
      text(ctx, S.resultRank(i + 1), 570, y + 56, { size: 40, color: THEME.color.warn, weight: 800, align: 'left' });
      text(ctx, ch.name, 570, y + 112, { size: 34, color: THEME.color.textStrong, weight: 700, align: 'left' });

      progressBar(ctx, 800, y + 66, 520, 28, (r.scores[slot] ?? 0) / this.maxScore, ch.color);
      text(ctx, S.resultPoint(r.scores[slot] ?? 0), 1390, y + 80, {
        size: 42, color: THEME.color.textStrong, weight: 800, align: 'left',
      });
      ctx.restore();
    });

    text(ctx, S.resultTons(r.tons, this.gm.totalTons), W / 2, 960, {
      size: 34, color: THEME.color.warn, weight: 700,
    });
    text(ctx, S.resultHint, W / 2, 1020, {
      size: 26, color: THEME.color.dim, alpha: 0.4 + 0.6 * Math.abs(Math.sin(this.t * 3)),
    });
  }
}
