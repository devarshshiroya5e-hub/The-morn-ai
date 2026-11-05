import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://themorn-ai.web.app";
const publicDir = path.join(root, "public");
const sitemap = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
const robots = fs.readFileSync(path.join(publicDir, "robots.txt"), "utf8");

const expectedUrls = [
  siteOrigin + "/",
  siteOrigin + "/founders/",
  siteOrigin + "/for-startup-founders/",
  siteOrigin + "/freelancers/",
  siteOrigin + "/for-skilled-contributors/",
  siteOrigin + "/guides/build-your-startup-team/",
  siteOrigin + "/guides/video-editors-startup-work/",
];

function extractEntries(xml) {
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);

  return blocks.map((block) => {
    const match = block.match(
      /^\s*<loc>([^<]+)<\/loc>\s*<changefreq>daily<\/changefreq>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*$/
    );

    assert.ok(
      match,
      "each <url> must contain <loc>, <changefreq>daily</changefreq>, and <lastmod>YYYY-MM-DD</lastmod> in that order"
    );

    return {
      loc: match[1].trim(),
      changefreq: "daily",
      lastmod: match[2],
    };
  });
}

function assertExactValues(actual, expected, label) {
  assert.equal(new Set(actual).size, actual.length, label + " must not contain duplicates");
  assert.deepEqual([...actual].sort(), [...expected].sort(), label + " must contain the expected values");
}

const entries = extractEntries(sitemap);
const sitemapUrls = entries.map((entry) => entry.loc);

test("sitemap.xml uses the requested plain XML structure", () => {
  assert.ok(
    sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'),
    "XML declaration must be the first content"
  );
  assert.doesNotMatch(sitemap, /xml-stylesheet|<!DOCTYPE/i, "sitemap must not depend on an XSL transform or DTD");
  assert.match(
    sitemap,
    /<urlset\s+xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']>/
  );
  assert.match(sitemap.trimEnd(), /<\/urlset>$/);
  assertExactValues(sitemapUrls, expectedUrls, "sitemap");
});

test("every URL has daily changefreq and a valid lastmod date", () => {
  for (const entry of entries) {
    assert.equal(entry.changefreq, "daily");
    const parsedDate = new Date(entry.lastmod + "T00:00:00Z");
    assert.ok(
      !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === entry.lastmod,
      "invalid lastmod date: " + entry.lastmod
    );
  }
});

test("all sitemap URLs are absolute HTTPS URLs on the canonical production host", () => {
  for (const value of sitemapUrls) {
    const url = new URL(value);
    assert.equal(url.origin, siteOrigin, "unexpected sitemap origin: " + value);
    assert.equal(url.search, "", "sitemap URL must not contain a query string: " + value);
    assert.equal(url.hash, "", "sitemap URL must not contain a fragment: " + value);
  }
});

test("every sitemap URL maps to a public page with a matching canonical URL", () => {
  for (const value of sitemapUrls) {
    const pathname = new URL(value).pathname;
    const relativePage = pathname === "/"
      ? "index.html"
      : path.join(pathname.replace(/^\/+|\/+$/g, ""), "index.html");
    const pagePath = pathname === "/"
      ? path.join(root, "index.html")
      : path.join(publicDir, relativePage);

    assert.ok(fs.existsSync(pagePath), "missing static page for " + value + ": " + relativePage);
    const html = fs.readFileSync(pagePath, "utf8");
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];

    assert.ok(canonical, "missing canonical URL in " + relativePage);
    assert.equal(canonical, value, "canonical does not match sitemap URL for " + relativePage);
    assert.match(
      html,
      /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i,
      "missing meta description in " + relativePage
    );
  }
});

test("robots.txt advertises exactly one sitemap at the canonical root URL", () => {
  const directives = robots
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^Sitemap:/i.test(line));

  assert.deepEqual(directives, ["Sitemap: " + siteOrigin + "/sitemap.xml"]);
  assert.match(robots, /^User-agent: \*\s*\r?\nAllow: \/$/m);
});
