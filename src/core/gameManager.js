// 단일 상태머신. (PRD 6)

import { CFG } from '../config.js';
import { ST } from './states.js';
import { Store } from './storage.js';
import { randomSeed } from './rng.js';
import { SFX } from '../fx/sfx.js';
import { SHAKE } from '../fx/shake.js';
import { HITSTOP } from '../fx/hitstop.js';

import { AttractScene } from '../scenes/attract.js';
import { JoinScene } from '../scenes/join.js';
import { BriefingScene } from '../scenes/briefing.js';
import { PlayScene } from '../scenes/play.js';
import { ResultScene } from '../scenes/result.js';

const SCENES = {
  [ST.ATTRACT]: AttractScene,
  [ST.JOIN]: JoinScene,
  [ST.BRIEFING]: BriefingScene,
  [ST.PLAY]: PlayScene,
  [ST.RESULT]: ResultScene,
};

export { ST };

export class GameManager {
  constructor({ input, opts = {} }) {
    this.input = input;
    this.opts = opts;
    this.state = null;
    this.scene = null;
    this.stateTime = 0;
    this.session = null;
    this.totalTons = Store.all().totalTons;
    this.paused = false;
    this.pauseAt = opts.pauseAt ?? null;
    this._pauseTimer = null;
  }

  start() {
    this.setState(ST.ATTRACT);
  }

  setState(name) {
    try { this.scene?.exit?.(); } catch (e) { console.error(e); }
    this.state = name;
    this.stateTime = 0;
    SHAKE.clear();
    HITSTOP.clear();
    this.scene = new SCENES[name](this);
    this.scene.enter?.();

    window.__RAIN_STATE__ = name;
    (window.__RAIN_HISTORY__ ??= []).push(name);
    if (name === ST.RESULT) window.__RAIN_DONE__ = true;

    if (this.pauseAt && this.pauseAt.state === name) {
      this._pauseTimer = this.pauseAt.after ?? 0;
    }
  }

  newSession(slots) {
    this.session = {
      slots: [...slots],
      seed: this.opts.seed ?? randomSeed(),
      result: null,
    };
    window.__RAIN_SESSION__ = { slots: [...slots], seed: this.session.seed };
    window.__RAIN_DONE__ = false;
  }

  endSession() {
    this.input.resetSession();
    this.session = null;
  }

  finishRound(result) {
    this.session.result = result;
    this.totalTons = Store.addTons(result.tons);
    Store.addEarthResult(result.win);
  }

  forceAttract() {
    this.endSession();
    this.setState(ST.ATTRACT);
    SFX.ui();
  }

  update(dt, nowMs) {
    this.stateTime += dt;

    if (this._pauseTimer !== null) {
      this._pauseTimer -= dt;
      if (this._pauseTimer <= 0) {
        this._pauseTimer = null;
        this.paused = true;
        window.__RAIN_PAUSED__ = true;
        return;
      }
    }

    // 무입력 복귀 (PRD 6)
    if (this.state !== ST.ATTRACT && this.opts.idleReturn !== false) {
      const limit = this.opts.idleTimeout ?? CFG.flow.idleTimeoutSeconds;
      if (this.input.idleSeconds(nowMs) > limit) { this.forceAttract(); return; }
    }

    this.scene.update(dt, this.input, nowMs);
  }

  render(ctx) {
    this.scene.render(ctx);
  }
}
