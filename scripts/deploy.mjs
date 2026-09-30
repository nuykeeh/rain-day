// dist/ 를 gh-pages 브랜치로 올린다. (GitHub Actions 없이, repo 권한만으로 동작)
// 사용: npm run deploy

import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
const out = (cmd, cwd = root) => execSync(cmd, { cwd }).toString().trim();

run('npm run build');

if (!existsSync(dist)) {
  console.error('[deploy] dist 가 없다. 빌드가 실패했다.');
  process.exit(1);
}

// Jekyll 처리를 끄지 않으면 _ 로 시작하는 파일이 무시된다
writeFileSync(join(dist, '.nojekyll'), '');

const remote = out('git remote get-url origin');

rmSync(join(dist, '.git'), { recursive: true, force: true });
run('git init -q', dist);
run('git checkout -q -b gh-pages', dist);
run('git add -A', dist);
run('git -c user.email=deploy@local -c user.name=deploy commit -q -m "deploy"', dist);
run(`git remote add origin ${remote}`, dist);
run('git push -f -q origin gh-pages', dist);
rmSync(join(dist, '.git'), { recursive: true, force: true });

console.log('[deploy] gh-pages 브랜치로 배포 완료');
