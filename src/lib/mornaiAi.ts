export type MornAIEndpoint =
  | "daily-briefing"
  | "network-insights"
  | "startup-summary"
  | "profile-assist"
  | "website-blueprint";

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  const response = await fetch("/api/ai/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "MornAI AI request failed");
  }
  return payload as T;
}
