# Private review and release gate

Each new edition starts with a blocked manifest. No push, pull request or successful QA run publishes the site. Publishing requires manually running `Publish approved candidate` and passing a protected `github-pages` environment.

## Local validation

1. Run `npm ci`, `npm run check`, `npm run build`, and `npx playwright install chromium`.
2. Run `npm run qa`. The suite discovers every prerendered HTML file in `build/`, excluding `404.html`; each route gets full-page screenshots at 1280 × 900 and 390 × 844. Chromium also exports each page as a US Letter PDF using print media and the page's print CSS.
3. Inspect `qa/screenshots/`, `qa/pdf/`, and `qa/candidate.json`. Tests check browser errors, failed local resources, image loading, horizontal overflow, and local links and anchors. `playwright-report/` contains failure diagnostics. `node --test tests/release-check.test.mjs` verifies the release gate itself.

Capture does not establish visual quality or human approval. Every screenshot and PDF must be visually inspected, check typography, hierarchy, clipping, page breaks and factual copy, and record the findings. Automated checks cannot certify those judgments or the truth of client content.

## Candidate review

Client content lives in the JSON file identified by `release/manifest.json`, initially `src/lib/content/edition.json`. A client edition needs a nonempty title, at least one section with a nonempty title and body, and `clientReady: true` after content verification. A design specimen may instead use `kind: "design-proof"` with `clientReady: false` and an explicitly approved `publicationScope: "design-proof"` in the manifest. This scope cannot authorize client content. The mechanical gate checks completeness; Mel and the editor own factual and client readiness decisions.

The QA report records SHA-256 fingerprints of the source tree and built files. All source files contribute, including workflow, tests, configuration and lockfiles. Exclusions are generated/dependency directories, `.git`, `.DS_Store`, and the release manifest itself. The manifest is excluded so recording review evidence does not invalidate the reviewed source. A source or build change requires fresh QA and human review.

After visual inspection and Mel's publication approval, record the report's source/build fingerprints, reviewer, date, HTTPS review evidence and HTTPS approval-record reference in the manifest; clear its blockers and set its status to `ready`. The approval reference can be a stable issue or review record where Mel subsequently records the exact final commit approval. The manifest records evidence; setting it to ready does not itself authorize publication.

## GitHub Pages publication

1. A repository administrator must configure Pages to use GitHub Actions and the `github-pages` environment with required human reviewers and **administrator bypass disabled**. Self-review may remain allowed so Mel can authorize a run dispatched from his account. The QA candidate must come from the `main` branch. The workflow inspects that configuration through the API and fails if missing or inaccessible. GitHub plan or token restrictions may require administrator intervention; the workflow never removes this gate.
2. Commit the reviewed source and completed manifest. Run `Editorial QA` on that exact final commit. Download its artifacts and inspect the final screenshots and PDFs. A manifest-only commit preserves the reviewed source fingerprint. Confirm the new report's source and build fingerprints still match the manifest.
3. Obtain Mel's explicit publication approval for the reviewed candidate, and bind that approval to the complete 40-character commit SHA and the named successful QA run. Record it at the manifest's approval reference. If anything changed in the source or build, repeat review before proceeding.
4. Manually dispatch `Publish approved candidate` with that SHA, the exact successful QA run ID, and the approval reference. The gate requires a successful same-repository push or manual `Editorial QA` run for the exact SHA, then downloads that run's `reviewed-candidate-<sha>` artifact. It validates the source, client content, screenshots/PDF existence and exact build fingerprints. It does not rebuild the site.
5. A required environment reviewer checks the approval record, exact commit/run, screenshot and PDF review evidence, and then approves the deployment job. Only that job has Pages write and OIDC permissions.

The gate cannot determine whether the prose at an HTTPS evidence URL actually authorizes publication. The protected environment reviewer must verify that substance. Required reviewers are an external repository setting. The github-pages environment was configured and verified on September 19, 2026: meltckr review required, administrator bypass disabled, deployments restricted to main. Deployment status is recorded in GitHub Actions.

## Artifact contract

- `visual-qa-<sha>`: screenshots, PDFs, QA report, Playwright report and available failure traces.
- `reviewed-candidate-<sha>`: successful `build/` plus `qa/`, kept together for exact-artifact deployment.
- Artifacts expire after 30 days. If expired, generate and review a new candidate run.
- Screenshot output is `qa/screenshots/`; print output is `qa/pdf/`.

Reference: [Playwright screenshots and PDF API](https://playwright.dev/docs/api/class-page), [GitHub Actions artifacts](https://docs.github.com/en/rest/actions/artifacts), [GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
