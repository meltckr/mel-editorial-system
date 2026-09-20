import { test, expect } from '@playwright/test';
import { readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fingerprintSource, fingerprintDirectory } from '../scripts/validate-release.mjs';

const base = '/mel-editorial-system';
function htmlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(filename) : entry.name.endsWith('.html') ? [filename] : [];
  }).sort();
}
const routes = htmlFiles('build').filter((file) => path.basename(file) !== '404.html').map((file) => {
  const relative = path.relative('build', file).split(path.sep).join('/');
  return `${base}/${relative.replace(/(^|\/)index\.html$/, '$1')}`;
});
if (!routes.length) throw new Error('No prerendered HTML pages found. Run npm run build first.');
const completed: string[] = [];
const viewports = [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }];

test.beforeAll(() => {
  rmSync('qa', { recursive: true, force: true });
  mkdirSync('qa/screenshots', { recursive: true });
  mkdirSync('qa/pdf', { recursive: true });
});

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${viewport.name}: ${route}`, async ({ page, request }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', (response) => {
        if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
          errors.push(`${response.status()} ${response.url()}`);
        }
      });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(route, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('h1').first()).toBeVisible();
      for (const chart of await page.locator('.chart').all()) {
        await expect(chart).toHaveAttribute('data-chart-ready', 'true');
        await expect(chart.locator('svg')).toBeVisible();
      }
      const brokenImages = await page.locator('img').evaluateAll((images) => (images as HTMLImageElement[]).filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
      expect(brokenImages, 'Images must load').toEqual([]);
      const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(overflow.content, 'Page must not overflow horizontally').toBeLessThanOrEqual(overflow.viewport + 1);
      const links = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
      for (const href of new Set(links)) {
        const url = new URL(href);
        if (url.origin !== 'http://127.0.0.1:4173') continue;
        expect(url.pathname.startsWith(`${base}/`) || url.pathname === base, `Base path: ${href}`).toBeTruthy();
        const result = await request.get(url.href);
        expect(result.status(), `Local link: ${href}`).toBe(200);
        if (url.hash) {
          const target = decodeURIComponent(url.hash.slice(1));
          if (url.pathname === new URL(page.url()).pathname) {
            expect(await page.evaluate((id) => !!document.getElementById(id) || !!document.getElementsByName(id).length, target), `Anchor: ${href}`).toBeTruthy();
          } else {
            const content = await result.text();
            // Prerendered target anchors must exist in the returned HTML.
            expect(content.includes(`id="${target}"`) || content.includes(`name="${target}"`), `Cross-page anchor: ${href}`).toBeTruthy();
          }
        }
      }
      const slug = route.slice(base.length).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
      await page.screenshot({ path: `qa/screenshots/${slug}-${viewport.name}.png`, fullPage: true, animations: 'disabled' });
      if (viewport.name === 'desktop') {
        await page.emulateMedia({ media: 'print' });
        for (const control of await page.locator('.no-print').all()) await expect(control).toBeHidden();
        await page.pdf({ path: `qa/pdf/${slug}.pdf`, format: 'Letter', tagged: true, printBackground: true, preferCSSPageSize: true });
      }
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('h1').first()).toBeVisible();
      const activeAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
      expect(activeAnimations, 'Reduced motion must stop ongoing animations').toBe(0);
      expect(errors, 'Browser and resource errors').toEqual([]);
      completed.push(`${route}:${viewport.name}`);
    });
  }
}

test.afterAll(() => {
  writeFileSync('qa/candidate.json', JSON.stringify({
    schemaVersion: 1,
    sourceFingerprint: fingerprintSource(),
    buildFingerprint: fingerprintDirectory('build'),
    routes,
    viewports,
    completed,
    expectedChecks: routes.length * viewports.length,
    passed: completed.length === routes.length * viewports.length,
    humanVisualReview: 'required',
  }, null, 2) + '\n');
});
