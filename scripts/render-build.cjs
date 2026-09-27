const { spawnSync } = require("node:child_process");

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
run("esbuild", [
  "server.ts",
  "--bundle",
  "--platform=node",
  "--format=cjs",
  "--packages=external",
  "--sourcemap",
  "--outfile=dist/server.cjs",
]);