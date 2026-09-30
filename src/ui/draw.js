// 공통 그리기 도구. 도형·텍스트·캐릭터 플레이스홀더.
// 캐릭터는 "색 원 + 등 배낭 + 눈"이고, 눈이 감정을 표현한다. (PRD 5)

import { THEME } from '../data/theme.js';

export const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

export function text(ctx, str, x, y, o = {}) {
  const {
    size = 40, weight = 700, color = THEME.color.text,
    align = 'center', baseline = 'middle', alpha = 1, maxWidth = 0,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth > 0) ctx.fillText(String(str), x, y, maxWidth);
  else ctx.fillText(String(str), x, y);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r = 12) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRound(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

export function strokeRound(ctx, x, y, w, h, r, color, lw = 3) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}

export function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function progressBar(ctx, x, y, w, h, ratio, color, bg = null) {
  fillRound(ctx, x, y, w, h, h / 2, bg ?? withAlpha('#FFFFFF', 0.08));
  const cw = Math.max(0, Math.min(1, ratio)) * w;
  if (cw > 1) fillRound(ctx, x, y, cw, h, h / 2, color);
}

// --- 색 ---------------------------------------------------------------------

// '#RGB' / '#RRGGBB' / 'rgb(r,g,b)' / 'rgba(r,g,b,a)' 를 모두 받는다.
// mix()·gray() 가 rgb() 문자열을 돌려주므로 서로 겹쳐 써도 깨지지 않아야 한다.
function toRgb(color) {
  if (typeof color !== 'string') return [255, 255, 255];
  if (color.startsWith('rgb')) {
    const m = color.match(/-?\d+(\.\d+)?/g);
    if (m && m.length >= 3) return [Number(m[0]), Number(m[1]), Number(m[2])];
    return [255, 255, 255];
  }
  const h = color.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const v = [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  return v.map((x) => (Number.isFinite(x) ? x : 255));
}

export function withAlpha(color, a) {
  const [r, g, b] = toRgb(color);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(colorA, colorB, t) {
  const a = toRgb(colorA); const b = toRgb(colorB);
  const k = Math.max(0, Math.min(1, t));
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function gray(color, amount = 1) {
  const [r, g, b] = toRgb(color);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const c = [r, g, b].map((v) => Math.round(v + (l - v) * amount));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  outBack: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
};

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// --- 이미지 (아트 교체 대비) -------------------------------------------------

const IMG_CACHE = new Map();

export function getImage(path) {
  if (!path) return null;
  if (IMG_CACHE.has(path)) return IMG_CACHE.get(path);
  const img = new Image();
  const rec = { img, ok: false };
  img.onload = () => { rec.ok = true; };
  img.onerror = () => { rec.ok = false; };
  img.src = path;
  IMG_CACHE.set(path, rec);
  return rec;
}

// --- 눈 ---------------------------------------------------------------------

const INK = '#22222A';

function eyeWhite(ctx, x, y, rx, ry) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function stroke(ctx, w) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
}

function arcUp(ctx, x, y, s) {
  stroke(ctx, Math.max(3, s * 0.36));
  ctx.beginPath();
  ctx.arc(x, y + s * 0.5, s, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
}

function xEye(ctx, x, y, s) {
  stroke(ctx, Math.max(3, s * 0.34));
  ctx.beginPath();
  ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
  ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
  ctx.stroke();
}

// >< 모양 (맞았을 때)
function hurtEye(ctx, x, y, s, flip) {
  stroke(ctx, Math.max(3, s * 0.36));
  ctx.beginPath();
  const d = flip ? -1 : 1;
  ctx.moveTo(x - s * d, y - s);
  ctx.lineTo(x + s * d * 0.6, y);
  ctx.lineTo(x - s * d, y + s);
  ctx.stroke();
}

function spiralEye(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 7);
  stroke(ctx, Math.max(2.5, s * 0.26));
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
    const rr = (a / (Math.PI * 3.2)) * s;
    const px = Math.cos(a) * rr; const py = Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function tearEye(ctx, x, y, s) {
  stroke(ctx, Math.max(3, s * 0.32));
  ctx.beginPath();
  ctx.arc(x, y - s * 0.3, s * 0.9, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = '#7FC4FF';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.9, s * 0.28, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function stars(ctx, x, y, r, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i * Math.PI * 2) / 3;
    const sx = x + Math.cos(a) * r * 0.85;
    const sy = y - r * 1.15 + Math.sin(a) * r * 0.22;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.fillStyle = THEME.color.warn;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - Math.PI / 2;
      const rr = k % 2 === 0 ? r * 0.2 : r * 0.09;
      ctx[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(ang) * rr, Math.sin(ang) * rr);
      const ang2 = ((k + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(ang2) * r * 0.09, Math.sin(ang2) * r * 0.09);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * 캐릭터 한 명.
 * expression: idle | happy | surprised | stunned | hurt | lose | worried
 */
export function drawCharacter(ctx, opt) {
  const {
    x, y, r, color, image = '', expression = 'idle',
    t = 0, phase = 0, squash = 1, dim = false,
    lookAt = null, backpack = null, tilt = 0,
  } = opt;

  const bodyColor = dim ? gray(color, 0.8) : color;
  const rx = r * (1 / squash);
  const ry = r * squash;
  const bob = expression === 'stunned' ? 0 : Math.sin(t * 3.4 + phase) * r * 0.035;
  const cy = y + bob;

  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(tilt);

  // 등 배낭 — 개수만큼 커진다. 몸에 겹쳐 붙여서 "메고 있는" 것처럼 보이게 한다. (PRD 5)
  if (backpack && backpack.max > 0) {
    const fill = Math.min(1, backpack.used / backpack.max);
    const bw = r * (0.56 + fill * 0.5);
    const bh = r * (0.72 + fill * 0.66);
    const bx = -rx * 0.72 - bw * 0.5;
    const by = -bh * 0.5 + r * 0.06;
    ctx.save();
    ctx.globalAlpha = dim ? 0.5 : 1;
    fillRound(ctx, bx, by, bw, bh, r * 0.2, mix('#33333D', bodyColor, 0.22));
    strokeRound(ctx, bx, by, bw, bh, r * 0.2, withAlpha('#000000', 0.45), 3);
    // 어깨끈
    ctx.strokeStyle = withAlpha('#000000', 0.3);
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.beginPath();
    ctx.moveTo(bx + bw, by + bh * 0.22);
    ctx.lineTo(bx + bw + rx * 0.5, by + bh * 0.34);
    ctx.stroke();
    // 담긴 쓰레기
    for (let i = 0; i < backpack.used; i++) {
      const cyy = by + bh - r * 0.18 - i * ((bh - r * 0.3) / Math.max(1, backpack.max));
      circle(ctx, bx + bw * 0.5, cyy, r * 0.1, withAlpha(THEME.color.warn, 0.95));
    }
    ctx.restore();
  }

  // 몸통
  const rec = getImage(image);
  if (rec && rec.ok) {
    ctx.save();
    if (dim) ctx.globalAlpha *= 0.55;
    ctx.drawImage(rec.img, -rx, -ry, rx * 2, ry * 2);
    ctx.restore();
    ctx.restore();
    return;
  }

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 외곽선 — 대원끼리 겹쳐도 실루엣이 구분된다
  ctx.strokeStyle = withAlpha('#0B0B0E', 0.55);
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(0, ry * 0.46, rx * 0.92, ry * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 눈
  const ex = rx * 0.36;
  const ey = -ry * 0.08;
  const baseRx = rx * 0.21;
  const baseRy = ry * 0.27;
  const pupilR = baseRx * 0.56;

  const blinkCycle = 3.6;
  const bp = ((t + phase) % blinkCycle) / blinkCycle;
  const blinking = bp < 0.035;

  // 시선 — 쓰레기 쪽을 본다
  let lx = 0; let ly = baseRy * 0.12;
  if (lookAt) {
    const dx = lookAt.x - x;
    const dy = lookAt.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    lx = clamp((dx / d) * baseRx * 0.45, -baseRx * 0.45, baseRx * 0.45);
    ly = clamp((dy / d) * baseRy * 0.4, -baseRy * 0.4, baseRy * 0.45);
  }

  if (expression === 'stunned') {
    spiralEye(ctx, -ex, ey, baseRx * 0.85, t);
    spiralEye(ctx, ex, ey, baseRx * 0.85, t);
    stars(ctx, 0, -ry, r, t);
  } else if (expression === 'hurt') {
    hurtEye(ctx, -ex, ey, baseRx * 0.85, false);
    hurtEye(ctx, ex, ey, baseRx * 0.85, true);
    stroke(ctx, Math.max(3, r * 0.05));
    ctx.beginPath();
    ctx.arc(0, ry * 0.42, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (expression === 'happy') {
    arcUp(ctx, -ex, ey, baseRx * 1.02);
    arcUp(ctx, ex, ey, baseRx * 1.02);
    stroke(ctx, Math.max(3, r * 0.05));
    ctx.beginPath();
    ctx.arc(0, ry * 0.26, r * 0.19, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (expression === 'surprised') {
    eyeWhite(ctx, -ex, ey, baseRx * 1.16, baseRy * 1.2);
    eyeWhite(ctx, ex, ey, baseRx * 1.16, baseRy * 1.2);
    circle(ctx, -ex + lx * 0.5, ey + ly * 0.5, pupilR * 0.72, INK);
    circle(ctx, ex + lx * 0.5, ey + ly * 0.5, pupilR * 0.72, INK);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.36, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === 'lose') {
    tearEye(ctx, -ex, ey, baseRx * 0.9);
    tearEye(ctx, ex, ey, baseRx * 0.9);
  } else if (expression === 'worried') {
    // 불안하게 두리번 (PRD 5 — 지구 30% 이하)
    const dart = Math.sin(t * 9 + phase) * baseRx * 0.5;
    eyeWhite(ctx, -ex, ey, baseRx, baseRy * 0.85);
    eyeWhite(ctx, ex, ey, baseRx, baseRy * 0.85);
    circle(ctx, -ex + dart, ey, pupilR * 0.9, INK);
    circle(ctx, ex + dart, ey, pupilR * 0.9, INK);
    stroke(ctx, Math.max(3, r * 0.045));
    ctx.beginPath();
    ctx.moveTo(-r * 0.14, ry * 0.4);
    ctx.lineTo(r * 0.14, ry * 0.4);
    ctx.stroke();
  } else {
    if (blinking) {
      // 감은 눈은 흰 슬릿이 아니라 어두운 선으로 그린다
      stroke(ctx, Math.max(3, baseRx * 0.34));
      ctx.beginPath();
      ctx.moveTo(-ex - baseRx * 0.8, ey); ctx.lineTo(-ex + baseRx * 0.8, ey);
      ctx.moveTo(ex - baseRx * 0.8, ey); ctx.lineTo(ex + baseRx * 0.8, ey);
      ctx.stroke();
    } else {
      eyeWhite(ctx, -ex, ey, baseRx, baseRy);
      eyeWhite(ctx, ex, ey, baseRx, baseRy);
      circle(ctx, -ex + lx, ey + ly, pupilR, INK);
      circle(ctx, ex + lx, ey + ly, pupilR, INK);
    }
  }
  ctx.restore();
}

// 잡기 범위 표시 (성공/헛손질 모두 잠깐 보인다)
export function drawGrabShape(ctx, x, y, rx, ry, alpha, color, hit) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = hit ? color : withAlpha('#FFFFFF', 0.55);
  ctx.lineWidth = hit ? 7 : 4;
  ctx.setLineDash(hit ? [] : [14, 12]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (hit) {
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.restore();
}

// L / M / R 아이콘
export function buttonGlyph(ctx, x, y, label, size = 74, color = THEME.color.accent, sub = '') {
  circle(ctx, x, y, size / 2, withAlpha(color, 0.16));
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, label, x, y + 2, { size: size * 0.44, color, weight: 800 });
  if (sub) text(ctx, sub, x, y + size * 0.78, { size: size * 0.3, color: THEME.color.text, weight: 600 });
}
