// 자동 스모크 테스트. ?autotest=1 로 한 판을 끝까지 돌리고 콘솔 에러 0을 확인한다. (PRD 1-6, 8.3)

import { test, expect } from '@playwright/test';
import { watchErrors, url, shotAt, SHOTS } from './helpers.js';

test('3인 한 판이 RESULT까지 끝까지 진행된다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(url({ players: 3 }));

  await page.waitForFunction(() => window.__RAIN_STATE__ === 'JOIN', null, { timeout: 30_000 });
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'PLAY', null, { timeout: 40_000 });
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });

  const history = await page.evaluate(() => window.__RAIN_HISTORY__);
  expect(history[0]).toBe('ATTRACT');
  for (const s of ['JOIN', 'BRIEFING', 'PLAY', 'RESULT']) expect(history).toContain(s);

  const res = await page.evaluate(() => window.__RAIN__.gm.session.result);
  expect(res.order.length).toBe(3);
  // 자동 대원이 실제로 점수를 냈는지 = 잡기·넣기가 동작한다는 뜻
  expect(Math.max(...Object.values(res.scores))).toBeGreaterThan(0);
  await page.screenshot({ path: `${SHOTS}/flow-result.png` });
  expect(errors).toEqual([]);
});

for (const players of [1, 2]) {
  test(`${players}인도 한 판을 끝까지 진행한다`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(url({ players }));
    await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
    const s = await page.evaluate(() => window.__RAIN_SESSION__);
    expect(s.slots.length).toBe(players);
    expect(errors).toEqual([]);
  });
}

test('RESULT 후 자동으로 ATTRACT로 돌아온다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(url({ players: 2, speed: 8 }));
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'ATTRACT', null, { timeout: 40_000 });
  expect(errors).toEqual([]);
});

// --- 화면 스크린샷 --------------------------------------------------------

test('대기 화면', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'ATTRACT', after: 0.3, name: '01-attract', speed: 1 });
  expect(e).toEqual([]);
});

test('참가 화면', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'JOIN', after: 1.2, name: '02-join', speed: 1 });
  expect(e).toEqual([]);
});

test('브리핑 화면', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'BRIEFING', after: 1.0, name: '03-briefing', speed: 1 });
  expect(e).toEqual([]);
});

test('시작 카운트다운', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'PLAY', after: 1.0, name: '04-play-ready', speed: 1 });
  expect(e).toEqual([]);
});

test('플레이 초반', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'PLAY', after: 12, name: '05-play-early', speed: 1 });
  expect(e).toEqual([]);
});

test('플레이 후반 (낙하 빨라짐)', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, {
    state: 'PLAY', after: 70, name: '06-play-late', speed: 4,
    tuning: { 'earth.max': 400 },   // 후반까지 살아남아야 낙하가 빨라진 화면을 찍는다
  });
  expect(e).toEqual([]);
});

test('결과 화면', async ({ page }) => {
  const e = watchErrors(page);
  await shotAt(page, { state: 'RESULT', after: 2.0, name: '07-result', speed: 6 });
  expect(e).toEqual([]);
});

// --- 규칙 검증 ------------------------------------------------------------

test('지구 게이지가 0이 되면 패배로 끝난다', async ({ page }) => {
  const errors = watchErrors(page);
  // 튜닝값을 주입해 일부러 지구를 무너뜨린다
  await page.addInitScript(() => {
    localStorage.setItem('rain_tune_v1', JSON.stringify({
      'earth.max': 50,
      'junk.intervalStart': 0.35,
      'junk.intervalEnd': 0.3,
      'junk.meteor.weight': 100,
      'junk.scrap.weight': 0,
      'grab.rabbit.rx': 40, 'grab.rabbit.ry': 40,
      'grab.frog.rx': 40, 'grab.frog.ry': 40,
      'grab.monkey.rx': 40, 'grab.monkey.ry': 40,
    }));
  });
  await page.goto(url({ players: 1, speed: 6 }));
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
  const res = await page.evaluate(() => window.__RAIN__.gm.session.result);
  expect(res.win).toBe(false);
  await page.screenshot({ path: `${SHOTS}/08-earth-lost.png` });
  expect(errors).toEqual([]);
});

test('90초를 버티면 승리로 끝난다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('rain_tune_v1', JSON.stringify({ 'flow.playSeconds': 25, 'earth.max': 300 }));
  });
  await page.goto(url({ players: 3, speed: 6 }));
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
  const res = await page.evaluate(() => window.__RAIN__.gm.session.result);
  expect(res.win).toBe(true);
  expect(errors).toEqual([]);
});

