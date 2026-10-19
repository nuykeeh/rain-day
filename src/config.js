// 모든 튜닝 수치는 이 파일 한 곳에만 둔다. (PRD 1-4)
// 런타임에는 CFG 를 읽고, 튜닝 패널(F3)이 CFG 를 직접 고친다.
// DEFAULTS 는 "기본값 복원"과 "JSON 복사"(바뀐 값만 추출)의 기준이다.

export const DEFAULTS = {
  view: { w: 1920, h: 1080 },

  loop: { step: 1 / 60, maxFrameSeconds: 0.25 },

  flow: {
    attractPanelSeconds: 5,
    joinCountdown: 8,
    playSeconds: 90,
    resultSeconds: 10,
    idleTimeoutSeconds: 30,
    startCountdown: 2,
    endFreezeSeconds: 1.6,
  },

  world: {
    shipY: 150,
    orbitY: 700,
    earthTopY: 900,
    wallPad: 90,
  },

  ship: {
    w: 300,
    h: 96,
    speed: 170,
    rangePad: 320,
    catchPad: 40,
  },

  player: {
    radius: 52,
    moveSpeed: 560,
    backpackSlots: 5,
    slowPerSlot: 0.08,

    longPressSeconds: 0.4,    // M 길게 = 특수능력
    doubleTapSeconds: 0.25,   // L/R 을 이 시간 안에 두 번 = 그 방향으로 돌진 (v3.1)
    dashSpeed: 1500,
    dashSeconds: 0.18,
    dashCooldown: 0.8,
    dashHitRange: 120,
    staggerSeconds: 0.6,
    stunSeconds: 1.2,         // 라이벌끼리 부딪혔을 때 (PRD 4.6)
    grabShowSeconds: 0.16,
  },

  // 캐릭터별 잡기 범위(타원)와 쿨다운. 모양만 다르면 원형이 제일 무난해지므로
  // 면적과 쿨다운으로 대가를 치른다. (PRD 4.5 v3.1)
  grab: {
    rabbit: { rx: 130, ry: 130, offY: 60, cooldown: 0.36 },   // 가장 좁다 — 그물로 벌충
    frog:   { rx: 300, ry: 80,  offY: 40, cooldown: 0.50 },   // 넓지만 느리다
    monkey: { rx: 80,  ry: 300, offY: 165, cooldown: 0.24 },  // 일찍 가로채고 빠르다
  },

  // 특수능력 — M 을 0.4초 이상 누르면 발동 (PRD 4.5)
  ability: {
    rabbit: { cooldown: 7.0, netSeconds: 4.0, netW: 280, netH: 44, netOffY: 230 },
    frog:   { cooldown: 5.0, range: 640, showSeconds: 0.3 },
    monkey: { cooldown: 2.5, rxMul: 1.7, ryMul: 2.4, showSeconds: 0.28 },
  },

  junk: {
    warnSeconds: 0.5,
    intervalStart: 1.0,       // v3.1 상향 (1.2 → 1.0)
    intervalEnd: 0.28,        // v3.1 상향 (0.35 → 0.28)
    meteorRatioStart: 0.20,   // 운석 비율이 시간이 갈수록 오른다 (v3.1)
    meteorRatioEnd: 0.45,
    rushSeconds: 20,          // 마지막 이 시간은 R.A.I.N. 러시
    rushIntervalMul: 0.6,
    dropSpeed: 180,

    scrap:     { speed: 270, damage: 3,  slots: 1, value: 1, r: 30 },
    meteor:    { speed: 460, damage: 8,  slots: 2, value: 2, r: 36 },
    satellite: { speed: 125, damage: 20, slots: 2, value: 4, r: 62,
                 chance: 0.08, minGrabbers: 2, grabWindow: 0.3 },  // 2명 이상 동시에 잡아야 한다
    supply:    { speed: 300, damage: 0,  slots: 0, value: 0, r: 34, chance: 0.06 },
  },

  buff: {
    seconds: 5,
    magnetMul: 2.0,   // 잡기 범위 2배
    boosterMul: 2.0,  // 속도 2배 + 무게 무시
  },

  earth: { max: 100, warnThreshold: 30 },

  score: {
    depositBonus: [0, 1, 3, 5, 8, 12],   // 한 번에 넣은 개수별 총점 (운석·위성은 값이 크다)
    tonsPerValue: 0.4,
  },

  amount: { solo: 0.6, duo: 0.8, trio: 1.0 },

  fx: { shakeDecay: 7, maxShake: 40, hitstopSeconds: 0.06 },

  audio: { masterGain: 0.35 },

  admin: { holdSeconds: 3 },
};

