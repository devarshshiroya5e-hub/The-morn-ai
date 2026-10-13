import test from "node:test";
import assert from "node:assert/strict";
import {
  WEBSITE_GENERATION_CLIENT_TIMEOUT_MS,
  WEBSITE_GENERATION_MAX_TOKENS,
  WEBSITE_GENERATION_MODEL,
  WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS,
} from "../src/lib/websiteGenerationPolicy";

test("Website Studio uses a free coding model and bounded output budget", () => {
  assert.equal(WEBSITE_GENERATION_MODEL, "cohere/north-mini-code:free");
  assert.ok(WEBSITE_GENERATION_MAX_TOKENS <= 4_000);
});

test("browser timeout gives the server time to return a provider timeout error", () => {
  assert.ok(WEBSITE_GENERATION_CLIENT_TIMEOUT_MS > WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS);
  assert.ok(WEBSITE_GENERATION_CLIENT_TIMEOUT_MS - WEBSITE_GENERATION_PROVIDER_TIMEOUT_MS >= 15_000);
});
