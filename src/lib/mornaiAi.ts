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

const RENDER_MORNAI_API = "https://the-morn-ai.onrender.com";

const configuredApiBase = String(
  import.meta.env.VITE_MORNAI_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "",
).replace(/\/$/, "");

const getApiBases = () => {
  const configuredIsFrontendOrigin =
    typeof window !== "undefined" &&
    configuredApiBase &&
    configuredApiBase === window.location.origin;

  const bases = [
    configuredApiBase && !configuredIsFrontendOrigin ? configuredApiBase : "",
    RENDER_MORNAI_API,
    configuredIsFrontendOrigin ? configuredApiBase : "",
    typeof window !== "undefined" && window.location.origin !== RENDER_MORNAI_API
      ? window.location.origin
      : "",
  ]
    .map((value) => String(value || "").replace(/\/$/, ""))
    .filter(Boolean);

  return Array.from(new Set(bases));
};

const requestJson = async (url: string, body: unknown) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25_000);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  const bases = getApiBases();
  let lastError: Error | null = null;

  for (const base of bases) {
    const url = base + "/api/ai/" + endpoint;

    try {
      const response = await requestJson(url, body);
      const contentType = response.headers.get("content-type") || "";
      const raw = await response.text();

      if (!response.ok) {
        let message = "MornAI AI server returned HTTP " + response.status;
        if (contentType.includes("application/json")) {
          try {
            const payload = JSON.parse(raw);
            message = payload?.error || message;
          } catch {}
        } else if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
          message = base === RENDER_MORNAI_API
            ? "Render returned the frontend page instead of the AI API."
            : "This frontend host does not expose the MornAI API.";
        }
        lastError = new Error(message);
        continue;
      }

      if (!contentType.includes("application/json")) {
        lastError = new Error(
          raw.startsWith("<!doctype") || raw.startsWith("<html")
            ? "AI endpoint returned HTML instead of JSON."
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
        ? error.name === "AbortError"
          ? new Error("MornAI AI request timed out.")
          : error
        : new Error("MornAI AI server could not be reached.");
    }
  }

  throw lastError || new Error(
    "MornAI AI server could not be reached. Render API: " + RENDER_MORNAI_API,
  );
}

export async function checkMornAIConnection(): Promise<{ ok: boolean; base: string; error?: string }> {
  for (const base of getApiBases()) {
    try {
      const response = await fetch(base + "/api/health", {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
      if (response.ok) return { ok: true, base };
    } catch {}
  }

  return {
    ok: false,
    base: RENDER_MORNAI_API,
    error: "Render MornAI API is not reachable from this frontend.",
  };
}
