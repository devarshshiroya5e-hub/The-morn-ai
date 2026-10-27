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

// Fail the build if crawler files are missing or the sitemap is malformed.
for (const file of ["sitemap.xml", "robots.txt"]) {
  const outputPath = `dist/${file}`;
  if (!fs.existsSync(outputPath)) {
    console.error(`Build verification failed: ${outputPath} is missing. Ensure public/${file} exists so Vite copies it into dist.`);
    process.exit(1);
  }
}

const sitemapPath = "dist/sitemap.xml";
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const sitemapWithoutBom = sitemap.charCodeAt(0) === 0xfeff ? sitemap.slice(1) : sitemap;
const sitemapBody = sitemapWithoutBom.replace(/^<\?xml[^?]*\?>\s*/i, "");
const sitemapNamespace = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const sitemapLocations = [...sitemapBody.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedSitemapHost = "https://themorn-ai.web.app/";
const expectedSitemapUrls = [
  "https://themorn-ai.web.app/",
  "https://themorn-ai.web.app/for-startup-founders/",
  "https://themorn-ai.web.app/for-skilled-contributors/",
  "https://themorn-ai.web.app/guides/build-your-startup-team/",
  "https://themorn-ai.web.app/guides/video-editors-startup-work/",
];
const normalizedSitemapUrls = [...sitemapLocations].sort();
const expectedNormalizedSitemapUrls = [...expectedSitemapUrls].sort();
const robots = fs.readFileSync("dist/robots.txt", "utf8");
const robotsPointsToSitemap = /^Sitemap:\s*https:\/\/themorn-ai\.web\.app\/sitemap\.xml\s*$/im.test(robots);

if (
  !sitemapBody.startsWith("<urlset " + sitemapNamespace + ">") ||
  !sitemapBody.trimEnd().endsWith("</urlset>") ||
  !sitemapBody.includes("<url>") ||
  !sitemapBody.includes("</url>") ||
  sitemapLocations.length !== expectedSitemapUrls.length ||
  new Set(sitemapLocations).size !== sitemapLocations.length ||
  sitemapLocations.some((url) => !url.startsWith(expectedSitemapHost)) ||
  normalizedSitemapUrls.some((url, index) => url !== expectedNormalizedSitemapUrls[index]) ||
  !robotsPointsToSitemap
) {
  console.error("Build verification failed: sitemap.xml must be valid XML, contain exactly the five canonical MornAI SEO URLs, and robots.txt must advertise this sitemap.");
  process.exit(1);
}
console.log("Verified sitemap.xml (" + sitemapLocations.length + " expected URLs) and robots.txt are present in dist/");
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);