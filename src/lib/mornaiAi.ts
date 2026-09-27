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

let pinnedApiBase: string | null = null;

const getApiBases = () => {
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
  const localOrigin =
    /^https?:\/\/(localhost|127\\.0\\.0\\.1)(?::\\d+)?$/i.test(origin);

  // Production frontend must use the Render API directly. Firebase Hosting
  // rewrites /api/* to index.html and therefore cannot serve the AI API.
  const candidates = [
    RENDER_MORNAI_API,
    configuredApiBase,
    pinnedApiBase,
    localOrigin ? origin : "",
  ];

  return Array.from(
    new Set(
      candidates
        .map((value) => String(value || "").replace(/\/$/, ""))
        .filter(Boolean),
    ),
  );
};

const requestJson = async (url: string, body: unknown, timeoutMs = 18_000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

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
    // Render is the production AI service. Keep the browser deadline below the
    // backend provider/fallback budget so the UI never hangs for half a minute.
    const timeoutMs = base === RENDER_MORNAI_API || base === pinnedApiBase ? 14_000 : 6_000;

    try {
      const response = await requestJson(url, body, timeoutMs);
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
        const parsed = JSON.parse(raw) as T;
        pinnedApiBase = base;
        return parsed;
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
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(base + "/api/health", {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      if (response.ok) {
        pinnedApiBase = base;
        return { ok: true, base };
      }
    } catch {}
  }

  return {
    ok: false,
    base: RENDER_MORNAI_API,
    error: "Render MornAI API is not reachable from this frontend.",
  };
}
