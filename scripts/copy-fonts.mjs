// @fontsource/noto-sans-kr 에서 한글 woff2 를 public/fonts/ 로 복사한다.
// 전시장 오프라인 대비 — 런타임에 CDN을 쓰지 않는다. (PRD 0-6)

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', '@fontsource', 'noto-sans-kr', 'files');
const outDir = join(root, 'public', 'fonts');

if (!existsSync(srcDir)) {
  console.error('[fonts] @fontsource/noto-sans-kr 가 없다. npm install 을 먼저 실행할 것.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir);
const want = [
  { weight: '400', out: 'NotoSansKR-Regular.woff2' },
  { weight: '700', out: 'NotoSansKR-Bold.woff2' },
];

let ok = 0;
for (const w of want) {
  // 한글 subset 파일명 예: noto-sans-kr-korean-400-normal.woff2
  const hit = files.find((f) => f.includes('korean') && f.includes(`-${w.weight}-normal`) && f.endsWith('.woff2'));
  if (!hit) {
    console.warn(`[fonts] ${w.weight} 굵기 한글 파일을 못 찾았다.`);
    continue;
  }
  copyFileSync(join(srcDir, hit), join(outDir, w.out));
  console.log(`[fonts] ${hit} -> public/fonts/${w.out}`);
  ok += 1;
}
process.exit(ok === want.length ? 0 : 1);
