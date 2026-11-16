# MornAI SEO and Security Review — 2026-11-09

## Evidence boundary

Repository: `devarshshiroya5e-hub/The-morn-ai`  
Default branch at review: `main`  
Main commit reviewed: `54682dbc70284cb4545b943f1484faba925c0ba3` (2026-11-05)

This is a source/configuration review plus the latest available GitHub Actions live-smoke evidence. It is not a penetration test. No Firebase/GCP IAM, effective Storage ruleset, Firebase App Check enforcement, or fresh Google Search Console Page Indexing/URL Inspection data was available to verify in this run. Do not infer deployed state from repository files.

## Executive summary

- **GitHub CI:** latest main CI on 2026-11-05 passed 44 tests, TypeScript lint, production build, and `npm audit` (0 vulnerabilities).
- **Firebase deploy:** the 2026-11-05 deploy released Hosting and Firestore rules/indexes, but Storage rules deployment returned HTTP 403 (`firebasestorage.defaultBucket.get` denied). The workflow downgraded this to a warning and reported overall success. This is a false-green deployment status.
- **Post-deploy smoke:** the 2026-11-05 smoke run passed all seven sitemap page checks, robots/sitemap validation, existing Hosting headers, Render API health/CORS, and unauthenticated AI API rejection.
- **SEO:** robots.txt and the seven-URL XML sitemap are valid. All seven pages returned HTTP 200 in the latest smoke run and had titles, descriptions, self-canonicals and required structured data.
- **Search Console:** no fresh Search Console read was available in this run. The previous 2026-11-02 report recorded 10 impressions, 0 clicks and no confirmed sitemap download/submission row; treat that as a historical snapshot, not current status.
- **Security:** Firestore has a final deny-all rule; API Auth/CORS controls are present; rate limiting is process-local; App Check initialization is conditional and not integrated with the Render API; CSP is absent; main has no branch protection/rulesets.

## Prioritized findings

### P1 — Storage rules deployment failure is hidden by a green deploy

Evidence:
- Latest deploy workflow run: https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/41982953074
- At 2026-11-05 06:49 UTC, Firebase Hosting and Firestore deployment completed.
- The Storage step then failed with HTTP 403: `Permission 'firebasestorage.defaultBucket.get' denied`.
- The workflow emitted a warning and exited 0, so GitHub marked the deployment successful.
- The 2026-11-05 post-deploy smoke run therefore verifies Hosting/API behavior, not the deployed Storage rules: https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/41983018606

Repository Storage rules (intended policy, not deployed-state proof):
- Any authenticated user can read objects under `/startups/{startupId}/`.
- Uploads and deletes require the startup founder.
- Uploads are restricted to PNG/JPEG/WebP and 10 MB.

Risk:
- Storage rules may be stale or absent in production.
- The broad authenticated-read rule exposes every object under the startup path to every signed-in account. Confirm these objects are intentionally readable by all authenticated users; otherwise scope reads to startup members.

Required console action:
1. Confirm the default Storage bucket exists and the Firebase Storage API is enabled.
2. Grant the deployment identity only the required bucket-read and Storage rules deployment permissions.
3. Rerun deployment and verify the effective rules in Firebase Console or an authorized ruleset inspection.

PR changes:
- Storage rules deploy before Hosting/Firestore and any Storage failure now fails the deployment instead of being converted to a warning.
- Live smoke tests run after every completed deploy attempt, including a failed/partial attempt, so the actual production state is still checked.

### P2 — Main branch is unprotected

Evidence:
- GitHub branch API returned `protected: false` for `main`.
- Repository rulesets endpoint returned an empty list.

Risk:
- Direct pushes can bypass the pull-request CI gate.
- No required status checks or review requirement is enforced by repository rulesets.

Required action:
- Enable branch protection or a repository ruleset for `main`.
- Require the CI workflow to pass before merge; block force pushes and deletion.
- Require pull requests for changes to deployment/security configuration.

### P2 — App Check is conditional and not verified as enforced

Evidence:
- `src/lib/firebase.ts` initializes App Check only when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set.
- The browser-to-Render request path in `src/lib/mornaiAi.ts` sends a Firebase Auth bearer token; no App Check token is sent to the Render API.
- Server middleware validates Firebase Auth for `/api/ai`, but does not verify App Check.
- Firebase Console enforcement state for Firestore and Storage was not accessible.

Required action:
- Confirm the production site key is configured and App Check metrics show valid production traffic.
- Enable Firestore/Storage enforcement only after validating all deployed clients.
- If Render AI endpoints require App Check, send and verify App Check tokens server-side.

### P2 — API rate limiting is per-process

