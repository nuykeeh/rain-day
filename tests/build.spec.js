// 빌드 결과물(npm run preview)이 그대로 동작하는지. (PRD 8.4)

import { test, expect } from '@playwright/test';
import { watchErrors, SHOTS } from './helpers.js';

const PREVIEW = 'http://127.0.0.1:4173';

test('빌드 결과물에서 한 판이 끝까지 진행된다', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${PREVIEW}/?autotest=1&speed=6&players=3&seed=777`);
  await page.waitForFunction(() => window.__RAIN_DONE__ === true, null, { timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/10-build.png` });
  expect(errors).toEqual([]);
});

test('폰트를 외부가 아니라 로컬에서 불러온다', async ({ page }) => {
  const requested = [];
  page.on('request', (r) => { if (r.url().includes('.woff2')) requested.push(r.url()); });
  await page.goto(`${PREVIEW}/`);
  await page.waitForTimeout(900);
  for (const u of requested) expect(u.startsWith(PREVIEW)).toBe(true);
  const res = await page.request.get(`${PREVIEW}/fonts/NotoSansKR-Bold.woff2`);
  expect(res.status()).toBe(200);
});
