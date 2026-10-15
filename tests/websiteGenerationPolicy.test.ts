import test from "node:test";
import assert from "node:assert/strict";
import {
  WEBSITE_GENERATION_CLIENT_TIMEOUT_MS,
  WEBSITE_GENERATION_FALLBACK_TIMEOUT_MS,
  WEBSITE_GENERATION_MAX_TOKENS,
  WEBSITE_GENERATION_MODEL,
  WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS,
} from "../src/lib/websiteGenerationPolicy";

test("Website Studio uses NVIDIA Nemotron 3 Ultra free with a larger code output budget", () => {
  assert.equal(WEBSITE_GENERATION_MODEL, "nvidia/nemotron-3-ultra-550b-a55b:free");
  assert.ok(WEBSITE_GENERATION_MAX_TOKENS >= 6_000);
  assert.ok(WEBSITE_GENERATION_MAX_TOKENS <= 8_000);
});

test("browser timeout gives the server time to return a provider timeout error", () => {
  assert.ok(WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS >= 60_000);
  assert.ok(WEBSITE_GENERATION_FALLBACK_TIMEOUT_MS >= 30_000);
  assert.ok(WEBSITE_GENERATION_CLIENT_TIMEOUT_MS > WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS + WEBSITE_GENERATION_FALLBACK_TIMEOUT_MS);
  assert.ok(WEBSITE_GENERATION_CLIENT_TIMEOUT_MS - WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS - WEBSITE_GENERATION_FALLBACK_TIMEOUT_MS >= 10_000);
});
