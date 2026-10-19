// 참가 화면. (PRD 6)
//
// 아무 버튼 = 참가.  참가한 뒤에는
//   M     = 출발 준비. 참가자 전원이 누르면 카운트다운을 기다리지 않고 바로 시작한다.
//   L · R = 조작법 보기/닫기. 열려 있는 동안 카운트다운은 멈춘다.
// 카운트다운이 끝나면 브리핑 없이 바로 본 게임으로 간다.

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { ST } from '../core/states.js';
import { CHARACTERS } from '../data/characters.js';
import { SLOT_COUNT } from '../input/inputRouter.js';
import { text, drawCharacter, withAlpha, fillRound, strokeRound } from '../ui/draw.js';
import { renderHowTo } from '../ui/howTo.js';
import { SFX } from '../fx/sfx.js';

export class JoinScene {
  constructor(gm) {
    this.gm = gm;
    this.t = 0;
    this.left = CFG.flow.joinCountdown;
    this.lastBeep = -1;
    this.pop = [0, 0, 0];
    this.ready = [false, false, false];
    this.howTo = false;
    this.howToT = 0;
  }

  update(dt, input) {
    this.t += dt;
    this.howToT += dt;
    // 조작법을 보는 동안은 멈춘다. 새 참가자가 와도 리셋하지 않는다 (PRD 6)
    if (!this.howTo) this.left -= dt;

    for (let s = 0; s < SLOT_COUNT; s++) {
      if (!input.anyDown(s)) continue;
      if (!input.slots[s].joined) {
        input.slots[s].joined = true;
        this.pop[s] = 1;
        SFX.resume();
        SFX.join();
        continue;
      }
      if (input.down(s, 'L') || input.down(s, 'R')) {
        this.howTo = !this.howTo;
        this.howToT = 0;
        SFX.ui();
      } else if (input.down(s, 'M')) {
        this.howTo = false;
        if (!this.ready[s]) {
          this.ready[s] = true;
          this.pop[s] = 1;
          SFX.join();
        }
      }
    }
    for (let i = 0; i < SLOT_COUNT; i++) this.pop[i] = Math.max(0, this.pop[i] - dt * 3);

    const sec = Math.ceil(Math.max(0, this.left));
    if (!this.howTo && sec !== this.lastBeep && sec <= 3 && sec > 0) { this.lastBeep = sec; SFX.count(0); }

    const joined = input.joinedSlots();
    const allReady = joined.length > 0 && joined.every((s) => this.ready[s]);
    if (allReady || this.left <= 0) {
      if (joined.length === 0) { this.gm.setState(ST.ATTRACT); return; }
      this.gm.newSession(joined);
      this.gm.setState(ST.PLAY);
    }
  }

  render(ctx) {
    const W = CFG.view.w;
    text(ctx, S.joinTitle, W / 2, 110, { size: 64, color: THEME.color.accent, weight: 800 });

    const cw = W / 3;
    CHARACTERS.forEach((ch, i) => {
      const cx = cw * i + cw / 2;
      const joined = this.gm.input.slots[i].joined;
      const ready = this.ready[i];
      const x = cw * i + 50;
      const w = cw - 100;
      fillRound(ctx, x, 200, w, 620, 26, joined ? withAlpha(ch.color, ready ? 0.22 : 0.12) : withAlpha('#FFFFFF', 0.03));
      strokeRound(ctx, x, 200, w, 620, 26, joined ? ch.color : withAlpha('#FFFFFF', 0.12), joined ? (ready ? 7 : 4) : 2);
      text(ctx, `${i + 1}P`, cx, 252, { size: 32, color: joined ? ch.color : THEME.color.dim, weight: 800 });

      drawCharacter(ctx, {
        x: cx, y: 460, r: 118 * (1 + this.pop[i] * 0.1), color: ch.color, image: ch.image,
        expression: joined ? 'happy' : 'idle', t: this.t, phase: i * 1.1, dim: !joined,
        backpack: { used: 0, max: 5 },
      });

      if (joined) {
        text(ctx, ch.name, cx, 630, { size: 46, color: THEME.color.textStrong, weight: 800 });
        if (ready) {
          text(ctx, S.joinReady, cx, 700, { size: 36, color: ch.color, weight: 800 });
        } else {
          const blink = 0.5 + 0.5 * Math.abs(Math.sin(this.t * 3));
          text(ctx, S.joinPressGo(ch.keys[1]), cx, 700, { size: 32, color: ch.color, weight: 700, alpha: blink });
        }
        text(ctx, S.joinPressHowTo(ch.keys[0], ch.keys[2]), cx, 765, { size: 24, color: THEME.color.text, weight: 600 });
      } else {
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 3));
        text(ctx, S.joinHint, cx, 650, { size: 36, color: THEME.color.text, weight: 700, alpha: blink });
        text(ctx, ch.keys.join('  '), cx, 712, { size: 34, color: THEME.color.dim, weight: 700 });
      }
    });

    const sec = Math.ceil(Math.max(0, this.left));
    text(ctx, String(sec), W / 2, 900, {
      size: 96, color: sec <= 3 ? THEME.color.warn : THEME.color.textStrong, weight: 800,
    });
    text(ctx, S.joinFooter, W / 2, 1000, { size: 26, color: THEME.color.dim });

    if (this.howTo) renderHowTo(ctx, this.howToT, this.gm.input.joinedSlots());
  }
}
