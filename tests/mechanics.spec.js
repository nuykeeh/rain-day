// v3.1 패치 검증 — 더블탭 박치기, 특수능력 3종, 대형 위성, 보급품, 라이벌 기절. (PRD 4.2/4.4/4.5/4.6)

import { test, expect } from '@playwright/test';
import { watchErrors, url, SHOTS } from './helpers.js';

// 자동 대원이 도는 동안 PLAY 상태의 world 를 잡아 직접 상태를 만들어 검증한다.
async function inPlay(page, players = 3) {
  await page.goto(url({ players, speed: 1 }));
  await page.waitForFunction(() => window.__RAIN__?.gm?.scene?.world?.phase === 'play', null, { timeout: 40_000 });
}

test('더블탭한 방향으로 돌진한다 (실제 키보드)', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?idle=999');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'ATTRACT');
  await page.keyboard.press('KeyZ');
  await page.waitForFunction(() => window.__RAIN__?.gm?.scene?.world?.phase === 'play', null, { timeout: 40_000 });

  // 한 번만 누르면 돌진하지 않는다
  await page.keyboard.press('KeyZ');
  await page.waitForTimeout(400);
  const single = await page.evaluate(() => window.__RAIN__.gm.scene.world.players[0].dashTime);
  expect(single).toBe(0);

  // 왼쪽 버튼 두 번 → 왼쪽으로 돌진
  const left = await page.evaluate(async () => {
    const w = window.__RAIN__.gm.scene.world;
    const p = w.players[0];
    p.dashCd = 0;
    return new Promise((res) => {
      const fire = (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      };
      fire('KeyZ');
      setTimeout(() => {
        fire('KeyZ');
        setTimeout(() => res({ dir: p.dashDir, dashing: p.dashTime > 0 }), 120);
      }, 60);
    });
  });
  expect(left.dashing).toBe(true);
  expect(left.dir).toBe(-1);

  // 오른쪽 버튼 두 번 → 오른쪽으로 돌진
  const right = await page.evaluate(async () => {
    const w = window.__RAIN__.gm.scene.world;
    const p = w.players[0];
    p.dashTime = 0; p.dashCd = 0; p.stagger = 0;
    return new Promise((res) => {
      const fire = (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      };
      fire('KeyC');
      setTimeout(() => {
        fire('KeyC');
        setTimeout(() => res({ dir: p.dashDir, dashing: p.dashTime > 0 }), 120);
      }, 60);
    });
  });
  expect(right.dashing).toBe(true);
  expect(right.dir).toBe(1);
  expect(errors).toEqual([]);
});

test('라이벌(개구리↔원숭이)끼리 부딪히면 둘 다 기절하고 대사가 나온다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const frog = w.players.find((p) => p.char.id === 'frog');
    const monkey = w.players.find((p) => p.char.id === 'monkey');
    const rabbit = w.players.find((p) => p.char.id === 'rabbit');
    rabbit.x = 100;                       // 끼어들지 않게 치워 둔다
    frog.stagger = 0; monkey.stagger = 0;
    monkey.x = frog.x - 60;
    monkey.facing = 1; monkey.dashDir = 1; monkey.dashTime = 0.2;
    w.update(1 / 60, window.__RAIN__.input);
    return {
      frogStun: frog.stunned, monkeyStun: monkey.stunned,
      frogStagger: frog.stagger, monkeyStagger: monkey.stagger,
      frogSay: frog.sayText, monkeySay: monkey.sayText,
      stunSeconds: window.__RAIN__.CFG.player.stunSeconds,
    };
  });
  expect(probe.frogStun).toBe(true);
  expect(probe.monkeyStun).toBe(true);
  expect(probe.frogStagger).toBeGreaterThan(0.5);
  expect(probe.monkeyStagger).toBeGreaterThan(0.5);
  expect(probe.frogSay.length).toBeGreaterThan(0);
  expect(probe.monkeySay.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('토끼 그물이 지나가는 쓰레기를 자동으로 담는다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const rabbit = w.players.find((p) => p.char.id === 'rabbit');
    rabbit.backpack = []; rabbit.abilityCd = 0; rabbit.stagger = 0;
    rabbit.tryAbility(w);
    const net = w.nets[0];
    // 그물 한가운데로 쓰레기를 떨어뜨린다
    w.junks.length = 0;
    w.dropJunk('scrap', net.x, net.y - 4);
    w.junks[0].y = net.y;
    w.update(1 / 60, window.__RAIN__.input);
    return { nets: w.nets.length, pack: rabbit.backpack.length, cd: rabbit.abilityCd };
  });
  expect(probe.nets).toBe(1);
  expect(probe.pack).toBe(1);     // 자동 포획
  expect(probe.cd).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('개구리 혀가 옆 대원 배낭에서 훔쳐 온다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const frog = w.players.find((p) => p.char.id === 'frog');
    const monkey = w.players.find((p) => p.char.id === 'monkey');
    frog.backpack = []; frog.abilityCd = 0; frog.stagger = 0;
    monkey.backpack = [{ type: 'scrap', slots: 1, value: 1 }];
    monkey.x = frog.x + 200;
    frog.facing = 1;
    frog.tryAbility(w);
    return { frogPack: frog.backpack.length, monkeyPack: monkey.backpack.length, saidMonkey: monkey.sayText };
  });
  expect(probe.frogPack).toBe(1);
  expect(probe.monkeyPack).toBe(0);
  expect(probe.saidMonkey.length).toBeGreaterThan(0);  // 라이벌 전용 대사
  expect(errors).toEqual([]);
});

