// 히트스톱 — 박치기가 맞았을 때 화면을 아주 잠깐 멈춘다. (PRD 5)

class Hitstop {
  constructor() { this.left = 0; }
  add(seconds) { this.left = Math.max(this.left, seconds); }
  // 실시간(dtReal)으로 줄인다. 게임 시간이 멈춰 있기 때문.
  tick(dtReal) { if (this.left > 0) this.left = Math.max(0, this.left - dtReal); }
  get frozen() { return this.left > 0; }
  clear() { this.left = 0; }
}

export const HITSTOP = new Hitstop();
