// 키보드 입력원. 슬롯은 키 묶음으로 고정된다. (PRD 7.3)

import { KEYBOARD } from './bindings.js';

export class KeyboardSource {
  constructor(target = window) {
    this.target = target;
    this.router = null;
    this.id = 'keyboard';
    this.codeMap = new Map();
    KEYBOARD.forEach((group, slot) => {
      for (const btn of ['L', 'M', 'R']) this.codeMap.set(group[btn], { slot, btn });
    });
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
  }

  attach(router) {
    this.router = router;
    this.target.addEventListener('keydown', this.onDown, { passive: false });
    this.target.addEventListener('keyup', this.onUp, { passive: false });
  }

  onDown(e) {
    const hit = this.codeMap.get(e.code);
    if (!hit) return;
    e.preventDefault();
    if (e.repeat) return; // 눌러 두면 오는 반복 이벤트는 무시
    const slot = this.router.claimSlot(`${this.id}:${hit.slot}`, 'keyboard', hit.slot);
    if (slot < 0) return;
    this.router.enqueue({ slot, btn: hit.btn, type: 'down', t: e.timeStamp || performance.now() });
  }

  onUp(e) {
    const hit = this.codeMap.get(e.code);
    if (!hit) return;
    e.preventDefault();
    const slot = this.router.slots.findIndex((s) => s.owner === `${this.id}:${hit.slot}`);
    if (slot < 0) return;
    this.router.enqueue({ slot, btn: hit.btn, type: 'up', t: e.timeStamp || performance.now() });
  }
}
