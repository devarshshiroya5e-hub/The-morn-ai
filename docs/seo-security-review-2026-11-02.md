# MornAI SEO and Security Review — 2026-11-02

## Scope and evidence boundary

Reviewed repository `devarshshiroya5e-hub/The-morn-ai` at main commit `112a0d9a8b86d349e4cd903b7cbdbec660ee06f1`, Firebase Hosting configuration, static SEO pages, GitHub Actions definitions and run logs, Firestore and Storage rules, API middleware, client Firebase initialization, dependency audit output, and the connected Search Console property `https://themorn-ai.web.app/`.

This is a source/configuration review plus the latest available automated live-smoke evidence. It is not a penetration test. The latest successful live smoke run was 2026-10-30; a fresh direct HTTP check was not possible during this review. Firebase/GCP IAM, the deployed Storage ruleset, Firebase App Check enforcement toggles, and Search Console's full Page Indexing / URL Inspection reports are not exposed by the available evidence. Do not treat repository configuration as proof that those console-side settings are active.

## Executive summary

- **Firebase Hosting and Firestore deployment:** the 2026-10-30 deployment completed successfully. The deployment log confirms Hosting release and Firestore rules/index deployment.
- **Storage rules deployment:** **not verified and not deployed by that run**. The Storage step received HTTP 403, `firebasestorage.defaultBucket.get` denied. The workflow converted this known permission failure into a warning and kept the overall deployment green. The deployed bucket rules may therefore differ from `storage.rules`.
- **SEO crawl artifacts:** the repository contains a valid five-URL sitemap, permissive crawlable `robots.txt`, static HTML for all sitemap URLs, and matching canonical URLs/descriptions. The 2026-10-30 live smoke test fetched and parsed all five pages successfully.
- **Search Console:** the connected property returned only 8 Search Analytics rows for the last 28 days (2026-10-24 through 2026-10-31): 10 impressions, 0 clicks, all for the homepage. The Sitemaps table returned an empty record (`path=null`, `submitted=0`, `last_downloaded=null`, `last_submitted=null`). This is **not enough evidence to confirm sitemap submission, download, or URL indexing**.
- **Dependencies and CI:** the latest main CI run (2026-10-30) reported 0 npm audit vulnerabilities across all severities, passed 42 tests, and completed lint and production build.

## Priority findings

### P1 — Firebase Storage rules deployment is blocked by IAM

Evidence:
- `firebase.json` points Storage deployment at `storage.rules`.
- The 2026-10-30 Firebase deploy run `41093189875` successfully released Hosting and Firestore rules/indexes.
- The Storage deployment then failed with HTTP 403: `Permission 'firebasestorage.defaultBucket.get' denied`.
- The workflow emitted a warning and continued, so the overall deployment job still reported success.
- The post-deploy smoke workflow does not currently inspect the deployed Storage ruleset.

Repository Storage policy (intended policy, not proof of deployed policy):
- Authenticated users can read files under `/startups/{startupId}/`.
- Writes require the startup founder's UID.
- Uploads are limited to PNG/JPEG/WebP and 10 MB.
- Deletes require the startup founder.

Required action:
1. In Google Cloud IAM / Firebase Console, confirm the default Storage bucket exists and the Storage API is enabled.
2. Grant the deployment service account the least-privilege permissions needed to read the default bucket and deploy Storage rules. Do not grant broad Project Owner merely to bypass the error.
3. Rerun the deploy workflow and retain successful Storage-rule deployment output as evidence.
4. Verify the effective rules in Firebase Console or with an authorized ruleset inspection. Until then, treat Storage policy as unverified.

### P2 — Search Console does not provide a confirmed sitemap submission/download record

Repository evidence:
- `public/robots.txt` allows crawling and advertises `https://themorn-ai.web.app/sitemap.xml`.
- `public/sitemap.xml` contains five unique HTTPS URLs: homepage, founder landing page, contributor landing page, and two guides.
- `scripts/render-build.cjs` validates the five expected URLs and the sitemap reference.
- `tests/seoArtifacts.test.ts` checks that each sitemap URL maps to a static HTML page with a matching canonical and meta description.
- The 2026-10-30 live smoke test returned HTTP 200 for `robots.txt`, `sitemap.xml`, and all five pages; it parsed the XML and checked each page's title, description, canonical, H1, and JSON-LD.

Search Console connector snapshot on 2026-11-02:
- Search Analytics: 8 rows, 10 total impressions, 0 clicks, all rows attributed to `https://themorn-ai.web.app/`.
- Returned queries were mostly branded (`mornai`, `morn ai`), plus one `site:web.app` row.
- Sitemaps table returned `path=null`, `submitted=0`, `last_downloaded=null`, and `last_submitted=null`. The connector's `indexed` field is deprecated, and this empty row is not a reliable URL-indexing count.

