export type MornAIEndpoint =
  | "co-founder-chat"
  | "generate-roadmap"
  | "generate-role-post"
  | "delegate-tasks"
  | "predictive-insights"
  | "mentor-suggestion"
  | "match-analysis"
  | "daily-briefing"
  | "network-insights"
  | "startup-summary"
  | "profile-assist"
  | "website-blueprint";

const apiBase = String(
  import.meta.env.VITE_MORNAI_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "",
).replace(/\/$/, "");

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  const url = `${apiBase}/api/ai/${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      "MornAI AI server could not be reached. Check VITE_MORNAI_API_URL and the Render backend.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!response.ok) {
    const errorMessage = contentType.includes("application/json")
      ? (() => {
          try {
            const payload = JSON.parse(raw);
            return payload?.error || `MornAI AI server returned HTTP ${response.status}`;
          } catch {
            return `MornAI AI server returned HTTP ${response.status}`;
          }
        })()
      : raw.startsWith("<!doctype") || raw.startsWith("<html")
        ? `MornAI AI endpoint returned HTML instead of JSON. Check VITE_MORNAI_API_URL (current: ${url}).`
        : `MornAI AI server returned HTTP ${response.status}`;

    throw new Error(errorMessage);
  }

  if (!contentType.includes("application/json")) {
    if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
      throw new Error(
        `MornAI AI endpoint returned the frontend HTML page instead of JSON. Set VITE_MORNAI_API_URL to your Render API service URL (current: ${url}).`,
      );
    }
    throw new Error("MornAI AI server returned a non-JSON response.");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("MornAI AI server returned malformed JSON.");
  }
}
