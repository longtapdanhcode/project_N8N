// Isolated visual check: mock data, ephemeral sessions, no backend writes.
import { spawn } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../student-pwa/node_modules/playwright/index.mjs';
const root = new URL('../', import.meta.url);
const output = new URL('artifacts/workspace-preview/', root);
await mkdir(output, { recursive: true });
const secret = randomBytes(48).toString('hex');
const server = spawn(process.execPath, ['scripts/portal.mjs', 'dev'], {
  cwd: root, windowsHide: true,
  env: { ...process.env, AUTH_SESSION_SECRET: secret, NEXT_PUBLIC_PORTAL_MOCK: 'true', VITE_USE_MOCK: 'true' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', c => { log += c; });
server.stderr.on('data', c => { log += c; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) throw new Error('Preview server could not start');
    if (log.includes('Ready in')) { ready = true; break; }
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!ready) throw new Error('Preview server timeout');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = [];
  for (const role of ['teacher', 'student']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const body = Buffer.from(JSON.stringify({ username: role === 'student' ? '23IT112' : 'gv.demo', name: 'Tài khoản kiểm tra giao diện', role, expires: Date.now() + 3600000 })).toString('base64url');
    await context.addCookies([{ name: 'vku_session', value: `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
    const page = await context.newPage();
    if (role === 'student') {
      await page.route('**/api/student-data/timetable', route => route.fulfill({ json: [
        { id: 'preview-web', course: 'Lập trình Web', code: 'IT301 · 23IT2', date: '2026-10-12', start: '07:00', end: '09:30', room: 'K.A301', lecturer: 'ThS. Trần Quốc Huy', attendance: 'not-marked', updatedAt: 1791766800000 },
        { id: 'preview-db', course: 'Cơ sở dữ liệu', code: 'IT204 · 23IT2', date: '2026-10-12', start: '13:00', end: '15:30', room: 'K.B204', lecturer: 'TS. Nguyễn Thu Hà', attendance: 'not-marked', updatedAt: 1791766800000 },
        { id: 'preview-network', course: 'Mạng máy tính', code: 'IT205 · 23IT2', date: '2026-10-13', start: '07:00', end: '09:30', room: 'K.A402', lecturer: 'ThS. Lê Văn Phúc', attendance: 'not-marked', updatedAt: 1791766800000 },
      ] }));
    }
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:3000/${role === 'teacher' ? 'teacher' : 'student/index.html'}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.locator(role === 'teacher' ? '.teacher-portal' : '.student-portal').waitFor();
    // Hide only the framework's development badge in deliverable screenshots.
    await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
    await page.evaluate(() => document.fonts.ready);
    if (role === 'student') await page.locator('.lesson').first().waitFor();
    await page.screenshot({ path: new URL(`${role}.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`${role}: horizontal overflow at ${width}px`);
      if (width === 390) await page.screenshot({ path: new URL(`${role}-mobile.png`, output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
      report.push({ role, width, overflow, errors });
    }
    if (errors.length) throw new Error(`${role}: browser runtime errors`);
    await context.close();
  }
  await writeFile(new URL('checks.json', output), JSON.stringify(report, null, 2));
  console.log('Captured teacher/student desktop and mobile; no horizontal overflow.');
} finally {
  await browser?.close();
  // The preview owns this process tree; never stop an unrelated server on port 3000.
  if (server.pid) await new Promise(resolve => spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('exit', resolve));
}
