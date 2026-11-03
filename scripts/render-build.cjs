const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const maxOldSpace = process.env.NODE_OPTIONS?.match(/--max-old-space-size=\S+/)?.[0] || "--max-old-space-size=384";
const env = {
  ...process.env,
  NODE_OPTIONS: maxOldSpace,
};

function run(command, args) {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("vite", ["build"]);

const crawlerFiles = [
  "sitemap.xml",
  "sitemap_index.xml",
  "page-sitemap.xml",
  "guide-sitemap.xml",
  "sitemap-style.xsl",
  "robots.txt",
];

for (const file of crawlerFiles) {
  const outputPath = "dist/" + file;
  if (!fs.existsSync(outputPath)) {
    console.error("Build verification failed: " + outputPath + " is missing. Ensure public/" + file + " exists so Vite copies it into dist.");
    process.exit(1);
  }
}

function readSitemap(file) {
  const raw = fs.readFileSync("dist/" + file, "utf8");
  const withoutBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const body = withoutBom
    .replace(/^\s*<\?xml[^?]*\?>\s*/i, "")
    .replace(/^\s*<\?xml-stylesheet[^?]*\?>\s*/i, "")
    .trim();
  if (!/^\s*<\?xml\s+version=/i.test(withoutBom) ||
      !/^\s*<\?xml[^?]*\?>\s*<\?xml-stylesheet[^?]*\?>/i.test(withoutBom) ||
      !raw.includes('href="/sitemap-style.xsl"')) {
    console.error("Build verification failed: " + file + " must start with an XML declaration and reference /sitemap-style.xsl.");
    process.exit(1);
  }
  return body;
}

const namespace = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const expectedPages = [
  "https://themorn-ai.web.app/",
  "https://themorn-ai.web.app/for-startup-founders/",
  "https://themorn-ai.web.app/for-skilled-contributors/",
];
const expectedGuides = [
  "https://themorn-ai.web.app/guides/build-your-startup-team/",
  "https://themorn-ai.web.app/guides/video-editors-startup-work/",
];
const expectedSitemaps = [
  "https://themorn-ai.web.app/page-sitemap.xml",
  "https://themorn-ai.web.app/guide-sitemap.xml",
];

function extractUrlEntries(xmlBody, file) {
  if (!xmlBody.startsWith("<urlset " + namespace + ">") || !xmlBody.endsWith("</urlset>")) {
    console.error("Build verification failed: " + file + " must have a valid urlset root and closing tag.");
    process.exit(1);
  }
  const entries = [...xmlBody.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<\/url>/g)].map(match => match[1]);
  const openCount = (xmlBody.match(/<url>/g) || []).length;
  const closeCount = (xmlBody.match(/<\/url>/g) || []).length;
  if (!entries.length || entries.length !== openCount || entries.length !== closeCount) {
    console.error("Build verification failed: " + file + " contains a malformed or empty URL list.");
    process.exit(1);
  }
  if (new Set(entries).size !== entries.length || entries.some(url => !url.startsWith("https://themorn-ai.web.app/"))) {
    console.error("Build verification failed: " + file + " contains duplicate URLs or a URL outside the production host.");
    process.exit(1);
  }
  return entries;
}

function assertExactUrls(file, actual, expected) {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  if (sortedActual.length !== sortedExpected.length ||
      sortedActual.some((url, index) => url !== sortedExpected[index])) {
    console.error("Build verification failed: " + file + " does not contain the exact expected canonical URL set. Found: " + actual.join(", "));
    process.exit(1);
  }
}

const indexBody = readSitemap("sitemap_index.xml");
if (!indexBody.startsWith("<sitemapindex " + namespace + ">") || !indexBody.endsWith("</sitemapindex>")) {
  console.error("Build verification failed: sitemap_index.xml must have a sitemapindex root.");
  process.exit(1);
}
const sitemapRefs = [...indexBody.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>\s*<\/sitemap>/g)].map(match => match[1]);
const sitemapOpenCount = (indexBody.match(/<sitemap>/g) || []).length;
const sitemapCloseCount = (indexBody.match(/<\/sitemap>/g) || []).length;
if (sitemapRefs.length !== sitemapOpenCount || sitemapRefs.length !== sitemapCloseCount) {
  console.error("Build verification failed: sitemap_index.xml contains malformed sitemap entries.");
  process.exit(1);
}
assertExactUrls("sitemap_index.xml", sitemapRefs, expectedSitemaps);

const pages = extractUrlEntries(readSitemap("page-sitemap.xml"), "page-sitemap.xml");
const guides = extractUrlEntries(readSitemap("guide-sitemap.xml"), "guide-sitemap.xml");
assertExactUrls("page-sitemap.xml", pages, expectedPages);
assertExactUrls("guide-sitemap.xml", guides, expectedGuides);
const allUrls = [...pages, ...guides];
const legacy = extractUrlEntries(readSitemap("sitemap.xml"), "sitemap.xml");
assertExactUrls("sitemap.xml (legacy compatibility)", legacy, allUrls);

const robots = fs.readFileSync("dist/robots.txt", "utf8");
if (!/^Sitemap:\s*https:\/\/themorn-ai\.web\.app\/sitemap_index\.xml\s*$/im.test(robots)) {
  console.error("Build verification failed: robots.txt must point to https://themorn-ai.web.app/sitemap_index.xml.");
  process.exit(1);
}

console.log("Verified sitemap index (2 child sitemaps), page sitemap (" + pages.length + " URLs), guide sitemap (" + guides.length + " URLs), legacy sitemap, stylesheet, and robots.txt.");
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);
