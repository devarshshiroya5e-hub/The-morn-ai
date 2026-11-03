import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://themorn-ai.web.app";
const publicDir = path.join(root, "public");
const sitemapIndex = fs.readFileSync(path.join(publicDir, "sitemap_index.xml"), "utf8");
const pageSitemap = fs.readFileSync(path.join(publicDir, "page-sitemap.xml"), "utf8");
const guideSitemap = fs.readFileSync(path.join(publicDir, "guide-sitemap.xml"), "utf8");
const legacySitemap = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
const robots = fs.readFileSync(path.join(publicDir, "robots.txt"), "utf8");
const stylesheet = fs.readFileSync(path.join(publicDir, "sitemap-style.xsl"), "utf8");

const expectedSitemaps = [
  siteOrigin + "/page-sitemap.xml",
  siteOrigin + "/guide-sitemap.xml",
];
const expectedPageUrls = [
  siteOrigin + "/",
  siteOrigin + "/for-startup-founders/",
  siteOrigin + "/for-skilled-contributors/",
];
const expectedGuideUrls = [
  siteOrigin + "/guides/build-your-startup-team/",
  siteOrigin + "/guides/video-editors-startup-work/",
];

function extractLocs(xml, tagName) {
  return [...xml.matchAll(new RegExp("<" + tagName + ">\\s*<loc>([^<]+)</loc>\\s*</" + tagName + ">", "g"))]
    .map((match) => match[1].trim());
}

function assertExactValues(actual, expected, label) {
  assert.equal(new Set(actual).size, actual.length, label + " must not contain duplicates");
  assert.deepEqual([...actual].sort(), [...expected].sort(), label + " must contain the expected values");
}

const pageUrls = extractLocs(pageSitemap, "url");
const guideUrls = extractLocs(guideSitemap, "url");
const legacyUrls = extractLocs(legacySitemap, "url");
const indexSitemaps = extractLocs(sitemapIndex, "sitemap");
const allChildUrls = [...pageUrls, ...guideUrls];

test("sitemap index references the page and guide sitemaps on the production origin", () => {
  assert.match(sitemapIndex, /<sitemapindex\s+xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']>/);
  assertExactValues(indexSitemaps, expectedSitemaps, "sitemap index");
  assert.ok(fs.existsSync(path.join(publicDir, "page-sitemap.xml")), "page sitemap must exist");
  assert.ok(fs.existsSync(path.join(publicDir, "guide-sitemap.xml")), "guide sitemap must exist");
});

test("page and guide sitemaps contain unique absolute HTTPS canonical URLs", () => {
  assert.match(pageSitemap, /<urlset\s+xmlns=/);
  assert.match(guideSitemap, /<urlset\s+xmlns=/);
  assertExactValues(pageUrls, expectedPageUrls, "page sitemap");
  assertExactValues(guideUrls, expectedGuideUrls, "guide sitemap");

  for (const url of allChildUrls) {
    assert.ok(url.startsWith(siteOrigin + "/"), "unexpected sitemap origin: " + url);
    assert.match(url, /^https:\/\//, "sitemap URL must use HTTPS: " + url);
    assert.ok(!/[?#]/.test(url), "sitemap URL should not include query strings or fragments: " + url);
  }
});

test("each indexed sitemap URL resolves to a static page with a matching canonical URL", () => {
  for (const url of allChildUrls) {
    const pathname = new URL(url).pathname;
    const relativePage = pathname === "/"
      ? "index.html"
      : path.join(pathname.replace(/^\/+|\/+$/g, ""), "index.html");
    const pagePath = pathname === "/"
      ? path.join(root, "index.html")
      : path.join(publicDir, relativePage);

    assert.ok(fs.existsSync(pagePath), "missing static page for " + url + ": " + relativePage);
    const html = fs.readFileSync(pagePath, "utf8");
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];

    assert.ok(canonical, "missing canonical URL in " + relativePage);
    assert.equal(canonical, url, "canonical does not match sitemap URL for " + relativePage);
    assert.match(html, /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i, "missing meta description in " + relativePage);
  }
});

test("legacy sitemap.xml remains a valid direct sitemap with the same URLs", () => {
  assert.match(legacySitemap, /<urlset\s+xmlns=/);
  assertExactValues(legacyUrls, allChildUrls, "legacy sitemap");
});

test("all sitemap XML files use the shared browser stylesheet", () => {
  for (const xml of [sitemapIndex, pageSitemap, guideSitemap, legacySitemap]) {
    assert.match(xml, /^<\?xml version=["']1\.0["'] encoding=["']UTF-8["']\?>\s*<\?xml-stylesheet type=["']text\/xsl["'] href=["']\/sitemap-style\.xsl["']\?>/);
  }
  assert.match(stylesheet, /<xsl:stylesheet\s+/);
  assert.match(stylesheet, /sitemapindex/);
  assert.match(stylesheet, /urlset/);
});

test("robots.txt advertises the sitemap index at the same site origin", () => {
  assert.ok(
    robots.split(/\r?\n/).some((line) => line.trim() === "Sitemap: " + siteOrigin + "/sitemap_index.xml"),
    "robots.txt must advertise sitemap_index.xml",
  );
});
