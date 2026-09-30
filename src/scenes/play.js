// 본 게임. (PRD 4)

import { CFG } from '../config.js';
import { ST } from '../core/states.js';
import { World } from '../game/world.js';
import { renderHud } from '../ui/hud.js';

export class PlayScene {
  constructor(gm) {
    this.gm = gm;
    this.t = 0;
    this.world = new World({ slots: gm.session.slots, seed: gm.session.seed });
  }

  update(dt, input) {
    this.t += dt;
    this.world.update(dt, input);
    if (this.world.done) {
      this.gm.finishRound(this.world.result());
      this.gm.setState(ST.RESULT);
    }
  }

  render(ctx) {
    this.world.render(ctx, this.t);
    renderHud(ctx, this.world, this.t);
  }
}
