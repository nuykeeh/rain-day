// 박치기 판정. 라이벌끼리 부딪히면 둘 다 기절한다. (PRD 4.2, 4.6)

import { CFG } from '../config.js';

export function resolveDashHits(world) {
  for (const a of world.players) {
    if (a.dashTime <= 0) continue;
    for (const b of world.players) {
      if (b === a) continue;
      if (Math.abs(a.x - b.x) > CFG.player.dashHitRange) continue;
      if (Math.sign(b.x - a.x) !== a.dashDir && Math.abs(b.x - a.x) > CFG.player.dashHitRange * 0.4) continue;

      const rival = a.char.rival === b.char.id && b.char.rival === a.char.id;
      const hit = b.hurt(world, rival);
      if (!hit) continue;

      a.dashTime = 0;
      b.x += a.dashDir * 26;
      b.clampX();

      if (rival) {
        // 개구리 ↔ 원숭이 — 둘 다 기절 + 전용 대사 (PRD 4.6)
        a.stagger = CFG.player.stunSeconds;
        a.stunned = true;
        world.onRivalCrash(a, b);
      }
    }
  }
}
