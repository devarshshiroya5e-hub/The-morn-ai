import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "server.ts"), "utf8");
const firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const storageRules = fs.readFileSync(path.join(root, "storage.rules"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "src", "lib", "mornaiAi.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json"), "utf8"));

test("AI API requires a Firebase bearer token and sends it from the client", () => {
  assert.match(server, /app\.use\("\/api\/ai",\s*requireFirebaseAuth\)/);
  assert.match(server, /identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/);
  assert.match(server, /getFirebaseWebApiKey/);
  assert.match(server, /themorn-ai\.firebaseapp\.com\/__\/firebase\/init\.json/);
  assert.match(server, /req\.headers\.authorization/);
  assert.match(aiClient, /Authorization\s*=\s*`Bearer \$\{idToken\}`/);
});

test("website code generation is rate-limited per signed-in account", () => {
  assert.match(server, /createRateLimiter\(2,\s*4 \* 60_000/);
  assert.match(server, /res\.locals\.authenticatedUser\?\.uid/);
});

test("Firebase Firestore uses the patched gRPC dependency in a single lockfile location", () => {
  assert.equal(packageJson.overrides?.["@firebase/firestore"]?.["@grpc/grpc-js"], "1.14.6");
  const grpcVersions = Object.entries(packageLock.packages ?? {})
    .filter(([packagePath]) => packagePath.endsWith("node_modules/@grpc/grpc-js"))
    .map(([, metadata]) => (metadata as { version?: string }).version);
  assert.deepEqual(grpcVersions, ["1.14.6"]);
});

test("Firestore keeps collaboration participant lists immutable on updates", () => {
  assert.match(firestoreRules, /request\.resource\.data\.participants == resource\.data\.participants/);
  assert.match(firestoreRules, /request\.resource\.data\.founderId == resource\.data\.founderId/);
  assert.match(firestoreRules, /request\.resource\.data\.callerId == resource\.data\.callerId/);
  assert.match(firestoreRules, /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['status'\]\)/);
  assert.match(firestoreRules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(firestoreRules, /request\.resource\.data\.senderId == request\.auth\.uid/);
  assert.match(firestoreRules, /resource\.data\.roomType != 'startup'[\s\S]*?isMember\(resource\.data\.startupId\)/);
  assert.match(firestoreRules, /request\.resource\.data\.createdBy == request\.auth\.uid[\s\S]*?startupExists\(request\.resource\.data\.startupId\)/);
});

test("Storage uploads are limited to supported raster images and ten megabytes", () => {
  assert.match(storageRules, /request\.resource\.size <= 10 \* 1024 \* 1024/);
  assert.match(storageRules, /contentType\.matches\('image\/\(png\|jpeg\|webp\)'\)/);
});


const firebaseConfig = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const firebaseDeployWorkflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "firebase-deploy.yml"),
  "utf8",
);
const postDeploySmokeWorkflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "post-deploy-smoke.yml"),
  "utf8",
);

test("Firebase Hosting applies a one-year HSTS policy", () => {
  const globalHeaders = firebaseConfig.hosting.headers.find(
    (entry: { source: string }) => entry.source === "**",
  )?.headers ?? [];
  const hsts = globalHeaders.find(
    (header: { key: string }) => header.key.toLowerCase() === "strict-transport-security",
  );

  assert.equal(hsts?.value, "max-age=31536000");
});

test("Storage rules are wired and restrict uploads to the startup founder", () => {
  assert.equal(firebaseConfig.storage?.rules, "storage.rules");
  assert.match(storageRules, /request\.auth != null/);
  assert.match(storageRules, /data\.founderId == request\.auth\.uid/);
  assert.match(storageRules, /request\.resource\.size <= 10 \* 1024 \* 1024/);
  assert.match(storageRules, /contentType\.matches\('image\/\(png\|jpeg\|webp\)'\)/);
});

test("Storage deployment errors fail before Hosting and Firestore deploy", () => {
  const storageStepStart = firebaseDeployWorkflow.indexOf("- name: Deploy Storage rules");
  const hostingStepStart = firebaseDeployWorkflow.indexOf("- name: Deploy Hosting and Firestore");
  assert.ok(storageStepStart >= 0, "Storage deployment step must exist");
  assert.ok(hostingStepStart > storageStepStart, "Storage rules must deploy before Hosting and Firestore");
  const storageStep = firebaseDeployWorkflow.slice(storageStepStart, hostingStepStart);
  assert.match(storageStep, /::error::/);
  assert.match(storageStep, /exit "\$result"/);
  assert.doesNotMatch(storageStep, /::warning::/);
});

test("live smoke checks run after failed deploy attempts and verify HSTS", () => {
  assert.match(postDeploySmokeWorkflow, /types:\s*\[completed\]/);
  assert.doesNotMatch(
    postDeploySmokeWorkflow,
    /if:\s*\$\{\{[^}]*workflow_run\.conclusion\s*==\s*'success'/,
  );
  assert.match(postDeploySmokeWorkflow, /strict-transport-security/);
});
