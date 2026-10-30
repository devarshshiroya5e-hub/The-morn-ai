import test from "node:test";
import assert from "node:assert/strict";
import {
  GROQ_FAST_TEXT_MODEL,
  buildGroqChatCompletionBody,
  extractGroqChatCompletionText,
} from "../src/lib/groqAi";

test("Groq assistant payload selects GPT-OSS 20B with low hidden reasoning", () => {
  const body = buildGroqChatCompletionBody(
    [{ role: "user", content: "Give me one practical startup growth idea." }],
    { maxCompletionTokens: 420, temperature: 0.2 },
  );

  assert.equal(GROQ_FAST_TEXT_MODEL, "openai/gpt-oss-20b");
  assert.equal(body.model, "openai/gpt-oss-20b");
  assert.equal(body.max_completion_tokens, 420);
  assert.equal(body.reasoning_effort, "low");
  assert.equal(body.reasoning_format, "hidden");
  assert.equal("response_format" in body, false);
});

test("Groq writing assist enables JSON response mode when requested", () => {
  const body = buildGroqChatCompletionBody(
    [{ role: "user", content: 'Return {"text":"clearer"}.' }],
    { maxCompletionTokens: 700, temperature: 0.25, json: true },
  );

  assert.deepEqual(body.response_format, { type: "json_object" });
});

test("Groq response text is extracted safely from normal and multipart content", () => {
  assert.equal(
    extractGroqChatCompletionText({
      choices: [{ message: { content: "  Hello from Groq  " } }],
    }),
    "Hello from Groq",
  );
  assert.equal(
    extractGroqChatCompletionText({
      choices: [{ message: { content: [{ type: "text", text: "First" }, { type: "text", text: "Second" }] } }],
    }),
    "First\nSecond",
  );
  assert.equal(extractGroqChatCompletionText({ choices: [] }), "");
  assert.equal(extractGroqChatCompletionText(null), "");
});