export const CFG = structuredClone(DEFAULTS);

// --- 경로 접근 -------------------------------------------------------------

export function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

// --- 튜닝 패널 항목 (PRD 8.2) ----------------------------------------------

export const TUNABLES = [
  {
    group: '한 판 · 난이도',
    items: [
      { path: 'flow.playSeconds', label: '한 판 시간', min: 20, max: 180, step: 5, unit: '초' },
      { path: 'earth.max', label: '지구 체력', min: 50, max: 400, step: 10, unit: '' },
      { path: 'junk.intervalStart', label: '낙하 간격 시작', min: 0.2, max: 3, step: 0.05, unit: '초' },
      { path: 'junk.intervalEnd', label: '낙하 간격 끝', min: 0.1, max: 2, step: 0.02, unit: '초' },
      { path: 'junk.meteorRatioStart', label: '운석 비율 시작', min: 0, max: 1, step: 0.05, unit: '' },
      { path: 'junk.meteorRatioEnd', label: '운석 비율 끝', min: 0, max: 1, step: 0.05, unit: '' },
      { path: 'junk.rushSeconds', label: 'R.A.I.N. 러시 길이', min: 0, max: 60, step: 5, unit: '초' },
      { path: 'junk.rushIntervalMul', label: '러시 간격 배율', min: 0.2, max: 1, step: 0.05, unit: '' },
      { path: 'junk.warnSeconds', label: '경고 표시 시간', min: 0, max: 2, step: 0.05, unit: '초' },
    ],
  },
  {
    group: '쓰레기',
    items: [
      { path: 'junk.scrap.speed', label: '고철 낙하속도', min: 80, max: 900, step: 10, unit: '' },
      { path: 'junk.scrap.damage', label: '고철 피해', min: 0, max: 30, step: 1, unit: '' },
      { path: 'junk.meteor.speed', label: '운석 낙하속도', min: 80, max: 1200, step: 10, unit: '' },
      { path: 'junk.meteor.damage', label: '운석 피해', min: 0, max: 40, step: 1, unit: '' },
      { path: 'junk.satellite.chance', label: '위성 등장 확률', min: 0, max: 0.4, step: 0.01, unit: '' },
      { path: 'junk.satellite.damage', label: '위성 피해', min: 0, max: 60, step: 1, unit: '' },
      { path: 'junk.satellite.speed', label: '위성 낙하속도', min: 40, max: 500, step: 5, unit: '' },
      { path: 'junk.satellite.grabWindow', label: '위성 동시잡기 시간', min: 0.1, max: 1.5, step: 0.05, unit: '초' },
      { path: 'junk.supply.chance', label: '보급품 등장 확률', min: 0, max: 0.4, step: 0.01, unit: '' },
    ],
  },
  {
    group: '대원',
    items: [
      { path: 'player.moveSpeed', label: '이동속도', min: 150, max: 1200, step: 10, unit: '' },
      { path: 'player.backpackSlots', label: '배낭 최대칸', min: 1, max: 10, step: 1, unit: '칸' },
      { path: 'player.slowPerSlot', label: '배낭 1칸당 감속', min: 0, max: 0.25, step: 0.01, unit: '' },
      { path: 'player.radius', label: '몸 크기', min: 30, max: 90, step: 2, unit: '' },
      { path: 'buff.seconds', label: '보급품 버프 시간', min: 1, max: 20, step: 0.5, unit: '초' },
    ],
  },
  {
    group: '박치기',
    items: [
      { path: 'player.doubleTapSeconds', label: '더블탭 판정', min: 0.08, max: 0.6, step: 0.01, unit: '초' },
      { path: 'player.dashSpeed', label: '돌진 속도', min: 400, max: 3000, step: 50, unit: '' },
      { path: 'player.dashSeconds', label: '돌진 시간', min: 0.05, max: 0.6, step: 0.01, unit: '초' },
      { path: 'player.dashHitRange', label: '박치기 거리', min: 40, max: 300, step: 5, unit: '' },
      { path: 'player.staggerSeconds', label: '비틀거림 시간', min: 0.1, max: 2, step: 0.05, unit: '초' },
      { path: 'player.stunSeconds', label: '라이벌 기절 시간', min: 0.2, max: 3, step: 0.1, unit: '초' },
      { path: 'player.dashCooldown', label: '박치기 쿨다운', min: 0, max: 3, step: 0.05, unit: '초' },
    ],
  },
  {
    group: '잡기 범위',
    items: [
      { path: 'grab.rabbit.rx', label: '토끼 가로', min: 40, max: 400, step: 5, unit: '' },
      { path: 'grab.rabbit.ry', label: '토끼 세로', min: 40, max: 400, step: 5, unit: '' },
      { path: 'grab.rabbit.cooldown', label: '토끼 쿨다운', min: 0.1, max: 1.5, step: 0.02, unit: '초' },
      { path: 'grab.frog.rx', label: '개구리 가로', min: 40, max: 500, step: 5, unit: '' },
      { path: 'grab.frog.ry', label: '개구리 세로', min: 40, max: 400, step: 5, unit: '' },
      { path: 'grab.frog.cooldown', label: '개구리 쿨다운', min: 0.1, max: 1.5, step: 0.02, unit: '초' },
      { path: 'grab.monkey.rx', label: '원숭이 가로', min: 40, max: 400, step: 5, unit: '' },
      { path: 'grab.monkey.ry', label: '원숭이 세로', min: 40, max: 600, step: 5, unit: '' },
      { path: 'grab.monkey.cooldown', label: '원숭이 쿨다운', min: 0.1, max: 1.5, step: 0.02, unit: '초' },
    ],
  },
  {
    group: '특수능력',
    items: [
      { path: 'ability.rabbit.cooldown', label: '토끼 그물 쿨다운', min: 1, max: 20, step: 0.5, unit: '초' },
      { path: 'ability.rabbit.netSeconds', label: '토끼 그물 지속', min: 0.5, max: 12, step: 0.5, unit: '초' },
      { path: 'ability.rabbit.netW', label: '토끼 그물 폭', min: 100, max: 700, step: 10, unit: '' },
      { path: 'ability.frog.cooldown', label: '개구리 훔치기 쿨다운', min: 1, max: 20, step: 0.5, unit: '초' },
      { path: 'ability.frog.range', label: '개구리 혀 사거리', min: 150, max: 1200, step: 20, unit: '' },
      { path: 'ability.monkey.cooldown', label: '원숭이 채찍 쿨다운', min: 0.5, max: 12, step: 0.25, unit: '초' },
      { path: 'ability.monkey.ryMul', label: '원숭이 채찍 길이배율', min: 1, max: 4, step: 0.1, unit: '' },
    ],
  },
  {
    group: '수거선 · 점수',
    items: [
      { path: 'ship.speed', label: '수거선 속도', min: 0, max: 600, step: 10, unit: '' },
      { path: 'ship.rangePad', label: '수거선 이동 여백', min: 0, max: 800, step: 20, unit: '' },
      { path: 'ship.w', label: '수거선 폭', min: 120, max: 700, step: 10, unit: '' },
      { path: 'score.depositBonus.1', label: '1개 넣기 점수', min: 1, max: 20, step: 1, unit: '점' },
      { path: 'score.depositBonus.2', label: '2개 넣기 점수', min: 1, max: 30, step: 1, unit: '점' },
      { path: 'score.depositBonus.3', label: '3개 넣기 점수', min: 1, max: 40, step: 1, unit: '점' },
      { path: 'score.depositBonus.4', label: '4개 넣기 점수', min: 1, max: 50, step: 1, unit: '점' },
      { path: 'score.depositBonus.5', label: '5개 넣기 점수', min: 1, max: 60, step: 1, unit: '점' },
    ],
  },
];

// --- 저장·복원 -------------------------------------------------------------

const TUNE_KEY = 'rain_tune_v1';

export function applyOverrides(over) {
  for (const [path, value] of Object.entries(over ?? {})) setByPath(CFG, path, value);
}

export function collectOverrides() {
  const out = {};
  for (const g of TUNABLES) {
    for (const it of g.items) {
      const cur = getByPath(CFG, it.path);
      const def = getByPath(DEFAULTS, it.path);
      if (cur !== def) out[it.path] = cur;
    }
  }
  return out;
}

export function saveTuning() {
  try { localStorage.setItem(TUNE_KEY, JSON.stringify(collectOverrides())); } catch { /* 무시 */ }
}

export function loadTuning() {
  try {
    const raw = localStorage.getItem(TUNE_KEY);
    if (raw) applyOverrides(JSON.parse(raw));
  } catch { /* 무시 */ }
}

export function resetTuning() {
  for (const g of TUNABLES) {
    for (const it of g.items) setByPath(CFG, it.path, getByPath(DEFAULTS, it.path));
  }
  try { localStorage.removeItem(TUNE_KEY); } catch { /* 무시 */ }
}
