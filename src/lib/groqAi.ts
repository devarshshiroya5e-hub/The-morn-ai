export const GROQ_FAST_TEXT_MODEL = "openai/gpt-oss-20b" as const;

export type GroqChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GroqCompletionOptions = {
  maxCompletionTokens: number;
  temperature: number;
  json?: boolean;
};

/**
 * Build a low-latency Groq Chat Completions payload for GPT-OSS 20B.
 * Hidden reasoning keeps internal reasoning tokens out of the user-facing reply.
 */
export function buildGroqChatCompletionBody(
  messages: GroqChatMessage[],
  options: GroqCompletionOptions,
) {
  return {
    model: GROQ_FAST_TEXT_MODEL,
    messages,
    max_completion_tokens: options.maxCompletionTokens,
    temperature: options.temperature,
    reasoning_effort: "low" as const,
    reasoning_format: "hidden" as const,
    ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
  };
}

export function extractGroqChatCompletionText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices.length) return "";

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return "";
  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") return "";

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}