Required action:
1. In the exact URL-prefix property `https://themorn-ai.web.app/`, submit `https://themorn-ai.web.app/sitemap.xml`.
2. Open the sitemap report and confirm a non-empty sitemap path, successful fetch time, and discovered URL count.
3. Use URL Inspection for the homepage, both audience pages, and both guides. Record Google's selected canonical and indexing status for each.
4. Do not assume that a successful HTTP fetch means Google indexed a page; monitor Page Indexing and Search Performance separately.

### P2 — App Check is conditional in the client and is not enforced by the Render API code

Evidence:
- `src/lib/firebase.ts` initializes Firebase App Check only when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is present.
- The browser API client sends a Firebase Auth ID token in the `Authorization: Bearer` header.
- `server.ts` validates Firebase Auth ID tokens for `/api/ai`, but no App Check token is forwarded or verified by the Render API middleware.
- The repository cannot establish whether App Check enforcement is enabled for Firestore or Storage in Firebase Console.

Required action:
1. Confirm the reCAPTCHA Enterprise site key is configured in the production frontend build and that App Check metrics show legitimate traffic.
2. Enable enforcement for Firestore and Storage only after confirming all production clients obtain valid App Check tokens.
3. If App Check is required for Render AI endpoints, explicitly send the App Check token from the client and verify it server-side (for example with Firebase Admin App Check verification). Do not treat CORS as API authentication.

### P2 — Rate limiting is process-local

Evidence:
- `/api/ai` is limited to 40 requests per minute per IP.
- Website generation is additionally limited to 2 requests per authenticated UID per 4 minutes.
- Buckets are stored in an in-memory `Map`; the code itself notes that a shared store is needed for multi-instance enforcement.

This is a useful single-instance abuse control, not a distributed quota. Before running multiple Render instances or facing material abuse, move counters to a shared atomic store and add per-user limits to expensive AI routes.

### P2 — Owner-writable user documents have no field allowlist

Evidence:
- `/users/{userId}` and `/users/{userId}/preferences/{preferenceId}` allow the authenticated owner full read/create/update/delete.
- No field-level restrictions are applied at the rule boundary.

No current privilege-escalation path was confirmed in this review. However, do not store trusted authorization, billing, moderation, or entitlement flags in fields the client can freely write. Move trusted fields to server-controlled documents or add strict field allowlists before introducing such flags.

### P3 — Two older audience landing pages remain independently canonical

The repository also contains `/founders/` and `/freelancers/`, each with its own self-canonical, while the sitemap uses `/for-startup-founders/` and `/for-skilled-contributors/`. The older pages target similar audiences but have different copy. They are not in the sitemap, but could still be discovered through links or external references.

Decide whether the older routes should remain separate pages, be redirected, or canonicalize to the newer pages. Do not change this automatically until internal links and any existing backlinks are checked.

### P3 — Firestore index drift

The 2026-10-30 deploy reported one index configured in the Firebase project that is absent from `firestore.indexes.json`. Firebase did not delete it. Compare the live index with the repository definition and either add it to source control or deliberately remove it after confirming no query depends on it.

## Verified controls

- Firestore rules use a final deny-all catch-all.
- Collaboration and video-call documents generally bind reads/writes to authenticated participants; participant identities are immutable on sensitive updates.
- Storage source rules constrain founder uploads to supported image formats and a 10 MB maximum (deployment remains unverified).
- API CORS uses explicit origins, ignores wildcard configuration, and allows only the required request headers.
- `/api/ai` requires a Firebase Auth bearer token. The 2026-10-30 Render smoke test confirmed health/CORS, Firebase public config, and HTTP 401 for an unauthenticated AI status request.
- Express JSON bodies are capped at 64 KB.
- Firebase Hosting already sets COOP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.

## Changes in this pull request

- Add `Strict-Transport-Security: max-age=31536000` to the global Firebase Hosting headers. This enables HSTS for the Firebase Hosting origin without asserting `includeSubDomains` or preload.
- Extend the post-deploy Hosting smoke test to require the HSTS header.
- Add a unit test for the HSTS configuration and a stronger check that the Storage rules file is wired and retains its founder-only upload constraint.
- Add this evidence-based review so the unresolved console/IAM actions are tracked explicitly.

No deployment, Search Console submission, URL indexing request, Firebase IAM change, App Check enforcement change, or production data mutation was performed by this review.
