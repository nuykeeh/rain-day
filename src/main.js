// 부팅 — 캔버스, 입력, 루프, 튜닝 패널. (PRD 7)

import { CFG, loadTuning } from './config.js';
import { Scaler } from './core/scaler.js';
import { Loop } from './core/loop.js';
import { GameManager } from './core/gameManager.js';
import { InputRouter } from './input/inputRouter.js';
import { KeyboardSource } from './input/keyboard.js';
import { AutoSource, AutoPilot } from './input/autoPilot.js';
import { TunePanel } from './ui/tunePanel.js';
import { SHAKE } from './fx/shake.js';
import { HITSTOP } from './fx/hitstop.js';
import { SFX } from './fx/sfx.js';
import { ST } from './core/states.js';

function readOpts() {
  const q = new URLSearchParams(location.search);
  const num = (k, d) => (q.has(k) ? Number(q.get(k)) || d : d);
  return {
    autotest: q.get('autotest') === '1',
    tune: q.get('tune') === '1',
    speed: Math.max(0.25, Math.min(8, num('speed', 1))),
    seed: q.has('seed') ? num('seed', 1) >>> 0 : null,
    players: num('players', 3),
    idleTimeout: q.has('idle') ? num('idle', 30) : null,
    pauseAt: window.__RAIN_PAUSE_AT__ ?? null,
  };
}

function boot() {
  loadTuning();   // 저장된 튜닝값 먼저 적용 (PRD 8.2)

  const opts = readOpts();
  const root = document.getElementById('rain-game');
  const canvas = document.getElementById('rain-canvas');

  const scaler = new Scaler(canvas);
  const input = new InputRouter();
  input.addSource(new KeyboardSource(window));

  const gm = new GameManager({ input, opts });

  let autopilot = null;
  if (opts.autotest) {
    const auto = input.addSource(new AutoSource());
    autopilot = new AutoPilot(auto, opts.players);
  }

  const tune = new TunePanel(root);
  if (opts.tune) tune.show();

  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') { e.preventDefault(); tune.toggle(); }
    else if (e.code === 'F2') { e.preventDefault(); gm.forceAttract(); }
  });
  window.addEventListener('resize', () => scaler.resize());

  // 커서는 움직이면 보이고, 2.5초 가만히 두면 숨는다
  let cursorTimer = 0;
  const showCursor = () => {
    root.classList.remove('cursor-idle');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => root.classList.add('cursor-idle'), 2500);
  };
  window.addEventListener('mousemove', showCursor);
  window.addEventListener('mousedown', showCursor);

  // 루프 안에서 예외가 나면 기록하고 대기화면으로. 멈춘 화면으로 두지 않는다. (PRD 8.1)
  let errors = 0;
  const guard = (fn) => {
    try { fn(); } catch (err) {
      errors += 1;
      window.__RAIN_ERRORS__ = errors;
      console.error('[RAIN] 루프 예외:', err);
      if (errors < 20) { try { gm.forceAttract(); } catch { /* 여기서 또 터지면 포기 */ } }
    }
  };

  gm.start();

  const loop = new Loop({
    speed: opts.speed,
    frozen: () => HITSTOP.frozen,
    paused: () => {
      if (gm.paused && window.__RAIN_PAUSED__ === false) gm.paused = false;
      return gm.paused;
    },
    update: (step, nowMs, gameTime) => {
      guard(() => {
        autopilot?.drive(gm, step);
        input.poll(nowMs, gameTime, opts.speed);
        gm.update(step, nowMs);
        SHAKE.update(step);
      });
    },
    render: (dtReal) => {
      HITSTOP.tick(dtReal);
      const [sx, sy] = SHAKE.offset();
      const ctx = scaler.begin(sx, sy);
      guard(() => gm.render(ctx));
      scaler.end();
    },
  });

  window.__RAIN__ = { gm, input, scaler, opts, CFG, ST, SFX, tune };
  window.__RAIN_ERRORS__ = 0;
  loop.start();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
