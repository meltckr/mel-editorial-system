# Mel editorial system

An editorial publishing system for Mel Tucker. SvelteKit prerenders static HTML; GitHub Actions checks each page at desktop and mobile sizes before a separately approved GitHub Pages release.

## Current state

The first page is an explicitly labeled design specimen. Client copy, fact-checking of that copy, and Mel's screenshot approval are pending. No deployment is authorized yet.

## Work locally

Use Node 22.22+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev
npm run check
npm run build
npx playwright install chromium
npm run qa
```

The local URL includes `/mel-editorial-system/`. QA runs the production preview at port 4173, discovers all built HTML routes, captures desktop and mobile screenshots, and writes print PDFs into `qa/`. Inspect every image and every PDF page. Passing browser checks alone does not constitute visual approval. See `release/README.md` for release gates.

## One visual language

`src/styles/tokens.css` owns type, colors, spacing and reading measure. Tailwind utilities consume the same theme. `src/app.css` contains editorial layout and Letter print rules. Fonts are system Georgia and Arial; there are no external font requests, tracking scripts, icon packs or decorative imagery.

`src/lib/components/EvidenceChart.svelte` demonstrates Observable Plot, responsive width, exact value labels, a zero origin, an accessible data table and a no-JavaScript fallback. The demonstration data are synthetic and labeled. Replace or omit this figure according to the actual article's needs.

Motion provides one restrained entrance treatment, respects reduced-motion preferences, and leaves all content visible before JavaScript loads. The page is static HTML with progressive enhancement.

## Content and verification

`src/lib/content/edition.json` records title, sections and client readiness. The current route is a specimen; replacing JSON alone does not finish a client piece. Edit the article composition, deck, references, metadata and chart together. Record claim-by-claim source checks, dates, and unresolved claims in the edition's source ledger. Visible numbered citations must point to the specific supporting source. A chart is optional; never invent data to fill a design.

## Publishing

Deploy only after client content is complete and Mel has approved the exact desktop/mobile screenshots. Preserve the evidence and approved source fingerprint. Deployment is manual, guarded by the release manifest and the protected `github-pages` environment; it never runs merely because main changes. GitHub Pages is public. Repository code may be public, but confidential drafts must remain local until public publication is authorized.

## Foundation

Based on The Pudding's open-source Svelte starter. See `PROVENANCE.md` and the retained MIT `LICENSE`. No Pudding licensed fonts or logos are included.
