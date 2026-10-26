import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://themorn-ai.web.app";
const sitemap = fs.readFileSync(path.join(root, "public", "sitemap.xml"), "utf8");
const robots = fs.readFileSync(path.join(root, "public", "robots.txt"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

test("sitemap contains unique absolute HTTPS URLs for the configured public site", () => {
  assert.ok(urls.length > 0, "sitemap must contain at least one URL");
  assert.equal(new Set(urls).size, urls.length, "sitemap URLs must be unique");

  for (const url of urls) {
    assert.ok(url.startsWith(siteOrigin + "/") || url === siteOrigin + "/", `unexpected sitemap origin: ${url}`);
    assert.match(url, /^https:\/\//, `sitemap URL must use HTTPS: ${url}`);
    assert.ok(!/[?#]/.test(url), `sitemap URL should not include query strings or fragments: ${url}`);
  }
});

test("each sitemap URL resolves to a static page with a matching canonical URL", () => {
  for (const url of urls) {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const relativePage = pathname === "/"
      ? "index.html"
      : path.join("public", pathname.replace(/^\/+|\/+$/g, ""), "index.html");
    const pagePath = path.join(root, relativePage);

    assert.ok(fs.existsSync(pagePath), `missing static page for ${url}: ${relativePage}`);
    const html = fs.readFileSync(pagePath, "utf8");
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];

    assert.ok(canonical, `missing canonical URL in ${relativePage}`);
    assert.equal(canonical, url, `canonical does not match sitemap URL for ${relativePage}`);
    assert.match(html, /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i, `missing meta description in ${relativePage}`);
  }
});

test("robots.txt advertises the sitemap at the same site origin", () => {
  assert.ok(
    robots.split(/\r?\n/).some((line) => line.trim() === `Sitemap: ${siteOrigin}/sitemap.xml`),
    "robots.txt must advertise the sitemap.xml URL",
  );
});
