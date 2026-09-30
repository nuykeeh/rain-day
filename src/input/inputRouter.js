// 슬롯 3개에 입력원을 배정하고 프레임 단위 엣지를 제공한다. (PRD 7.3)
//
// 길게 누르기·동시 누르기 판정은 여기서 하지 않는다 — player.js 가 한다.
// 입력원은 이벤트를 큐에 넣고, 라우터가 "업데이트 스텝마다" 비운다.
// 스텝이 돌지 않는 프레임에서는 큐를 비우지 않으므로 120Hz 화면에서도 입력이 유실되지 않는다.

import { CFG } from '../config.js';

export const BTNS = ['L', 'M', 'R'];
export const SLOT_COUNT = 3;

const blank = () => ({ press: 0, held: false, release: 0, t: 0, heldSince: 0 });

export class InputRouter {
  constructor() {
    this.slots = Array.from({ length: SLOT_COUNT }, () => ({ joined: false, owner: null, label: 'none' }));
    this.state = Array.from({ length: SLOT_COUNT }, () => ({ L: blank(), M: blank(), R: blank() }));
    this.queue = [];
    this.sources = [];
    this.lastInputWall = performance.now();
    this.gameTime = 0;
  }

  addSource(src) {
    src.attach(this);
    this.sources.push(src);
    return src;
  }

  enqueue(ev) { this.queue.push(ev); }

  claimSlot(sourceId, label, preferred = null) {
    const existing = this.slots.findIndex((s) => s.owner === sourceId);
    if (existing >= 0) return existing;
    if (preferred !== null) {
      const s = this.slots[preferred];
      if (!s || s.owner !== null) return -1;
      s.owner = sourceId;
      s.label = label;
      return preferred;
    }
    const idx = this.slots.findIndex((s) => s.owner === null);
    if (idx < 0) return -1;
    this.slots[idx].owner = sourceId;
    this.slots[idx].label = label;
    return idx;
  }

  releaseOwner(sourceId) {
    for (const s of this.slots) {
      if (s.owner === sourceId) { s.owner = null; s.label = 'none'; s.joined = false; }
    }
  }

  resetSession() {
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.slots[i] = { joined: false, owner: null, label: 'none' };
      this.state[i] = { L: blank(), M: blank(), R: blank() };
    }
    this.queue.length = 0;
    for (const s of this.sources) s.reset?.();
  }

  poll(nowMs, gameTime, speed = 1) {
    this.gameTime = gameTime;
    for (const st of this.state) {
      for (const b of BTNS) { st[b].press = 0; st[b].release = 0; }
    }
    for (const src of this.sources) src.poll?.(nowMs);

    const floor = gameTime - CFG.loop.step * 2;
    for (const ev of this.queue) {
      const st = this.state[ev.slot]?.[ev.btn];
      if (!st) continue;
      if (ev.type === 'down') {
        st.press += 1;
        st.held = true;
        st.t = Math.max(floor, gameTime + ((ev.t - nowMs) / 1000) * speed);
        st.heldSince = st.t;
        this.lastInputWall = Math.max(this.lastInputWall, ev.t);
      } else {
        st.held = false;
        st.release += 1;
      }
    }
    this.queue.length = 0;
  }

  down(slot, btn) { return (this.state[slot]?.[btn]?.press ?? 0) > 0; }
  pressCount(slot, btn) { return this.state[slot]?.[btn]?.press ?? 0; }
  held(slot, btn) { return this.state[slot]?.[btn]?.held ?? false; }
  up(slot, btn) { return (this.state[slot]?.[btn]?.release ?? 0) > 0; }
  pressTime(slot, btn) { return this.state[slot]?.[btn]?.t ?? 0; }
  heldSince(slot, btn) { return this.state[slot]?.[btn]?.heldSince ?? 0; }

  anyDown(slot = null) {
    if (slot !== null) return BTNS.some((b) => this.down(slot, b));
    for (let i = 0; i < SLOT_COUNT; i++) if (BTNS.some((b) => this.down(i, b))) return true;
    return false;
  }

  pressedSlots() {
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) if (this.anyDown(i)) out.push(i);
    return out;
  }

  joinedSlots() {
    const out = [];
    for (let i = 0; i < SLOT_COUNT; i++) if (this.slots[i].joined) out.push(i);
    return out;
  }

  idleSeconds(nowMs) { return (nowMs - this.lastInputWall) / 1000; }
}
