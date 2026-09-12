/* Tez tekshiruv: sahifa ochiladimi, xato bormi, skrinshot.
 * To'liq tekshiruv uchun — npm run qa
 *
 *   npm run dev      # boshqa terminalda
 *   npm run smoke
 */
import { chromium } from 'playwright';
import { access, readdir, mkdir } from 'node:fs/promises';

const URL = process.env.QA_URL || 'http://127.0.0.1:5173';
const OUT = process.env.QA_OUT || 'qa/smoke';

let executablePath = chromium.executablePath();
try { await access(executablePath); } catch {
  const cache = `${process.env.HOME}/Library/Caches/ms-playwright`;
  const dirs = await readdir(cache);
  const dir = dirs.filter(x => x.startsWith('chromium_headless_shell-')).sort().at(-1);
  executablePath = `${cache}/${dir}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const problems = [];
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
page.on('requestfailed', r => problems.push('requestfailed: ' + r.url()));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForSelector('.page.ready', { timeout: 15000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/page.png` });

const summary = await page.evaluate(() => ({
  title: document.title,
  year: document.querySelector('.year-badge')?.innerText.replace(/\s+/g, ' '),
  cards: document.querySelectorAll('.card').length,
  numbers: [...document.querySelectorAll('.card-num')].map(n => n.textContent)
}));

console.log(JSON.stringify(summary, null, 2));
await browser.close();

if (problems.length) {
  console.error('\n' + problems.join('\n'));
  process.exit(1);
}
console.log(`\nOK — skrinshot: ${OUT}/page.png`);
