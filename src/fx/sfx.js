// Web Audio 합성 효과음. 파일이 없어도 소리가 난다. (PRD 5, 7.1)
// 브라우저 자동재생 정책 때문에 첫 사용자 입력에서 resume() 해야 한다.

import { CFG } from '../config.js';

class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.comboStep = 0;
    this.lastWarn = 0;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = CFG.audio.masterGain;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
    return this.ctx;
  }

  resume() {
    const c = this.ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  tone({ freq = 440, dur = 0.12, type = 'square', gain = 0.5, slideTo = null, delay = 0 }) {
    if (this.muted) return;
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.2, gain = 0.4, delay = 0, lowpass = 1200 }) {
    if (this.muted) return;
    const c = this.ensure();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start(t0);
  }

  // --- 이름 붙은 소리 ---
  ui() { this.tone({ freq: 660, dur: 0.06, gain: 0.22, type: 'triangle' }); }
  join() { this.tone({ freq: 520, dur: 0.1, gain: 0.4 }); this.tone({ freq: 780, dur: 0.12, gain: 0.3, delay: 0.07 }); }
  count(i) { this.tone({ freq: 440 + i * 70, dur: 0.1, gain: 0.35 }); }
  go() { this.tone({ freq: 880, dur: 0.24, gain: 0.5, slideTo: 1320 }); }

  // 연속으로 잡으면 음이 조금씩 올라간다 (PRD 5)
  grab(combo = 0) {
    const step = Math.min(combo, 8);
    this.tone({ freq: 520 + step * 55, dur: 0.07, gain: 0.3, type: 'triangle', slideTo: 760 + step * 70 });
    this.noise({ dur: 0.06, gain: 0.12, lowpass: 2600 });
  }
  whiff() { this.noise({ dur: 0.12, gain: 0.16, lowpass: 3200 }); }
  full() { this.tone({ freq: 220, dur: 0.1, gain: 0.25, type: 'sawtooth' }); }

  deposit(count) {
    const n = Math.max(1, count);
    for (let i = 0; i < n; i++) {
      this.tone({ freq: 620 + i * 110, dur: 0.09, gain: 0.28, type: 'triangle', delay: i * 0.055 });
    }
  }
  jackpot() {
    [660, 880, 1100, 1320].forEach((f, i) => this.tone({ freq: f, dur: 0.16, gain: 0.34, delay: i * 0.07 }));
  }

  // 특수능력 (PRD 4.5)
  net() {
    this.tone({ freq: 300, dur: 0.16, gain: 0.28, type: 'triangle', slideTo: 520 });
    this.noise({ dur: 0.14, gain: 0.14, lowpass: 2200, delay: 0.05 });
  }
  steal() {
    this.tone({ freq: 900, dur: 0.1, gain: 0.3, type: 'sawtooth', slideTo: 380 });
    this.tone({ freq: 520, dur: 0.1, gain: 0.26, type: 'triangle', slideTo: 880, delay: 0.09 });
  }
  whip() {
    this.noise({ dur: 0.1, gain: 0.26, lowpass: 3800 });
    this.tone({ freq: 1200, dur: 0.1, gain: 0.24, type: 'triangle', slideTo: 600 });
  }
  buff(kind) {
    const base = kind === 'booster' ? 520 : 660;
    [0, 1, 2].forEach((i) => this.tone({ freq: base + i * 180, dur: 0.12, gain: 0.3, type: 'triangle', delay: i * 0.06 }));
  }
  stun() {
    this.tone({ freq: 240, dur: 0.5, gain: 0.3, type: 'sine', slideTo: 160 });
    this.noise({ dur: 0.3, gain: 0.3, lowpass: 700 });
  }
  together() {
    [700, 900, 1200].forEach((f, i) => this.tone({ freq: f, dur: 0.16, gain: 0.32, delay: i * 0.06 }));
  }

  hit() {
    this.noise({ dur: 0.18, gain: 0.5, lowpass: 900 });
    this.tone({ freq: 180, dur: 0.16, gain: 0.35, type: 'sawtooth', slideTo: 70 });
  }
  dash() { this.noise({ dur: 0.1, gain: 0.2, lowpass: 1800 }); }

  earthHit(big) {
    this.noise({ dur: big ? 0.45 : 0.3, gain: big ? 0.55 : 0.4, lowpass: 600 });
    this.tone({ freq: big ? 130 : 170, dur: 0.3, gain: 0.3, type: 'sawtooth', slideTo: 50 });
  }

  warn(now) {
    if (now - this.lastWarn < 0.9) return;
    this.lastWarn = now;
    this.tone({ freq: 900, dur: 0.08, gain: 0.2, type: 'square' });
    this.tone({ freq: 900, dur: 0.08, gain: 0.2, type: 'square', delay: 0.14 });
  }

  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone({ freq: f, dur: 0.2, gain: 0.34, delay: i * 0.11 })); }
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: 0.3, gain: 0.32, type: 'sawtooth', delay: i * 0.16 })); }
}

export const SFX = new Sfx();
