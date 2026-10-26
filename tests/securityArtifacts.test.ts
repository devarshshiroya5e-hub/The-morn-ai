import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "server.ts"), "utf8");
const firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const storageRules = fs.readFileSync(path.join(root, "storage.rules"), "utf8");
const aiClient = fs.readFileSync(path.join(root, "src", "lib", "mornaiAi.ts"), "utf8");

test("AI API requires a Firebase bearer token and sends it from the client", () => {
  assert.match(server, /app\.use\("\/api\/ai",\s*requireFirebaseAuth\)/);
  assert.match(server, /identitytoolkit\.googleapis\.com\/v1\/accounts:lookup/);
  assert.match(server, /req\.headers\.authorization/);
  assert.match(aiClient, /Authorization\s*=\s*`Bearer \$\{idToken\}`/);
});

test("website code generation is rate-limited per signed-in account", () => {
  assert.match(server, /createRateLimiter\(2,\s*4 \* 60_000/);
  assert.match(server, /res\.locals\.authenticatedUser\?\.uid/);
});

test("Firestore keeps collaboration participant lists immutable on updates", () => {
  assert.match(firestoreRules, /request\.resource\.data\.participants == resource\.data\.participants/);
  assert.match(firestoreRules, /request\.resource\.data\.founderId == resource\.data\.founderId/);
  assert.match(firestoreRules, /request\.resource\.data\.callerId == resource\.data\.callerId/);
});

test("Storage uploads are limited to supported raster images and ten megabytes", () => {
  assert.match(storageRules, /request\.resource\.size <= 10 \* 1024 \* 1024/);
  assert.match(storageRules, /contentType\.matches\('image\/\(png\|jpeg\|webp\)'\)/);
});
