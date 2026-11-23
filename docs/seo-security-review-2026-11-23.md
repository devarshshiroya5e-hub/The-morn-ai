# MornAI SEO and Security Review — 2026-11-23

## Scope and evidence boundary

Repository: `devarshshiroya5e-hub/The-morn-ai`  
Default branch reviewed: `main`  
Main HEAD: `41f4d7a4a087d9ea8695ca6b6962e1937a6fd4b7` (2026-11-19)  
Open prior remediation: [PR #34](https://github.com/devarshshiroya5e-hub/The-morn-ai/pull/34), based on an older main commit and now diverged.

This is a source/configuration and GitHub Actions review, not a penetration test. Search Console account data was not available through a connected Search Console tool in this run. No private GSC metrics, URL Inspection status, selected canonical, or sitemap processing status is asserted here.

## Verified current findings

### P1 — Canonical custom domain returned HTTP 404 in the latest migration verification

Latest relevant run: [#44493974092](https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/44493974092), 2026-11-19.

The manual legacy redirect workflow verified that both legacy Firebase hosts returned 301s for the tested paths to `https://mornai.work.gd`. It then failed when checking the canonical domain:

```
urllib.error.HTTPError: HTTP Error 404: Not Found
```

The first direct canonical request was `https://mornai.work.gd/`; the workflow stopped at that failure, so `/founders/` was not subsequently verified in that run.

This is a production availability/canonicalization blocker: the sitemap and canonical tags now point at `mornai.work.gd`, while the migration verification recorded the canonical homepage as 404. The failure may be caused by Firebase custom-domain/site association or DNS/Hosting configuration; repository source alone cannot determine which. Inspect Firebase Hosting custom-domain mapping and DNS before making further redirects.

### P1 — Storage rules deployment is still not effective

Latest Firebase deployment: [#44491883979](https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/44491883979), 2026-11-19.

Hosting and Firestore deployed, then Storage rules deployment failed:

```
HTTP 403
Permission 'firebasestorage.defaultBucket.get' denied
```

The Firebase CLI confirmed the Storage API is enabled. The error says permission denied on the default bucket (or it may not exist). The workflow currently catches this failure, emits a warning, exits 0, and reports deployment success.

Effective production Storage rules were not inspected. The source file is only the intended policy.

### P2 — Search Console sitemap/indexing state unavailable

No connected Search Console tool was available in this run, and public web search did not return a reliable page-indexing result. Therefore:
- Current GSC clicks/impressions/coverage are unknown.
- Sitemap submission/download/processing is unknown.
- Per-URL indexing and Google-selected canonical are unknown.

Do not infer indexed count from sitemap validity or search-result absence.

### P2 — Canonical hostname is not covered by the regular deployment smoke test

Latest regular live smoke: [#44491986996](https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/44491986996), 2026-11-19.

It passed:
- 7 sitemap URLs with valid XML and unique canonical-host URLs.
- 7 crawl pages on `https://mornai-primary.web.app`.
- Robots, sitemap stylesheet, title/description/canonical/H1/JSON-LD checks.
- Existing Hosting security-header checks.
- Render API health/CORS/auth smoke.

But this workflow fetches the primary Firebase `.web.app` host and checks canonical tag values; it did not request the custom canonical hostname itself. The separate migration workflow caught the 404. PR changes add a direct canonical-domain check to the regular smoke test so this cannot be hidden by the Firebase hostname passing.

### SEO source state

Current main `public/sitemap.xml` is a valid standard `urlset` containing seven absolute HTTPS URLs on `mornai.work.gd`. `public/robots.txt` allows crawling and advertises that sitemap.

The site is using a normal sitemap, not a sitemap index; seven URLs do not require an index.

The sitemap currently has daily `changefreq` and `lastmod` dates of 2026-11-18. Keep lastmod accurate to real content changes; neither daily frequency nor an updated date guarantees ranking or indexing.

There are overlapping audience pages:
- `/founders/` and `/for-startup-founders/`
- `/freelancers/` and `/for-skilled-contributors/`

They currently self-canonicalize. This is not itself a canonical syntax error, but duplicate search intent may dilute signals. Use GSC performance/backlink data before redirecting.

### Firebase Hosting headers

Current main `firebase.json` has:
- COOP `same-origin-allow-popups`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Permissions-Policy limiting camera/microphone and disabling geolocation.

HSTS is absent on main. CSP is also absent. PR adds HSTS `max-age=31536000`; this is not live until a verified deployment. CSP should be introduced in report-only mode after documenting Firebase Auth, Google sign-in, fonts and external API dependencies.

### API authentication, CORS and rate limiting

Source review of `server.ts`:
- `/api/ai` uses Firebase bearer-token validation via Identity Toolkit.
- Unauthenticated AI request returned HTTP 401 in the latest API smoke.
- CORS is an explicit allowlist; wildcard entries are filtered out.
- Allowed production origins include `mornai.work.gd` and Firebase app domains; configured origins are parsed to origins.
- JSON body limit is 64 KB.
- General AI limit: 40 requests/minute per IP/path.
- Website generation limit: 2 requests per authenticated UID per 4 minutes.
- `trust proxy = 1` is configured for the Render deployment.

Rate-limit counters use an in-process Map. They reset on restart and are not shared between instances; this is not distributed abuse protection. CORS is not authentication; bearer-token validation is the actual access control.

### Firestore and Storage rules

Firestore source has a default deny catch-all and membership/participant checks for collaboration resources. However, owner update/delete access to `/users/{userId}` and preferences is broad; trusted subscription, billing, moderation or authorization fields should be server-controlled or field-allowlisted.

Storage source currently allows any authenticated account to read files under any `/startups/{startupId}/` path. Upload/delete are founder-restricted; uploads are limited to 10 MB PNG/JPEG/WebP. Confirm whether cross-startup authenticated reads are intended; restrict to startup members if files can be private.

Firestore deployment log reports one live index not present in `firestore.indexes.json`; it was not deleted. Reconcile only after identifying the index and its query use.

### App Check

Frontend App Check initializes only when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is present. Render AI requests do not send App Check tokens, and the Render server does not validate them. Firebase Console enforcement/metrics were not accessible. Treat App Check enforcement as unverified, not disabled or enabled.

### Dependency and CI status

Latest main CI: [#44491884063](https://github.com/devarshshiroya5e-hub/The-morn-ai/actions/runs/44491884063), 2026-11-19:
- `npm audit`: 0 vulnerabilities (info/low/moderate/high/critical all 0).
- 49 tests passed, 0 failed.
- Lint passed.
- Production build passed.

Build warns that the Firebase vendor chunk is approximately 736 kB minified, above Vite's 500 kB warning threshold. This is a performance opportunity, not a build failure. Node `punycode` deprecation and GitHub Actions Node 20-to-24 runtime warnings also remain.

### GitHub branch protection

The GitHub branch metadata endpoint returned `protected: false` for `main` on 2026-11-23. The repository rulesets endpoint returned an empty array. The branch-protection details endpoint returned 403 `Resource not accessible by integration`, so no required-check rules could be inspected. This confirms that GitHub's branch object currently reports main as unprotected; configure required PR/CI protection in repository settings.

## Repository changes in refresh PR

The older PR #34 is 7 commits behind main and diverged (9 ahead, 7 behind); GitHub reports it non-mergeable. This refresh is based on current main HEAD.

Changes:
1. Add one-year HSTS to Firebase Hosting global headers.
2. Deploy Storage rules before Hosting/Firestore and fail on any Storage error, avoiding partial release and false-green CI.
3. Run the live smoke workflow after failed as well as successful deployment attempts.
4. Assert HSTS and request the canonical custom-domain homepage directly in the regular live smoke workflow.
5. Add source-level regression tests for these safeguards.

Expected effect until Storage IAM/default bucket is fixed: the deployment workflow will stop before releasing Hosting/Firestore. This is deliberate fail-closed behavior.

## Not performed

No Firebase deployment, IAM permission change, Storage rules deployment, App Check enforcement, Search Console sitemap submission, indexing request, or live production mutation was performed.
