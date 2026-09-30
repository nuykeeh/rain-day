// 참가 화면. (PRD 6)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { ST } from '../core/states.js';
import { CHARACTERS } from '../data/characters.js';
import { SLOT_COUNT } from '../input/inputRouter.js';
import { text, drawCharacter, withAlpha, fillRound, strokeRound } from '../ui/draw.js';
import { SFX } from '../fx/sfx.js';

export class JoinScene {
  constructor(gm) {
    this.gm = gm;
    this.t = 0;
    this.left = CFG.flow.joinCountdown;
    this.lastBeep = -1;
    this.pop = [0, 0, 0];
  }

  update(dt, input) {
    this.t += dt;
    this.left -= dt;   // 새 참가자가 와도 리셋하지 않는다 (PRD 6)

    for (const s of input.pressedSlots()) {
      if (!input.slots[s].joined) {
        input.slots[s].joined = true;
        this.pop[s] = 1;
        SFX.resume();
        SFX.join();
      }
    }
    for (let i = 0; i < SLOT_COUNT; i++) this.pop[i] = Math.max(0, this.pop[i] - dt * 3);

    const sec = Math.ceil(Math.max(0, this.left));
    if (sec !== this.lastBeep && sec <= 3 && sec > 0) { this.lastBeep = sec; SFX.count(0); }

    const joined = input.joinedSlots();
    if (joined.length >= SLOT_COUNT || this.left <= 0) {
      if (joined.length === 0) { this.gm.setState(ST.ATTRACT); return; }
      this.gm.newSession(joined);
      this.gm.setState(ST.BRIEFING);
    }
  }

  render(ctx) {
    text(ctx, S.joinTitle, CFG.view.w / 2, 110, { size: 64, color: THEME.color.accent, weight: 800 });

    const cw = CFG.view.w / 3;
    CHARACTERS.forEach((ch, i) => {
      const cx = cw * i + cw / 2;
      const joined = this.gm.input.slots[i].joined;
      const x = cw * i + 50;
      const w = cw - 100;
      fillRound(ctx, x, 200, w, 620, 26, joined ? withAlpha(ch.color, 0.12) : withAlpha('#FFFFFF', 0.03));
      strokeRound(ctx, x, 200, w, 620, 26, joined ? ch.color : withAlpha('#FFFFFF', 0.12), joined ? 4 : 2);
      text(ctx, `${i + 1}P`, cx, 252, { size: 32, color: joined ? ch.color : THEME.color.dim, weight: 800 });

      drawCharacter(ctx, {
        x: cx, y: 470, r: 118 * (1 + this.pop[i] * 0.1), color: ch.color, image: ch.image,
        expression: joined ? 'happy' : 'idle', t: this.t, phase: i * 1.1, dim: !joined,
        backpack: { used: 0, max: 5 },
      });

      if (joined) {
        text(ctx, ch.name, cx, 650, { size: 46, color: THEME.color.textStrong, weight: 800 });
        text(ctx, S.joinReady, cx, 712, { size: 32, color: ch.color, weight: 700 });
      } else {
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 3));
        text(ctx, S.joinHint, cx, 650, { size: 36, color: THEME.color.text, weight: 700, alpha: blink });
        text(ctx, ch.keys.join('  '), cx, 712, { size: 34, color: THEME.color.dim, weight: 700 });
      }
    });

    const sec = Math.ceil(Math.max(0, this.left));
    text(ctx, String(sec), CFG.view.w / 2, 900, {
      size: 96, color: sec <= 3 ? THEME.color.warn : THEME.color.textStrong, weight: 800,
    });
    text(ctx, S.joinSolo, CFG.view.w / 2, 1000, { size: 26, color: THEME.color.dim });
  }
}
