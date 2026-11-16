# MornAI SEO and Security Review — 2026-11-16

## Evidence boundary

Repository: `devarshshiroya5e-hub/The-morn-ai`  
Default branch: `main`  
Main HEAD reviewed: `54682dbc70284cb4545b943f1484faba925c0ba3` (2026-11-05)  
Open remediation PR: [#34](https://github.com/devarshshiroya5e-hub/The-morn-ai/pull/34), branch `security/storage-deploy-fail-closed-2026-11-09`

This review combines repository inspection, GitHub Actions logs, and a connected Google Search Console data pull made on 2026-11-16. It is not a penetration test. Production Firebase IAM, effective Storage rules, App Check enforcement, and Google URL Inspection's per-URL selected canonical/indexing state were not available. Do not infer deployed state from source files.

Direct live HTTP retrieval from this review environment was unavailable (DNS resolution failed for `themorn-ai.web.app`). The latest successful live HTTP evidence is the GitHub post-deploy smoke run from 2026-11-05, not a fresh 2026-11-16 fetch.

## Executive status

- **Main CI:** 2026-11-05 run #809 passed 44 tests, lint, build, and npm audit (0 reported vulnerabilities).
- **PR #34 CI:** 2026-11-09 run #810 passed 48 tests, lint, build, and npm audit (0 reported vulnerabilities). This run predates the changes added in this review; CI must rerun on the new PR head.
- **Latest main deployment:** 2026-11-05 run #109 was marked successful, but its Storage rules step returned HTTP 403. The workflow converted that failure into a warning and exit code 0.
- **Latest live smoke:** 2026-11-05 run #51 passed all seven public-page, robots/sitemap, Hosting-header, API health/CORS and unauthenticated-AI checks.
- **Search Console:** latest 28-day page-level aggregate returned 3 clicks, 34 impressions, 8.82% CTR and average position 6.88 for the homepage only. The query-level extract is incomplete and shows only brand/domain queries.
- **Sitemap status:** the Search Console connector did not return a sitemap path or last-submitted/downloaded timestamp. Successful sitemap fetch in the GitHub smoke workflow does not establish Search Console processing or indexing.
- **Repository governance:** GitHub's main branch object reports `protected: false`; the repository rulesets endpoint returned an empty array.
- **Production status:** no deployment, IAM change, App Check enforcement change, sitemap submission, or indexing request was made by this review.

## Prioritized blockers

### P1 — Storage rules deployment is still blocked by IAM

Evidence:
- [Main deploy run #109](https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/41982953074), 2026-11-05.
- Firebase reported the Storage API was enabled, then failed while reading the default bucket:
  `HTTP 403 — Permission 'firebasestorage.defaultBucket.get' denied`.
- Hosting and Firestore rules/indexes deployed; Storage rules did not.
- The main workflow emitted a warning and exited successfully, so GitHub displayed a green deployment.

Repository Storage rules are only the intended policy, not proof of deployed rules:
- Any authenticated user can read objects below `/startups/{startupId}/`.
- Upload and delete are restricted to the startup founder.
- Uploads are limited to PNG/JPEG/WebP and 10 MB.

Risks:
- Production Storage rules may be stale; the effective rules were not inspected.
- Authenticated-read is cross-startup, not membership-scoped. If these objects are not intended to be visible to every signed-in account, restrict reads to startup members.

Required console action:
1. Confirm the default Storage bucket exists and is associated with `themorn-ai`.
2. Grant the deployment service account only the bucket-read and Storage rules deployment permissions it needs.
3. Rerun deployment and inspect the effective Storage rules in Firebase Console or an authorized ruleset inspection.

PR #34 changes deployment ordering so Storage rules must deploy before Hosting/Firestore. Any Storage failure now fails the deploy instead of producing a false-green release. This is a fail-closed guard; it does not repair IAM.

### P2 — Search Console does not confirm sitemap processing

Connected Search Console pull on 2026-11-16:
- Page-level last-28-day aggregate: homepage only, 3 clicks, 34 impressions, CTR 0.0882 (8.82%), average position 6.8824.
- Query-level extract: 17 rows, 25 impressions and 1 click. Visible query strings were `mornai`, `morn ai`, and `site:web.app`; no topical non-brand query was present in the returned rows.
- The connector's `branded_vs_nonbranded` field labelled the literal brand queries as non-branded, so that classification field is not reliable for this property.
- The page-level and query-level pulls return different totals; treat the query rows as a partial breakdown, not a complete reconciliation.
- Sitemaps table returned two records dated 2026-11-13 and 2026-11-14, but `path`, `last_submitted`, and `last_downloaded` were null; `submitted` and deprecated `indexed` fields were 0. Errors/warnings were 0.

Conclusion: the connector provides evidence of some homepage search visibility, but it does not confirm a submitted/downloaded sitemap or per-URL indexing. Null sitemap metadata is not conclusive proof that no sitemap was submitted.

Next action: inspect the Search Console Sitemaps report and URL Inspection directly for the exact property `https://themorn-ai.web.app/`. Verify the sitemap row and Google's selected canonical for all seven URLs.

### P2 — Main branch is not protected

Evidence:
- GitHub branch metadata for `main` returned `protected: false`.
- Repository rulesets endpoint returned `[]`.

Risk: direct pushes can bypass the pull-request CI gate.

Required action: add branch protection or a ruleset requiring PRs and successful CI; block force pushes and branch deletion. The classic branch-protection detail endpoint was not readable through this connection, so required-check configuration was not independently inspected.

### P2 — App Check is conditional and not enforced by evidence

Evidence:
- `src/lib/firebase.ts` initializes App Check only when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is present.
- The browser-to-Render AI client sends a Firebase Auth bearer token, not an App Check token.
- Render validates Firebase Auth for `/api/ai`, but no App Check token verification is present.
- Firebase Console enforcement settings and App Check metrics were not accessible.

Required action: verify the production site key and valid-token metrics first; then enforce App Check on Firestore/Storage only after client coverage is confirmed. Add server-side token verification separately if Render AI endpoints are intended to require App Check.

### P2 — Rate limits are per process, not shared

Evidence in `server.ts`:
- `/api/ai`: 40 requests/minute per IP.
- `/api/ai/website-generate`: 2 requests per authenticated UID per four minutes.
- Counters live in a JavaScript `Map`; the server sets `trust proxy = 1`.

The proxy setting makes Express use the forwarded client IP for the current single-proxy deployment assumption. The in-memory map does not share counters across multiple Render instances and resets on process restart. Use a shared atomic store before scaling or relying on the limits for cost control.

### P2 — Firestore user documents have no field allowlist

Evidence:
- `/users/{userId}` and `/users/{userId}/preferences/{preferenceId}` allow the owner full read/create/update/delete.
- Updates are not restricted to an explicit field allowlist.

No privilege-escalation exploit was confirmed. Keep trusted subscription, billing, moderation, and authorization state out of these client-writable documents, or add explicit field/type constraints after mapping all legitimate client writes.

### P2 — Content Security Policy is absent

Main `firebase.json` does not define CSP or CSP Report-Only. Do not add a restrictive policy blindly: Firebase Auth, Google sign-in, Google Fonts, inline JSON-LD and external AI/API endpoints require an origin inventory. Start with report-only, review violations, then enforce.

### P3 — Possible SPA soft-404 behavior is not yet measured

Firebase Hosting currently rewrites every unmatched path to `/index.html`. The seven known public URLs pass live smoke tests, but the existing smoke suite does not request a deliberately unknown URL. An unknown path may therefore return the SPA shell with HTTP 200 and become a soft-404 candidate.

This PR adds a non-blocking unknown-path probe. A 200 response emits a warning for investigation; it does not change Hosting routing or fail deployment.

### P3 — Legacy audience pages overlap newer landing pages

The sitemap includes both `/founders/` and `/for-startup-founders/`, and both `/freelancers/` and `/for-skilled-contributors/`. Each is self-canonical. This is not a canonical mismatch, but the pages target similar intent.

No redirect/canonical consolidation was made because page-level Search Console and backlink evidence for the legacy URLs is insufficient. Compare query impressions and backlinks before removing either URL.

### P3 — One Firestore index exists outside source control

The 2026-11-05 deployment log says one index exists in the Firebase project but is absent from `firestore.indexes.json`. The CLI did not delete it. Inspect the live index and queries, then either add it to source control or remove it only after proving it is unused.

## SEO and crawlability

Repository files:
- `public/robots.txt` allows crawling and advertises `https://themorn-ai.web.app/sitemap.xml`.
- `public/sitemap.xml` is a standard XML `urlset`, not a sitemap index, with seven unique HTTPS URLs on the canonical host.
- Each entry uses `changefreq=daily` and `lastmod=2026-10-26`. The lastmod values match the verified page modification dates recorded by the 2026-11-05 sitemap commit; do not advance them just to make the sitemap appear fresh.
- The 2026-11-05 live smoke fetched all seven URLs with HTTP 200 and checked title, description, self-canonical, H1 and JSON-LD.
- robots.txt and sitemap.xml passed HTTP/content/XML checks in that same run.

This is technical crawlability evidence from 2026-11-05, not proof of Google indexing. Direct current live fetch was unavailable on 2026-11-16.

## API and Firebase security

- Firebase Auth bearer-token validation protects `/api/ai`; the server uses Firebase Identity Toolkit `accounts:lookup` and caches validated UID results for two minutes.
- The browser client sends the Firebase ID token in the Authorization header.
- CORS is an explicit allowlist; wildcard entries are ignored. CORS is not authentication.
- JSON request body limit is 64 KB.
- Latest 2026-11-05 Render smoke returned HTTP 200 for health, allowed the production origin, and returned HTTP 401 for unauthenticated AI status.
- This PR extends smoke checks to CORS preflight and verifies that an unlisted origin receives no `Access-Control-Allow-Origin` header.
- Firestore rules compiled and deployed on 2026-11-05 and end with a deny-all catch-all.
- Storage rules source restricts founder writes, but production rule deployment remains blocked/unverified.
- App Check enforcement remains unknown.
- Main Hosting headers include COOP, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy. HSTS is absent on main; PR #34 adds `max-age=31536000`. CSP remains absent.

## Dependencies and CI

- Main CI run #809 (2026-11-05): 44 tests passed, lint/build passed, npm audit reported 0 vulnerabilities.
- PR #34 CI run #810 (2026-11-09): 48 tests passed, lint/build passed, npm audit reported 0 vulnerabilities across all severities.
- Updated PR #34 head CI run #811 (2026-11-16): 49 tests passed, lint/build passed, npm audit reported 0 vulnerabilities across all severities.
- These are dated snapshots; rerun CI after any further dependency or code changes before merge.
- Logs include deprecation warnings for Node's `punycode`, legacy `url.parse()` use in tooling, and GitHub Actions' Node 20 runtime transition. No vulnerability was reported by npm audit in the recorded run.

## Changes added to PR #34 in this review

1. Correct the smoke-test message: the file is a `urlset`, not a sitemap index.
2. Assert the live `robots.txt` Content-Type is `text/plain`.
3. Probe a deliberately unknown URL and warn if the SPA fallback returns HTTP 200, without changing production routing.
4. Test allowed-origin CORS preflight and ensure an unlisted origin receives no CORS allow-origin header.
5. Add a regression test covering these smoke-test assertions.

No production deployment, Firebase IAM mutation, App Check enforcement change, Search Console sitemap submission, indexing request, or production data mutation was performed.
