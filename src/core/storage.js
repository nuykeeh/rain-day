// localStorage 래퍼. 차단·시크릿 모드에서도 게임이 죽지 않게 전부 try/catch. (PRD 7.1)

const KEY = 'rain_day_v1';
const DEFAULTS = { totalTons: 0, earthSaved: 0, earthLost: 0 };

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* 무시 */ }
}

export const Store = {
  all() { return read(); },
  addTons(n) {
    const d = read();
    d.totalTons = Math.round((d.totalTons + n) * 10) / 10;
    write(d);
    return d.totalTons;
  },
  addEarthResult(saved) {
    const d = read();
    if (saved) d.earthSaved += 1; else d.earthLost += 1;
    write(d);
    return d;
  },
  reset() { write({ ...DEFAULTS }); },
};