Evidence in `server.ts`:
- `/api/ai`: 40 requests/minute per IP.
- Website generation: 2 requests per authenticated UID per four minutes.
- Counters are held in an in-memory `Map`.

This is useful on one instance but does not provide a shared quota across multiple Render instances. Move counters to an atomic shared store before scaling or relying on these limits for cost protection.

### P2 — Firestore user documents have no field allowlist

Evidence:
- `/users/{userId}` and `/users/{userId}/preferences/{preferenceId}` allow the owner full read/create/update/delete.
- The rules do not constrain field names or field types.

No privilege-escalation exploit was confirmed. Do not store trusted plan, billing, moderation, or authorization fields in these client-writable documents; use server-controlled fields/documents or explicit field allowlists.

### P2 — Content Security Policy is absent

The Firebase Hosting global headers do not define `Content-Security-Policy` or `Content-Security-Policy-Report-Only`. A strict policy should not be added blindly: the app uses Firebase, Google sign-in, Google Fonts, inline JSON-LD and external AI APIs. Start with a report-only policy after inventorying all required origins.

### P3 — Duplicate-intent audience pages

The sitemap contains both:
- `/founders/` and `/for-startup-founders/`
- `/freelancers/` and `/for-skilled-contributors/`

Each URL has a self-canonical and the content is similar in intent but not identical. This is not a canonical mismatch; it is a potential duplicate-intent/cannibalization issue. Check Search Console page/query data and backlinks before redirecting or canonicalizing the older routes.

### P3 — Firestore index drift

The 2026-11-05 deploy log reported one index in the Firebase project that is not present in `firestore.indexes.json`. The CLI did not delete it. Compare the live index with source control and either add it to the repository or remove it only after confirming no query depends on it.

## SEO and crawlability

### Verified in source and latest live smoke

- `public/robots.txt` allows crawling and advertises `https://themorn-ai.web.app/sitemap.xml`.
- `public/sitemap.xml` is plain XML with seven unique HTTPS URLs on the canonical host.
- Sitemap `lastmod` dates are 2026-10-26, matching the verified page modification dates recorded in the 2026-11-05 sitemap commit; they should not be advanced merely to make the sitemap look fresh.
- The live smoke run on 2026-11-05 fetched all seven pages successfully and checked title, meta description, canonical, H1 and JSON-LD.
- The sitemap URLs are the homepage, two legacy audience pages, two newer audience pages, and two guides.

This verifies technical crawlability at the time of the smoke run, not Google indexing or ranking.

### Search Console evidence limitation

The previous report captured a Search Console snapshot on 2026-11-02:
- 10 impressions and 0 clicks in the available Search Analytics rows.
- Rows were attributed to the homepage.
- Sitemaps data had no confirmed path/submission/download timestamp.

That snapshot is historical and incomplete. No fresh Search Console connector/read was available on 2026-11-09. Current indexed URL counts, sitemap fetch status, and Google's selected canonicals remain unverified.

## API and Firebase security controls

- `/api/ai` requires a Firebase Auth bearer token; latest Render smoke returned HTTP 401 for an unauthenticated AI status request.
- CORS uses explicit allowed origins; wildcard values are ignored. CORS is not authentication.
- JSON request bodies are capped at 64 KB.
- API rate limits are in-memory and per instance.
- Firestore rules compile successfully in the 2026-11-05 deployment and end with a deny-all catch-all.
- Collaboration/chat/video-call rules generally bind access to participants and protect immutable identity fields.
- Storage source rules restrict founder writes but are not confirmed deployed.
- App Check state in Firebase Console remains unknown.
- Existing Hosting headers include COOP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy. HSTS was absent from main and is added by this PR.
- CSP remains absent pending a report-only rollout and origin inventory.

## Dependency and CI evidence

Latest main CI run: https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/41982953439
- `npm audit`: 0 vulnerabilities (info/low/moderate/high/critical).
- `npm test`: 44 passed, 0 failed.
- `npm run lint`: passed.
- `npm run build`: passed.

The result is specific to the 2026-11-05 commit and does not replace a fresh audit after dependency changes.

## Changes in this PR

1. Add `Strict-Transport-Security: max-age=31536000` to Firebase Hosting global headers (no `includeSubDomains` or preload).
2. Require Storage rules deployment to succeed before Hosting/Firestore deployment; known API/IAM failures are emitted as errors and fail the job.
3. Run live smoke tests after any completed deployment attempt, not only successful deploy jobs.
4. Extend live smoke tests to assert the HSTS response header.
5. Add tests for HSTS configuration, Storage rule wiring/constraints, fail-closed deployment order, and smoke-on-failure behavior.

No production deployment, Firebase IAM mutation, App Check enforcement change, Search Console submission, indexing request, or production data mutation was performed by this review.
