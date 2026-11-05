const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const maxOldSpace = process.env.NODE_OPTIONS?.match(/--max-old-space-size=\\S+/)?.[0] || "--max-old-space-size=384";
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

for (const file of ["sitemap.xml", "robots.txt"]) {
  const outputPath = "dist/" + file;
  if (!fs.existsSync(outputPath)) {
    console.error("Build verification failed: " + outputPath + " is missing. Ensure public/" + file + " exists so Vite copies it into dist.");
    process.exit(1);
  }
}

const sitemapPath = "dist/sitemap.xml";
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const declaration = '<?xml version="1.0" encoding="UTF-8"?>';
if (
  sitemap.charCodeAt(0) === 0xfeff ||
  !sitemap.startsWith(declaration + "\\n") ||
  sitemap.includes("xml-stylesheet") ||
  /<!DOCTYPE/i.test(sitemap)
) {
  console.error("Build verification failed: sitemap.xml must be plain UTF-8 XML with the XML declaration as its first bytes and no stylesheet or DOCTYPE.");
  process.exit(1);
}

const namespace = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const expectedUrls = [
  "https://themorn-ai.web.app/",
  "https://themorn-ai.web.app/founders/",
  "https://themorn-ai.web.app/for-startup-founders/",
  "https://themorn-ai.web.app/freelancers/",
  "https://themorn-ai.web.app/for-skilled-contributors/",
  "https://themorn-ai.web.app/guides/build-your-startup-team/",
  "https://themorn-ai.web.app/guides/video-editors-startup-work/",
];

const openTag = "<urlset " + namespace + ">";
const bodyStart = sitemap.indexOf(openTag);
const bodyEnd = sitemap.lastIndexOf("</urlset>");
if (
  bodyStart < 0 ||
  bodyEnd < bodyStart ||
  sitemap.slice(bodyEnd + "</urlset>".length).trim() !== "" ||
  sitemap.slice(0, bodyStart).trim() !== declaration
) {
  console.error("Build verification failed: sitemap.xml must contain one urlset root with the standard sitemap namespace.");
  process.exit(1);
}

const xmlBody = sitemap.slice(bodyStart + openTag.length, bodyEnd);
const blocks = [...xmlBody.matchAll(/<url>([\\s\\S]*?)<\\/url>/g)].map((match) => match[1]);
const openCount = (xmlBody.match(/<url>/g) || []).length;
const closeCount = (xmlBody.match(/<\\/url>/g) || []).length;
if (!blocks.length || blocks.length !== openCount || blocks.length !== closeCount) {
  console.error("Build verification failed: sitemap.xml contains malformed or empty URL entries.");
  process.exit(1);
}

const entryPattern = /^\\s*<loc>([^<]+)<\\/loc>\\s*<changefreq>daily<\\/changefreq>\\s*<lastmod>(\\d{4}-\\d{2}-\\d{2})<\\/lastmod>\\s*$/;
const entries = blocks.map((block) => {
  const match = block.match(entryPattern);
  if (!match) {
    console.error("Build verification failed: every <url> must contain <loc>, <changefreq>daily</changefreq>, and <lastmod>YYYY-MM-DD</lastmod> in that order.");
    process.exit(1);
  }

  const lastmod = match[2];
  const parsedDate = new Date(lastmod + "T00:00:00Z");
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== lastmod) {
    console.error("Build verification failed: invalid lastmod date: " + lastmod);
    process.exit(1);
  }

  return { url: match[1].trim(), lastmod };
});

const urls = entries.map((entry) => entry.url);
if (new Set(urls).size !== urls.length) {
  console.error("Build verification failed: sitemap.xml contains duplicate URLs.");
  process.exit(1);
}

for (const url of urls) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    console.error("Build verification failed: sitemap.xml contains an invalid URL: " + url);
    process.exit(1);
  }

  if (parsed.origin !== "https://themorn-ai.web.app" || parsed.search || parsed.hash) {
    console.error("Build verification failed: sitemap.xml contains a URL outside the production origin or with query/fragment: " + url);
    process.exit(1);
  }
}

const sortedUrls = [...urls].sort();
const sortedExpectedUrls = [...expectedUrls].sort();
if (
  sortedUrls.length !== sortedExpectedUrls.length ||
  sortedUrls.some((url, index) => url !== sortedExpectedUrls[index])
) {
  console.error("Build verification failed: sitemap.xml does not contain the exact expected canonical URL set. Found: " + urls.join(", "));
  process.exit(1);
}

const robots = fs.readFileSync("dist/robots.txt", "utf8");
const sitemapDirectives = robots
  .split(/\\r?\\n/)
  .map((line) => line.trim())
  .filter((line) => /^Sitemap:/i.test(line));
if (
  sitemapDirectives.length !== 1 ||
  sitemapDirectives[0] !== "Sitemap: https://themorn-ai.web.app/sitemap.xml"
) {
  console.error("Build verification failed: robots.txt must advertise only https://themorn-ai.web.app/sitemap.xml.");
  process.exit(1);
}

console.log("Verified the plain XML sitemap (" + urls.length + " canonical URLs with daily changefreq and valid lastmod dates) and robots.txt.");
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);
