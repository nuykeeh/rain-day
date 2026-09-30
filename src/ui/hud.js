// 상단 HUD — 지구 게이지, 남은 시간, 대원별 점수·배낭. (PRD 4.1)

import { CFG } from '../config.js';
import { S } from '../strings.js';
import { THEME } from '../data/theme.js';
import { text, fillRound, strokeRound, withAlpha, circle, mix, progressBar } from './draw.js';

export function renderHud(ctx, world, t) {
  const W = CFG.view.w;

  // --- 지구 게이지 ---
  const gw = 700;
  const gx = W / 2 - gw / 2;
  const gy = 30;
  const ratio = world.earth.ratio;
  const danger = world.earth.danger;
  const blink = danger ? 0.55 + 0.45 * Math.abs(Math.sin(t * 8)) : 1;

  ctx.save();
  if (world.earth.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
  }
  fillRound(ctx, gx - 16, gy - 12, gw + 32, 62, 20, withAlpha('#000000', 0.45));
  text(ctx, S.hudEarth, gx - 4, gy + 19, { size: 26, color: THEME.color.dim, align: 'left', weight: 700 });
  progressBar(ctx, gx + 62, gy + 4, gw - 76, 30, ratio,
    withAlpha(mix(THEME.color.danger, THEME.color.accent, ratio), blink));
  text(ctx, `${Math.ceil(world.earth.hp)}`, gx + gw + 2, gy + 19, {
    size: 28, color: danger ? THEME.color.danger : THEME.color.textStrong, align: 'right', weight: 800, alpha: blink,
  });
  ctx.restore();

  if (danger && world.phase === 'play') {
    text(ctx, S.hudWarn, W / 2, 862, {
      size: 32, color: THEME.color.danger, weight: 800, alpha: blink,
    });
  }

  // --- 남은 시간 ---
  const left = world.timeLeft;
  const mm = Math.floor(left / 60);
  const ss = Math.ceil(left - mm * 60);
  const timeStr = `${mm}:${String(Math.min(59, ss)).padStart(2, '0')}`;
  fillRound(ctx, W - 214, gy - 12, 190, 62, 20, withAlpha('#000000', 0.45));
  text(ctx, S.hudTime, W - 196, gy + 8, { size: 18, color: THEME.color.dim, align: 'left', weight: 600 });
  text(ctx, timeStr, W - 196, gy + 34, {
    size: 34, color: left <= 10 ? THEME.color.warn : THEME.color.textStrong, align: 'left', weight: 800,
  });

  // --- 대원 카드 (수거선이 다니는 위쪽을 피해 화면 아래에 둔다) ---
  const cw = 250;
  const gap = 18;
  const total = world.players.length * cw + (world.players.length - 1) * gap;
  const startX = W / 2 - total / 2;
  world.players.forEach((p, i) => {
    const x = startX + i * (cw + gap);
    const y = 986;
    fillRound(ctx, x, y, cw, 62, 20, withAlpha('#08080A', 0.72));
    fillRound(ctx, x, y, cw, 62, 20, withAlpha(p.char.color, 0.18));
    strokeRound(ctx, x, y, cw, 62, 20, withAlpha(p.char.color, 0.45), 2);
    text(ctx, p.char.name, x + 16, y + 21, { size: 22, color: p.char.color, align: 'left', weight: 700 });
    text(ctx, `${p.score}`, x + cw - 16, y + 31, {
      size: 36, color: THEME.color.textStrong, align: 'right', weight: 800,
    });

    // 배낭 칸 + 남은 칸 수
    const slots = p.maxSlots;
    const used = Math.min(slots, p.usedSlots);
    for (let k = 0; k < slots; k++) {
      const bx = x + 18 + k * 20;
      const by = y + 45;
      circle(ctx, bx, by, 7, k < used ? THEME.color.warn : withAlpha('#FFFFFF', 0.16));
    }
    const leftSlots = Math.max(0, slots - used);
    text(ctx, p.isFull ? S.packFull : S.packLeft(leftSlots), x + 26 + slots * 20, y + 45, {
      size: 17, color: p.isFull ? THEME.color.danger : THEME.color.dim, align: 'left', weight: 700,
    });

    // 특수능력 쿨다운
    const ax = x + cw - 44;
    const ay = y + 45;
    const ready = p.abilityCd <= 0;
    circle(ctx, ax, ay, 12, ready ? withAlpha(THEME.color.accent, 0.9) : withAlpha('#FFFFFF', 0.12));
    if (!ready) {
      const total = Math.max(0.001, (CFG.ability[p.char.id] ?? CFG.ability.rabbit).cooldown);
      ctx.save();
      ctx.strokeStyle = THEME.color.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ax, ay, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.abilityCd / total));
      ctx.stroke();
      ctx.restore();
    } else {
      text(ctx, 'M', ax, ay, { size: 14, color: '#101014', weight: 800 });
    }

    // 버프 표시
    if (p.buff) {
      const bcol = p.buff.type === 'booster' ? THEME.color.warn : THEME.color.accent;
      text(ctx, p.buff.type === 'booster' ? S.popBooster : S.popMagnet, x + cw - 96, ay, {
        size: 18, color: bcol, weight: 700, align: 'right',
      });
    }
  });
}
