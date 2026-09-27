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
let wakePromise: Promise<string | null> | null = null;

const isStaticFrontendHost = (base: string) => {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return (
      host.endsWith(".web.app") ||
      host.endsWith(".firebaseapp.com") ||
      host.endsWith(".github.io") ||
      host.includes("pages.dev")
    );
  } catch {
    return false;
  }
};

const getApiBases = () => {
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
<<<<<<< HEAD
  const localOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);

  // Production frontend must use the Render API directly. Firebase Hosting
  // rewrites /api/* to index.html and therefore cannot serve the AI API.
  const candidates = [
    RENDER_MORNAI_API,
    configuredApiBase,
    pinnedApiBase,
    localOrigin ? origin : "",
  ];
=======
  const originLooksLikeApi = origin && !isStaticFrontendHost(origin);

  const bases = [
    pinnedApiBase || "",
    configuredApiBase,
    RENDER_MORNAI_API,
    originLooksLikeApi ? origin : "",
  ]
    .map((value) => String(value || "").replace(/\/$/, ""))
    .filter(Boolean);
>>>>>>> 5ec4c54 (Update MornAI)

  return Array.from(
    new Set(
      candidates
        .map((value) => String(value || "").replace(/\/$/, ""))
        .filter(Boolean),
    ),
  );
};

<<<<<<< HEAD
const requestJson = async (url: string, body: unknown, timeoutMs = 24_000) => {
=======
const timeoutMsFor = (endpoint: MornAIEndpoint, isRemote: boolean) => {
  if (endpoint === "co-founder-chat") return isRemote ? 55_000 : 45_000;
  if (endpoint === "daily-briefing" || endpoint === "writing-assist") return isRemote ? 40_000 : 28_000;
  return isRemote ? 45_000 : 32_000;
};

const requestWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
>>>>>>> 5ec4c54 (Update MornAI)
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

const probeHealth = async (base: string, timeoutMs: number) => {
  try {
    const response = await requestWithTimeout(
      base + "/api/health",
      { method: "GET", mode: "cors", credentials: "omit", cache: "no-store" },
      timeoutMs,
    );
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json");
  } catch {
    return false;
  }
};

/** Wake the Render API on app load so the first chat/briefing is not a cold-start timeout. */
export const wakeMornAI = async (): Promise<string | null> => {
  if (pinnedApiBase) return pinnedApiBase;
  if (wakePromise) return wakePromise;

  wakePromise = (async () => {
    for (const base of getApiBases()) {
      const remote = base === RENDER_MORNAI_API || (configuredApiBase && base === configuredApiBase);
      if (await probeHealth(base, remote ? 25_000 : 4_000)) {
        pinnedApiBase = base;
        return base;
      }
    }
    return null;
  })().finally(() => {
    wakePromise = null;
  });

  return wakePromise;
};

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  await wakeMornAI();

  const bases = getApiBases();
  let lastError: Error | null = null;

  for (const base of bases) {
    const url = base + "/api/ai/" + endpoint;
<<<<<<< HEAD
    // Render is the production AI service. Keep the browser deadline below the
    // backend provider/fallback budget so the UI never hangs for half a minute.
    const timeoutMs = base === RENDER_MORNAI_API || base === pinnedApiBase ? 24_000 : 6_000;
=======
    const isRemote = base === RENDER_MORNAI_API || (configuredApiBase && base === configuredApiBase);
    const timeoutMs = timeoutMsFor(endpoint, Boolean(isRemote) || base === pinnedApiBase);

    if (base !== pinnedApiBase) {
      const healthy = await probeHealth(base, isRemote ? 20_000 : 3_500);
      if (!healthy) {
        lastError = new Error("MornAI API is not reachable at " + base);
        continue;
      }
      pinnedApiBase = base;
    }
>>>>>>> 5ec4c54 (Update MornAI)

    try {
      const response = await requestWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
          mode: "cors",
          credentials: "omit",
        },
        timeoutMs,
      );
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
          message = isRemote
            ? "Render returned the frontend page instead of the AI API."
            : "This frontend host does not expose the MornAI API.";
        }
        lastError = new Error(message);
        if (base === pinnedApiBase) pinnedApiBase = null;
        continue;
      }

      if (!contentType.includes("application/json")) {
        lastError = new Error(
          raw.startsWith("<!doctype") || raw.startsWith("<html")
            ? "AI endpoint returned HTML instead of JSON."
            : "MornAI AI server returned a non-JSON response.",
        );
        if (base === pinnedApiBase) pinnedApiBase = null;
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
      if (base === pinnedApiBase) pinnedApiBase = null;
    }
  }

  throw lastError || new Error(
    "MornAI AI server could not be reached. Render API: " + RENDER_MORNAI_API,
  );
}

export async function checkMornAIConnection(): Promise<{ ok: boolean; base: string; error?: string }> {
  const base = await wakeMornAI();
  if (base) return { ok: true, base };

  return {
    ok: false,
    base: RENDER_MORNAI_API,
    error: "Render MornAI API is not reachable from this frontend.",
  };
}
