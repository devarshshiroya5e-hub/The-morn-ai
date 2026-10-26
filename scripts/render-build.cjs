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

// Fail the build if public crawler files are missing from Firebase Hosting output.
for (const file of ["sitemap.xml", "robots.txt"]) {
  const outputPath = `dist/${file}`;
  if (!fs.existsSync(outputPath)) {
    console.error(`Build verification failed: ${outputPath} is missing. Ensure public/${file} exists so Vite copies it into dist.`);
    process.exit(1);
  }
}
console.log("Verified sitemap.xml and robots.txt are present in dist/");
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);