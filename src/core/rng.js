// 시드 가능한 난수.

export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (min, max) => min + r() * (max - min);
  r.int = (n) => Math.floor(r() * n);
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

export function randomSeed() {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}
