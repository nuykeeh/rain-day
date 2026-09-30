// 고정 타임스텝 루프. 히트스톱·배속·테스트용 일시정지를 여기서 처리한다. (PRD 7.1)

import { CFG } from '../config.js';

export class Loop {
  /**
   * @param update (step, nowMs) 고정 간격 업데이트
   * @param render (dtReal, nowMs) 매 프레임 렌더
   * @param frozen () => boolean  true 면 업데이트를 건너뛴다 (히트스톱)
   * @param paused () => boolean  true 면 업데이트만 멈춘다 (스크린샷용)
   */
  constructor({ update, render, frozen = () => false, paused = () => false, speed = 1 }) {
    this.update = update;
    this.render = render;
    this.frozen = frozen;
    this.paused = paused;
    this.speed = speed;
    this.acc = 0;
    this.last = 0;
    this.gameTime = 0;
    this.running = false;
  }

  start() {
    this.running = true;
    this.last = performance.now();
    const frame = (now) => {
      if (!this.running) return;
      requestAnimationFrame(frame);
      const dtReal = Math.min((now - this.last) / 1000, CFG.loop.maxFrameSeconds);
      this.last = now;

      if (!this.paused() && !this.frozen()) {
        this.acc += dtReal * this.speed;
        const step = CFG.loop.step;
        let steps = 0;
        while (this.acc >= step && steps < 8) {
          this.update(step, now, this.gameTime);
          this.gameTime += step;
          this.acc -= step;
          steps += 1;
          if (this.paused()) break;
        }
        if (steps >= 8) this.acc = 0; // 너무 밀리면 따라잡기 포기
      }
      this.render(dtReal, now);
    };
    requestAnimationFrame(frame);
  }

  stop() { this.running = false; }
}
