export type MornAIApiRoutingOptions = {
  origin: string;
  configuredBase: string;
  pinnedBase: string | null;
  renderBase: string;
  isLocal: boolean;
};

/**
 * Static-host origins often rewrite unknown POST routes to index.html with HTTP 200.
 * Use same-origin only for local development; production must use an explicitly
 * configured API base or the known Render API host.
 */
export function getMornAIApiBases(options: MornAIApiRoutingOptions): string[] {
  const values = [
    options.pinnedBase || "",
    options.isLocal ? options.origin : "",
    options.configuredBase,
    options.renderBase,
  ];
  return Array.from(new Set(
    values
      .map((value) => String(value || "").replace(/\/$/, ""))
      .filter(Boolean),
  ));
}

export function requiresLiveMornAIResponse(endpoint: string): boolean {
  return endpoint === "website-blueprint" || endpoint === "website-generate";
}

export function looksLikeHtmlResponse(contentType: string, raw: string): boolean {
  return /text\/html/i.test(contentType)
    || /^\uFEFF?\s*(?:<!doctype\s+html|<html\b)/i.test(raw.slice(0, 1000));
}