test('배낭이 차면 느려지고, 수거선에 넣으면 점수가 오른다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(url({ players: 1, speed: 1 }));
  await page.waitForFunction(() => window.__RAIN__?.gm?.scene?.world?.phase === 'play', null, { timeout: 40_000 });

  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const p = w.players[0];
    const fast = p.speed;
    p.backpack = [{ type: 'scrap', slots: 1, value: 1 }, { type: 'scrap', slots: 1, value: 1 }];
    const slow = p.speed;
    const before = p.score;
    p.x = w.ship.x;
    p.grabCd = 0;
    p.deposit(w);
    return { fast, slow, before, after: p.score, left: p.backpack.length, tons: w.tons };
  });

  expect(probe.slow).toBeLessThan(probe.fast);     // 배낭 감속
  expect(probe.after).toBeGreaterThan(probe.before); // 점수 상승
  expect(probe.after - probe.before).toBe(3);        // 2개 한 번에 = 3점 (PRD 4.3)
  expect(probe.left).toBe(0);
  expect(probe.tons).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('박치기에 맞으면 쓰레기를 흘리고 비틀거린다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(url({ players: 3, speed: 1 }));
  await page.waitForFunction(() => window.__RAIN__?.gm?.scene?.world?.phase === 'play', null, { timeout: 40_000 });

  const probe = await page.evaluate(() => {
    const w = window.__RAIN__.gm.scene.world;
    const [a, b] = w.players;
    b.backpack = [{ type: 'scrap', slots: 1, value: 1 }];
    b.stagger = 0;
    a.x = b.x - 60;
    a.facing = 1;
    a.dashDir = 1;
    a.dashTime = 0.2;
    const junkBefore = w.junks.length;
    w.update(1 / 60, window.__RAIN__.input);
    return { stagger: b.stagger, pack: b.backpack.length, junkDelta: w.junks.length - junkBefore };
  });

  expect(probe.stagger).toBeGreaterThan(0);   // 비틀거림
  expect(probe.pack).toBe(0);                 // 배낭에서 1개 떨어짐
  expect(probe.junkDelta).toBeGreaterThanOrEqual(1); // 떨어진 쓰레기가 다시 낙하
  expect(errors).toEqual([]);
});

// --- 운영 ------------------------------------------------------------------

test('키보드 실제 입력으로 참가한다 (event.code 판정)', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'ATTRACT');
  await page.keyboard.press('KeyZ');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'JOIN');
  await page.keyboard.press('KeyB');
  await page.keyboard.press('Comma');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'BRIEFING', null, { timeout: 15_000 });
  const s = await page.evaluate(() => window.__RAIN_SESSION__);
  expect(s.slots).toEqual([0, 1, 2]);
  expect(errors).toEqual([]);
});

test('무입력이면 대기화면으로 돌아온다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?idle=2');
  await page.keyboard.press('KeyZ');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'JOIN');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'ATTRACT', null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('튜닝 패널(F3)이 열리고 값이 실시간 반영·저장된다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(url({ players: 3, speed: 1 }));
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'JOIN', null, { timeout: 20_000 });
  await page.keyboard.press('F3');
  await expect(page.locator('.rain-tune')).toBeVisible();

  const slider = page.locator('.rain-tune input[type=range]').first();
  await slider.fill('40');
  const applied = await page.evaluate(() => window.__RAIN__.CFG.flow.playSeconds);
  expect(applied).toBe(40);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rain_tune_v1')));
  expect(saved['flow.playSeconds']).toBe(40);

  await page.screenshot({ path: `${SHOTS}/09-tune-panel.png` });

  await page.locator('.rain-tune button.warn').click();  // 기본값 복원
  const reset = await page.evaluate(() => window.__RAIN__.CFG.flow.playSeconds);
  expect(reset).toBe(90);
  expect(errors).toEqual([]);
});

test('누적 카운터가 새로고침 후에도 남는다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem('rain_tune_v1', JSON.stringify({ 'flow.playSeconds': 20 }));
  });
  await page.goto(url({ players: 2, speed: 8 }));
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
  const after = await page.evaluate(() => window.__RAIN__.gm.totalTons);
  expect(after).toBeGreaterThan(0);
  await page.goto('/');
  await page.waitForFunction(() => window.__RAIN_STATE__ === 'ATTRACT');
  const again = await page.evaluate(() => window.__RAIN__.gm.totalTons);
  expect(again).toBeCloseTo(after, 1);
  expect(errors).toEqual([]);
});
