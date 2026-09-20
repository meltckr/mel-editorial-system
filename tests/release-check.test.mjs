import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprintSource, fingerprintDirectory, validateRelease } from '../scripts/validate-release.mjs';

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'editorial-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['release', 'src/lib/content', 'build', 'qa/screenshots', 'qa/pdf']) mkdirSync(path.join(root, dir), { recursive: true });
  writeFileSync(path.join(root, 'src/lib/content/edition.json'), JSON.stringify({ clientReady: true, title: 'Reviewed edition', sections: [{ title: 'Finding', body: 'Verified supplied content.' }] }));
  writeFileSync(path.join(root, 'build/index.html'), '<h1>Reviewed edition</h1>');
  for (const file of ['screenshots/home-desktop.png', 'screenshots/home-mobile.png', 'pdf/home.pdf']) writeFileSync(path.join(root, 'qa', file), 'test fixture');
  const sourceFingerprint = fingerprintSource(root);
  const buildFingerprint = fingerprintDirectory(path.join(root, 'build'));
  writeFileSync(path.join(root, 'qa/candidate.json'), JSON.stringify({ sourceFingerprint, buildFingerprint, routes: ['/mel-editorial-system/'], viewports: [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }], completed: ['/mel-editorial-system/:desktop', '/mel-editorial-system/:mobile'], expectedChecks: 2, passed: true }));
  const manifest = { schemaVersion: 1, status: 'ready', contentFile: 'src/lib/content/edition.json', reviewedSourceFingerprint: sourceFingerprint, reviewedBuildFingerprint: buildFingerprint, blockers: [], visualReview: { reviewer: 'Human reviewer', reviewedAt: '2026-09-20T00:00:00Z', evidence: 'https://example.com/review' }, approvalEvidence: 'https://example.com/approval' };
  const save = () => writeFileSync(path.join(root, 'release/manifest.json'), JSON.stringify(manifest));
  save();
  return { root, manifest, save };
}
test('a complete matching reviewed fixture passes the mechanical gate', (t) => {
  const { root } = fixture(t);
  assert.match(validateRelease({ root }).sourceFingerprint, /^[a-f0-9]{64}$/);
});
test('default blocked state fails closed', (t) => {
  const { root, manifest, save } = fixture(t);
  manifest.status = 'blocked'; save();
  assert.throws(() => validateRelease({ root }), /Release is blocked/);
});
test('source edits invalidate review', (t) => {
  const { root } = fixture(t);
  writeFileSync(path.join(root, 'src/new-copy.txt'), 'Changed content');
  assert.throws(() => validateRelease({ root }), /Source tree changed/);
});
test('build edits invalidate review', (t) => {
  const { root } = fixture(t);
  writeFileSync(path.join(root, 'build/index.html'), '<h1>Different edition</h1>');
  assert.throws(() => validateRelease({ root }), /Build differs/);
});
test('client content cannot be empty or unready', (t) => {
  const { root } = fixture(t);
  writeFileSync(path.join(root, 'src/lib/content/edition.json'), JSON.stringify({ clientReady: false, title: '', sections: [] }));
  assert.throws(() => validateRelease({ root }), /clientReady/);
});
test('incomplete viewport checks cannot release', (t) => {
  const { root } = fixture(t);
  const file = path.join(root, 'qa/candidate.json');
  const candidate = JSON.parse(readFileSync(file)); candidate.completed.pop();
  writeFileSync(file, JSON.stringify(candidate));
  assert.throws(() => validateRelease({ root }), /Every route/);
});
test('missing screenshots cannot release', (t) => {
  const { root } = fixture(t);
  rmSync(path.join(root, 'qa/screenshots/home-mobile.png'));
  assert.throws(() => validateRelease({ root }), /ENOENT/);
});
test('dispatch evidence must match manifest', (t) => {
  const { root } = fixture(t);
  assert.throws(() => validateRelease({ root, approvalEvidence: 'https://example.com/different' }), /Dispatch approval reference differs/);
});

test('duplicated results cannot substitute for mobile QA', (t) => {
  const { root } = fixture(t);
  const file = path.join(root, 'qa/candidate.json');
  const candidate = JSON.parse(readFileSync(file)); candidate.completed[1] = candidate.completed[0];
  writeFileSync(file, JSON.stringify(candidate));
  assert.throws(() => validateRelease({ root }), /distinct desktop and mobile/);
});
