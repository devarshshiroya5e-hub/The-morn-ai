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
  | "writing-assist"
  | "website-blueprint";

const DEFAULT_MORNAI_API_URL = "https://the-morn-ai.onrender.com";

const configuredApiBase = String(
  import.meta.env.VITE_MORNAI_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "",
).replace(/\/$/, "");

const getApiBases = () => {
  const bases = [
    configuredApiBase,
    typeof window !== "undefined" && /\.onrender\.com$/i.test(window.location.hostname)
      ? window.location.origin
      : "",
    DEFAULT_MORNAI_API_URL,
  ]
    .map((value) => String(value || "").replace(/\/$/, ""))
    .filter(Boolean);

  return Array.from(new Set(bases));
};

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  const bases = getApiBases();
  let lastError: Error | null = null;

  for (const base of bases) {
    const url = base + "/api/ai/" + endpoint;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type") || "";
      const raw = await response.text();

      if (!response.ok) {
        let message = "MornAI AI server returned HTTP " + response.status;
        if (contentType.includes("application/json")) {
          try {
            const payload = JSON.parse(raw);
            message = payload?.error || message;
          } catch {
            // Keep the HTTP status message.
          }
        } else if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
          message = "AI endpoint returned the frontend page instead of the MornAI Render API.";
        }
        lastError = new Error(message);
        continue;
      }

      if (!contentType.includes("application/json")) {
        lastError = new Error(
          raw.startsWith("<!doctype") || raw.startsWith("<html")
            ? "AI endpoint returned the frontend page instead of JSON."
            : "MornAI AI server returned a non-JSON response.",
        );
        continue;
      }

      try {
        return JSON.parse(raw) as T;
      } catch {
        lastError = new Error("MornAI AI server returned malformed JSON.");
      }
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error("MornAI AI server could not be reached.");
    }
  }

  throw lastError || new Error(
    "MornAI AI server could not be reached. Check the Render backend.",
  );
}