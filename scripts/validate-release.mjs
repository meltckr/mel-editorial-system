import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ignored = new Set(['.git', 'node_modules', '.svelte-kit', 'build', 'qa', 'test-results', 'playwright-report', '.DS_Store']);
/** @param {string} root @param {string} [relative] @param {boolean} [source] @returns {string[]} */
function listFiles(root, relative = '', source = false) {
  return readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if ((source && ignored.has(entry.name)) || (source && name === 'release/manifest.json')) return [];
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are unsupported in release fingerprints: ${name}`);
    return entry.isDirectory() ? listFiles(root, name, source) : [name];
  }).sort();
}
/** @param {string} root @param {boolean} source */
function fingerprint(root, source) {
  const hash = createHash('sha256');
  for (const name of listFiles(root, '', source)) {
    const bytes = readFileSync(path.join(root, name));
    hash.update(`${name}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}
export function fingerprintSource(root = process.cwd()) { return fingerprint(root, true); }
/** @param {string} root */
export function fingerprintDirectory(root) { return fingerprint(root, false); }
/** @param {unknown} value @param {string} name */
function requiredText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} must be nonempty.`);
  return value.trim();
}
/** @param {unknown} value @param {string} name */
function evidence(value, name) {
  const text = requiredText(value, name);
  if (!/^https:\/\//.test(text)) throw new Error(`${name} must be an HTTPS reference to the human review or approval record.`);
}

/** @param {{root?: string, build?: string, qa?: string, approvedCommit?: string, approvalEvidence?: string}} [options] */
export function validateRelease({ root = process.cwd(), build = 'build', qa = 'qa/candidate.json', approvedCommit, approvalEvidence } = {}) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'release/manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || manifest.status !== 'ready') throw new Error('Release is blocked: manifest status must be ready after human review.');
  if (!Array.isArray(manifest.blockers) || manifest.blockers.length) throw new Error('Release has unresolved blockers.');
  const contentFile = requiredText(manifest.contentFile, 'contentFile');
  if (path.isAbsolute(contentFile) || contentFile.split(/[\\/]/).includes('..')) throw new Error('contentFile must remain inside the repository.');
  const content = JSON.parse(readFileSync(path.join(root, contentFile), 'utf8'));
  if (content.clientReady !== true) throw new Error('Client content must explicitly be marked clientReady.');
  requiredText(content.title, 'Content title');
  if (!Array.isArray(content.sections) || !content.sections.length) throw new Error('Client sections must be supplied.');
  for (const [index, section] of content.sections.entries()) {
    requiredText(section.title, `Section ${index + 1} title`);
    requiredText(section.body, `Section ${index + 1} body`);
  }
  const sourceFingerprint = fingerprintSource(root);
  const buildFingerprint = fingerprintDirectory(path.resolve(root, build));
  if (manifest.reviewedSourceFingerprint !== sourceFingerprint) throw new Error('Source tree changed since review. Refresh QA and obtain a new review.');
  if (manifest.reviewedBuildFingerprint !== buildFingerprint) throw new Error('Build differs from the human-reviewed build.');
  const candidate = JSON.parse(readFileSync(path.resolve(root, qa), 'utf8'));
  if (candidate.sourceFingerprint !== sourceFingerprint || candidate.buildFingerprint !== buildFingerprint) throw new Error('QA evidence does not match this source tree and build.');
  if (candidate.passed !== true || !candidate.routes?.length || candidate.completed?.length !== candidate.expectedChecks || candidate.expectedChecks !== candidate.routes.length * 2) throw new Error('Every route must pass both viewport checks.');
  const expected = candidate.routes.flatMap((/** @type {string} */ route) => [`${route}:desktop`, `${route}:mobile`]);
  if (new Set(candidate.routes).size !== candidate.routes.length || new Set(candidate.completed).size !== expected.length || !expected.every((/** @type {string} */ check) => candidate.completed.includes(check))) throw new Error('Every route needs distinct desktop and mobile results.');
  if (JSON.stringify(candidate.viewports) !== JSON.stringify([{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }])) throw new Error('QA viewports must match the required desktop and mobile sizes.');
  for (const route of candidate.routes) {
    const slug = route.slice('/mel-editorial-system'.length).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';
    const qaRoot = path.dirname(path.resolve(root, qa));
    for (const file of [`screenshots/${slug}-desktop.png`, `screenshots/${slug}-mobile.png`, `pdf/${slug}.pdf`]) {
      if (statSync(path.join(qaRoot, file)).size === 0) throw new Error(`Missing QA artifact: ${file}`);
    }
  }
  requiredText(manifest.visualReview?.reviewer, 'Visual reviewer');
  const reviewedAt = requiredText(manifest.visualReview?.reviewedAt, 'Visual review date');
  if (!Number.isFinite(Date.parse(reviewedAt))) throw new Error('Visual review date must be valid.');
  evidence(manifest.visualReview?.evidence, 'Visual review evidence');
  evidence(manifest.approvalEvidence, 'Approval evidence');
  if (approvedCommit && !/^[a-f0-9]{40}$/.test(approvedCommit)) throw new Error('Approved commit must be a complete 40-character SHA.');
  if (approvalEvidence && approvalEvidence !== manifest.approvalEvidence) throw new Error('Dispatch approval reference differs from the release manifest.');
  return { sourceFingerprint, buildFingerprint, approvedCommit: approvedCommit ?? null };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--fingerprint')) {
      console.log(fingerprintSource());
    } else {
      const result = validateRelease({
        build: process.env.CANDIDATE_BUILD || 'build',
        qa: process.env.CANDIDATE_QA || 'qa/candidate.json',
        approvedCommit: process.env.APPROVED_COMMIT,
        approvalEvidence: process.env.APPROVAL_EVIDENCE,
      });
      console.log(`Release checks passed: ${JSON.stringify(result)}`);
      console.log('Human review and authorization are established by the linked records and protected environment; this script cannot judge their substance.');
    }
  } catch (error) {
    console.error(`RELEASE BLOCKED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
