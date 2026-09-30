import { mkdirSync } from 'node:fs';

export const SHOTS = 'tests/screenshots';
mkdirSync(SHOTS, { recursive: true });

export function watchErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

export function url({ players = 3, speed = 4, seed = 20260929, tune = false, idle = null } = {}) {
  const q = new URLSearchParams({ autotest: '1', speed: String(speed), players: String(players), seed: String(seed) });
  if (tune) q.set('tune', '1');
  if (idle !== null) q.set('idle', String(idle));
  return `/?${q.toString()}`;
}

// 특정 상태에 들어간 뒤 N초 지나면 멈추고 스크린샷을 찍는다.
export async function shotAt(page, { state, after = 0, name, tuning = null, ...opts }) {
  await page.addInitScript(
    ([s, a, tun]) => {
      window.__RAIN_PAUSE_AT__ = { state: s, after: a };
      if (tun) { try { localStorage.setItem('rain_tune_v1', JSON.stringify(tun)); } catch {} }
    },
    [state, after, tuning],
  );
  await page.goto(url(opts));
  await page.waitForFunction(() => window.__RAIN_PAUSED__ === true, null, { timeout: 90_000 });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}
