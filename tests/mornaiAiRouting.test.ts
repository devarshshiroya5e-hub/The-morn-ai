import test from "node:test";
import assert from "node:assert/strict";
import { getMornAIApiBases, isGeneratedWebsitePayload, looksLikeHtmlResponse, requiresLiveMornAIResponse } from "../src/lib/mornaiAiRouting";

test("production requests do not fall through to a static frontend origin", () => {
  assert.deepEqual(getMornAIApiBases({
    origin: "https://mornai.example",
    configuredBase: "",
    pinnedBase: null,
    renderBase: "https://the-morn-ai.onrender.com",
    isLocal: false,
  }), ["https://the-morn-ai.onrender.com"]);
});

test("explicit API configuration is preferred and bases are deduplicated", () => {
  assert.deepEqual(getMornAIApiBases({
    origin: "https://mornai.example",
    configuredBase: "https://api.example/",
    pinnedBase: "https://api.example/",
    renderBase: "https://the-morn-ai.onrender.com/",
    isLocal: false,
  }), ["https://api.example", "https://the-morn-ai.onrender.com"]);
});

test("local development can target its same-origin Express/Vite server", () => {
  assert.deepEqual(getMornAIApiBases({
    origin: "http://localhost:3000/",
    configuredBase: "",
    pinnedBase: null,
    renderBase: "https://the-morn-ai.onrender.com",
    isLocal: true,
  }), ["http://localhost:3000", "https://the-morn-ai.onrender.com"]);
});

test("website generation endpoints never use local fallbacks", () => {
  assert.equal(requiresLiveMornAIResponse("website-generate"), true);
  assert.equal(requiresLiveMornAIResponse("website-blueprint"), true);
  assert.equal(requiresLiveMornAIResponse("co-founder-chat"), false);
});

test("recognizes HTML even when it has a byte-order mark or leading whitespace", () => {
  assert.equal(looksLikeHtmlResponse("text/html; charset=utf-8", "<!doctype html>"), true);
  assert.equal(looksLikeHtmlResponse("text/plain", "\uFEFF  <html>"), true);
  assert.equal(looksLikeHtmlResponse("application/json", '{"ok":true}'), false);
});

test("rejects outdated blueprint JSON when the code generator is expected", () => {
  assert.equal(isGeneratedWebsitePayload({ title: "Example", tagline: "Description", sections: [] }), false);
  assert.equal(isGeneratedWebsitePayload({ title: "Example", tagline: "Description", html: "<html></html>", css: "body{}", js: "" }), false);
  assert.equal(isGeneratedWebsitePayload({
    title: "Example", tagline: "Description",
    html: "<html>" + "x".repeat(600) + "</html>",
    css: "body{" + "x".repeat(350) + "}",
    js: "document.title='Example';",
  }), true);
});