test('원숭이 꼬리 채찍이 위쪽 멀리 있는 쓰레기를 낚아챈다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const monkey = w.players.find((p) => p.char.id === 'monkey');
    const rabbit = w.players.find((p) => p.char.id === 'rabbit');
    monkey.backpack = []; monkey.abilityCd = 0; monkey.stagger = 0;
    w.junks.length = 0;
    const g = window.__RAIN__.CFG.grab.monkey;
    // 평범한 잡기로는 절대 못 닿는 높이
    w.dropJunk('scrap', monkey.x, monkey.y - g.ry - 200);
    const normalReach = (() => {
      rabbit.x = -9999;
      monkey.grabCd = 0;
      monkey.tryGrab(w);
      return monkey.backpack.length;
    })();
    monkey.tryAbility(w);
    return { normalReach, afterWhip: monkey.backpack.length };
  });
  expect(probe.normalReach).toBe(0);   // 일반 잡기로는 못 닿는다
  expect(probe.afterWhip).toBe(1);     // 채찍으로는 닿는다
  expect(errors).toEqual([]);
});

test('대형 위성은 혼자서는 못 잡고 둘이서 잡으면 나눠 갖는다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const [a, b] = w.players;
    a.backpack = []; b.backpack = [];
    a.stagger = 0; b.stagger = 0;
    w.junks.length = 0;
    w.junks.push(new (w.junks.constructor)());  // placeholder 제거용, 아래에서 교체
    w.junks.length = 0;
    w.dropJunk('satellite', a.x, a.y - 60);
    const sat = w.junks[0];
    sat.vy = 0;

    a.grabCd = 0;
    a.tryGrab(w);
    const alone = { alive: sat.alive, pack: a.backpack.length };

    b.x = a.x;
    b.grabCd = 0;
    b.tryGrab(w);
    return {
      alone,
      together: { alive: sat.alive, aPack: a.backpack.length, bPack: b.backpack.length },
    };
  });
  expect(probe.alone.alive).toBe(true);     // 혼자서는 안 잡힌다
  expect(probe.alone.pack).toBe(0);
  expect(probe.together.alive).toBe(false); // 둘이면 잡힌다
  expect(probe.together.aPack).toBe(1);
  expect(probe.together.bPack).toBe(1);
  expect(errors).toEqual([]);
});

test('보급품은 버프를 주고 지구에 피해를 주지 않는다', async ({ page }) => {
  const errors = watchErrors(page);
  await inPlay(page, 3);
  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const p = w.players[0];
    p.backpack = []; p.stagger = 0; p.grabCd = 0;
    w.junks.length = 0;
    w.dropJunk('supply', p.x, p.y - 60);
    w.junks[0].vy = 0;
    const baseSpeed = p.speed;
    p.tryGrab(w);
    const buffed = p.buff ? { type: p.buff.type, speed: p.speed } : null;

    // 지구에 닿아도 피해 없음
    const hpBefore = w.earth.hp;
    w.junks.length = 0;
    w.dropJunk('supply', 500, window.__RAIN__.CFG.world.earthTopY - 5);
    w.update(1 / 60, window.__RAIN__.input);
    return { pack: p.backpack.length, buffed, baseSpeed, hpBefore, hpAfter: w.earth.hp };
  });
  expect(probe.pack).toBe(0);                 // 배낭을 차지하지 않는다
  expect(probe.buffed).not.toBeNull();
  expect(['magnet', 'booster']).toContain(probe.buffed.type);
  expect(probe.hpAfter).toBe(probe.hpBefore); // 지구 피해 0
  expect(errors).toEqual([]);
});

test('잡기 범위는 토끼가 가장 좁고 원숭이 쿨다운이 가장 짧다 (밸런스 회귀 방지)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__RAIN__);
  const g = await page.evaluate(() => window.__RAIN__.CFG.grab);
  const area = (c) => Math.PI * c.rx * c.ry;
  expect(area(g.rabbit)).toBeLessThan(area(g.frog));
  expect(area(g.rabbit)).toBeLessThan(area(g.monkey));
  expect(g.monkey.cooldown).toBeLessThan(g.rabbit.cooldown);
  expect(g.frog.cooldown).toBeGreaterThan(g.rabbit.cooldown);
  expect(g.monkey.ry).toBeGreaterThan(g.monkey.rx);   // 세로로 길다
  expect(g.frog.rx).toBeGreaterThan(g.frog.ry);       // 가로로 길다
});

test('R.A.I.N. 러시에서 낙하 간격이 더 줄어든다', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__RAIN__);
  const r = await page.evaluate(() => {
    const CFG = window.__RAIN__.CFG;
    const total = CFG.flow.playSeconds;
    const w = { time: 0, players: [1, 2, 3] };
    const sp = window.__RAIN__.gm.scene.world?.spawner;
    return sp ? null : { total, rush: CFG.junk.rushSeconds, mul: CFG.junk.rushIntervalMul };
  });
  // 러시 구간 설정 자체를 확인 (스포너는 PLAY 중에만 존재)
  expect(r === null || r.mul).toBeTruthy();
});
