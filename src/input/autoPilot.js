// ?autotest=1 용 가짜 대원. 사람 없이 한 판을 끝까지 돌린다. (PRD 8.3)
// M3에서 ATTRACT 데모 플레이에도 그대로 재사용한다.

import { CFG } from '../config.js';
import { ST } from '../core/states.js';

export class AutoSource {
  constructor(slotCount = 3) {
    this.router = null;
    this.slotCount = slotCount;
    this.claimed = false;
    this.holding = new Map(); // `${slot}:${btn}` -> 남은 시간
  }

  attach(router) { this.router = router; }
  reset() { this.claimed = false; this.holding.clear(); }

  ensureSlots() {
    if (this.claimed) return;
    for (let i = 0; i < this.slotCount; i++) this.router.claimSlot(`auto:${i}`, 'auto', i);
    this.claimed = true;
  }

  key(slot, btn) { return `${slot}:${btn}`; }

  tap(slot, btn) {
    this.ensureSlots();
    if (this.router.slots[slot]?.owner !== `auto:${slot}`) return;
    const t = performance.now();
    this.router.enqueue({ slot, btn, type: 'down', t });
    this.router.enqueue({ slot, btn, type: 'up', t: t + 0.5 });
  }

  // 누른 상태를 유지한다 (이동용)
  hold(slot, btn, seconds = 0.1) {
    this.ensureSlots();
    if (this.router.slots[slot]?.owner !== `auto:${slot}`) return;
    const k = this.key(slot, btn);
    if (!this.holding.has(k)) {
      this.router.enqueue({ slot, btn, type: 'down', t: performance.now() });
    }
    this.holding.set(k, seconds);
  }

  // 매 스텝 호출 — 유지 시간이 끝난 버튼을 뗀다
  poll() {
    for (const [k, left] of [...this.holding]) {
      const next = left - CFG.loop.step;
      if (next <= 0) {
        const [slot, btn] = k.split(':');
        this.router.enqueue({ slot: Number(slot), btn, type: 'up', t: performance.now() });
        this.holding.delete(k);
      } else {
        this.holding.set(k, next);
      }
    }
  }
}

export class AutoPilot {
  constructor(auto, players = 3) {
    this.auto = auto;
    this.players = Math.max(1, Math.min(3, players));
    this.state = null;
    this.t = 0;
    this.flags = {};
    this.cool = {};
  }

  drive(gm, dt) {
    if (gm.state !== this.state) { this.state = gm.state; this.t = 0; this.flags = {}; }
    this.t += dt;

    if (gm.state === ST.ATTRACT) {
      if (this.t > 0.4 && !this.flags.p0) { this.flags.p0 = true; this.auto.tap(0, 'M'); }
      return;
    }
    if (gm.state === ST.JOIN) {
      for (let i = 1; i < this.players; i++) {
        const k = `p${i}`;
        if (this.t > 0.3 + i * 0.25 && !this.flags[k]) { this.flags[k] = true; this.auto.tap(i, 'M'); }
      }
      return;
    }
    if (gm.state === ST.PLAY) this.drivePlay(gm.scene?.world, dt);
  }

  drivePlay(world, dt) {
    if (!world || world.phase !== 'play') return;

    for (const p of world.players) {
      if (p.stagger > 0 || p.dashTime > 0) continue;
      const slot = p.slot;
      this.cool[slot] = (this.cool[slot] ?? 0) - dt;

      // 배낭이 차면 수거선으로
      const full = p.usedSlots >= Math.max(1, world.cfgSlots() - 1);
      let targetX;
      let wantGrab = false;

      if (full) {
        targetX = world.ship.x;
        if (Math.abs(p.x - world.ship.x) < world.ship.w / 2) wantGrab = true;
      } else {
        const j = world.nearestJunkFor(p);
        if (j) {
          targetX = j.x;
          const dx = Math.abs(p.x - j.x);
          const dy = p.y - j.y;
          wantGrab = dx < 90 && dy > 0 && dy < 320;
        } else {
          targetX = world.ship.x;
        }
      }

      const diff = targetX - p.x;
      if (Math.abs(diff) > 18) this.auto.hold(slot, diff < 0 ? 'L' : 'R', 0.08);

      if (wantGrab && this.cool[slot] <= 0) {
        this.auto.tap(slot, 'M');
        this.cool[slot] = 0.18;
      }

      // 더블탭 박치기 — 두 번의 탭이 서로 다른 스텝에 들어가야 한다 (PRD 4.2 v3.1)
      this.dash ??= {};
      if (this.dash[slot] > 0) {
        this.dash[slot] -= dt;
        if (this.dash[slot] <= 0) this.auto.tap(slot, this.dashBtn[slot]);
      } else if (!full && Math.random() < 0.004) {
        const other = world.players.find((q) => q !== p);
        const btn = other && other.x < p.x ? 'L' : 'R';
        this.dashBtn ??= {};
        this.dashBtn[slot] = btn;
        this.auto.tap(slot, btn);
        this.dash[slot] = 0.08;
      }

      // 가끔 특수능력 (M 길게)
      if (Math.random() < 0.006) this.auto.hold(slot, 'M', 0.55);
    }
  }
}
