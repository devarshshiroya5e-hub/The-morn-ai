export type GeneratedWebsite = {
  title: string;
  tagline: string;
  html: string;
  css: string;
  js: string;
};

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max)
    : "";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function isAllowedImage(value: string): boolean {
  return /^https:\/\/[^\s"'<>]+$/i.test(value)
    || /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
}

/** Inserts the selected image only into the temporary preview or exported HTML. */
export function hydrateWebsiteImage(html: string, imageValue: string): string {
  if (isAllowedImage(imageValue)) return html.replace(/__MORNAI_PRODUCT_IMAGE__/g, imageValue);
  return html
    .replace(/<img\b[^>]*src=["']__MORNAI_PRODUCT_IMAGE__["'][^>]*>/gi, "")
    .replace(/__MORNAI_PRODUCT_IMAGE__/g, "");
}

/** Validate model-generated source before it is saved or previewed. */
export function validateGeneratedWebsite(input: unknown): GeneratedWebsite {
  const source = asRecord(input);
  const title = cleanText(source.title, 100);
  const tagline = cleanText(source.tagline, 240);
  let html = typeof source.html === "string" ? source.html.trim() : "";
  let css = typeof source.css === "string" ? source.css.trim() : "";
  let js = typeof source.js === "string" ? source.js.trim() : "";

  if (!title || !tagline) throw new Error("The generated website is missing its title or description.");
  if (html.length < 500 || html.length > 45_000) throw new Error("The AI returned incomplete or oversized HTML. Please regenerate the website.");
  if (css.length < 300 || css.length > 45_000) throw new Error("The AI returned incomplete or oversized CSS. Please regenerate the website.");
  if (js.length > 18_000) throw new Error("The AI returned oversized JavaScript. Please regenerate the website.");
  if (!/<html\b/i.test(html) || !/<head\b/i.test(html) || !/<body\b/i.test(html)) {
    throw new Error("The AI response is not a complete HTML document. Please regenerate the website.");
  }
  if (/<(?:iframe|object|embed|base|portal)\b/i.test(html)) {
    throw new Error("The generated HTML contains an unsupported embedded document. Please regenerate the website.");
  }

  // All executable page logic belongs in main.js; remove model-inlined scripts and handlers.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  html = html.replace(/<script\b[^>]*\/?>/gi, "");
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');

  // Avoid refresh redirects and remote CSS/JS bootstrap code in the preview.
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?refresh\1?[^>]*>/gi, "");
  html = html.replace(/<link\b(?=[^>]*\brel\s*=\s*(["'])?modulepreload\1?)[^>]*>/gi, "");
  css = css.replace(/@import\s+(?:url\([^)]*\)|[^;]+);?/gi, "");
  css = css.replace(/expression\s*\(/gi, "/* blocked expression( */");

  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|navigator\.sendBeacon|import\s*\(|\bimport\s*["']|new\s+Function\b|\beval\s*\(|document\.cookie|localStorage|sessionStorage|window\.(?:parent|top|opener)\b|document\.(?:write|domain)\b/i.test(js)) {
    throw new Error("The generated JavaScript uses a restricted browser API. Please regenerate the website.");
  }

  // Make project-relative assets resolve correctly both in the ZIP and in srcDoc.
  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, "<title>" + escapeHtml(title) + "</title>");
  } else {
    html = html.replace(/<head\b[^>]*>/i, (head) => head + "<title>" + escapeHtml(title) + "</title>");
  }
  if (/<meta\b[^>]*name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\b[^>]*name=["']description["'][^>]*>/i, '<meta name="description" content="' + escapeHtml(tagline) + '">');
  } else {
    html = html.replace(/<\/head>/i, '<meta name="description" content="' + escapeHtml(tagline) + '"></head>');
  }
  if (!/<link\b[^>]*href=["']\.\/src\/styles\.css["']/i.test(html)) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="./src/styles.css"></head>');
  }
  if (!/<script\b[^>]*src=["']\.\/src\/main\.js["']/i.test(html)) {
    html = html.replace(/<\/body>/i, '<script src="./src/main.js"></script></body>');
  }

  return { title, tagline, html, css, js };
}

export function composeGeneratedWebsiteFiles(
  input: unknown,
  options: { startupName?: string; imageUrl?: string; prompt?: string } = {},
): { indexHtml: string; stylesCss: string; mainJs: string; packageJson: string; readmeMd: string } {
  const website = validateGeneratedWebsite(input);
  const imageUrl = typeof options.imageUrl === "string" && options.imageUrl.length <= 12_000_000 ? options.imageUrl.trim() : "";
  let html = website.html;

  // Keep the marker in the persisted project to avoid duplicating large base64
  // images in localStorage. The preview/export hydrates it from imagePreview.
  if (!isAllowedImage(imageUrl)) html = hydrateWebsiteImage(html, "");

  const projectName = cleanText(options.startupName || website.title, 100);
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "mornai-website";
  const packageJson = JSON.stringify({
    name: slug,
    version: "1.0.0",
    private: true,
    scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
    devDependencies: { vite: "^6.0.0" },
  }, null, 2);
  const readmeMd = "# " + website.title + "\n\nGenerated by THE MORN AI Website Studio.\n\n## Run locally\n\n1. Run npm install.\n2. Run npm run dev.\n3. Run npm run build to validate the production bundle.\n\nReview contact details, pricing, claims, and any placeholders before publishing.";

  return {
    indexHtml: html,
    stylesCss: website.css,
    mainJs: website.js,
    packageJson,
    readmeMd,
  };
}
