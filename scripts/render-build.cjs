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
const sitemapNamespace = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedSitemapHost = "https://themorn-ai.web.app/";

if (
  sitemap.charCodeAt(0) === 0xfeff ||
  !sitemap.startsWith(`<urlset ${sitemapNamespace}>`) ||
  !sitemap.trimEnd().endsWith("</urlset>") ||
  !sitemap.includes("<url>") ||
  !sitemap.includes("</url>") ||
  sitemapLocations.length === 0 ||
  sitemapLocations.some((url) => !url.startsWith(expectedSitemapHost))
) {
  console.error("Build verification failed: dist/sitemap.xml is not a valid MornAI sitemap. It must start with <urlset>, end with </urlset>, and contain absolute https://themorn-ai.web.app/ URLs.");
  process.exit(1);
}
console.log(`Verified sitemap.xml (${sitemapLocations.length} URLs) and robots.txt are present in dist/`);
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);