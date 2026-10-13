export type GeneratedWebsite = {
  title: string;
  tagline: string;
  html: string;
  css: string;
  js: string;
  typescript?: string;
  degraded?: boolean;
  generationNote?: string;
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
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return true;
  // Avoid fragile delimiter escaping for the base64 alphabet; uploaded FileReader data is base64.
  return /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(value)
    && !/[\s"'<>]/.test(value);
}

/** Inserts the selected image only into the temporary preview or exported HTML. */
export function hydrateWebsiteImage(html: string, imageValue: string): string {
  if (isAllowedImage(imageValue)) return html.replace(/__MORNAI_PRODUCT_IMAGE__/g, imageValue);
  return html
    .replace(/<img\b[^>]*src=["']__MORNAI_PRODUCT_IMAGE__["'][^>]*>/gi, "")
    .replace(/__MORNAI_PRODUCT_IMAGE__/g, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\/** Validate model-generated source before it is saved or previewed. */");
}

function anchorSlug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "top";
}

/**
 * Keep single-page preview navigation on the generated site. Strip the private prompt
 * if a model mistakenly echoes it verbatim into visible page content.
 */
export function normalizeWebsiteNavigation(inputHtml: string, privatePrompt = ""): string {
  let html = inputHtml;
  const prompt = privatePrompt.trim();
  if (prompt.length >= 12) {
    html = html.replace(new RegExp(escapeRegExp(prompt), "gi"), "");
  }
  html = html.replace(/<body\b([^>]*)>/i, (match, attrs: string) =>
    /\bid\s*=/i.test(attrs) ? match : "<body" + attrs + ' id="top">'
  );
  const ids = new Set<string>(["top"]);
  for (const match of html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2]) ids.add(match[2].trim().toLowerCase());
  }

  const targetFor = (label: string, href: string): string => {
    const cleanedHref = href.trim();
    const pathWithoutOrigin = cleanedHref.replace(/^https?:\/\/[^/]+/i, "");
    const rawPath = pathWithoutOrigin.split(/[?#]/, 1)[0].replace(/^\/+/, "").replace(/^\.\//, "").replace(/\.html?$/i, "");
    const candidate = anchorSlug(rawPath.split("/").filter(Boolean).pop() || "");
    if (ids.has(candidate)) return candidate;

    const words = (label + " " + cleanedHref).toLowerCase();
    const semanticGroups: Array<[RegExp, string[]]> = [
      [/\b(contact|get in touch|reach us|book|appointment|enquir|inquiry)\b/, ["contact", "get-in-touch", "cta", "booking"]],
      [/\b(how it works|how we work|process|steps|workflow)\b/, ["how-it-works", "process", "steps", "workflow"]],
      [/\b(pricing|price|plans|cost)\b/, ["pricing", "plans", "cost"]],
      [/\b(service|services|solution|offerings)\b/, ["services", "solutions", "offerings"]],
      [/\b(feature|features|capabilities|product)\b/, ["features", "product", "capabilities"]],
      [/\b(about|story|team|company)\b/, ["about", "team", "story", "company"]],
      [/\b(home|homepage|logo|top)\b/, ["top", "home", "hero"]]
    ];
    for (const entry of semanticGroups) {
      if (!entry[0].test(words)) continue;
      for (const wanted of entry[1]) {
        if (ids.has(wanted)) return wanted;
        const partial = Array.from(ids).find((id) => id.includes(wanted) || wanted.includes(id));
        if (partial) return partial;
      }
    }
    const closest = Array.from(ids).find((id) => id.includes(candidate) || candidate.includes(id));
    return closest || "top";
  };

  html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi, (whole, attrs: string, inner: string) => {
    const hrefMatch = attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if (!hrefMatch) return whole;
    const href = hrefMatch[2].trim();
    if (/^(?:mailto|tel):/i.test(href)) return whole;
    if (/^(?:javascript|data|vbscript):/i.test(href)) {
      return whole.replace(hrefMatch[0], 'href="#top"').replace(/\s+target\s*=\s*(["']).*?\1/gi, "");
    }
    if (href.startsWith("#")) {
      const id = href.slice(1).trim().toLowerCase();
      if (ids.has(id)) return whole.replace(/\s+target\s*=\s*(["']).*?\1/gi, "");
    }

    const isAbsoluteWeb = /^https?:\/\//i.test(href);
    const host = isAbsoluteWeb ? (href.match(/^https?:\/\/([^/:?#]+)/i)?.[1]?.toLowerCase() || "") : "";
    const isMornAi = /(?:^|\.)mornai(?:\.app|\.ai|\.com)$/.test(host)
      || /^(?:www\.)?themorn\.ai$/.test(host)
      || /^(?:www\.)?morn\.ai$/.test(host)
      || /(?:^|\.)the-?morn-?ai(?:\.app|\.ai|\.com)$/.test(host)
      || /(?:^|\.)themorn-?ai(?:\.web\.app|\.firebaseapp\.com)$/.test(host)
      || /(?:^|\.)localhost$/.test(host);
    const isLocalPath = !isAbsoluteWeb || isMornAi;
    if (!isLocalPath) return whole;

    const label = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const target = targetFor(label, href);
    const replacedAttrs = attrs.replace(/\bhref\s*=\s*(["'])(.*?)\1/i, 'href="#' + target + '"')
      .replace(/\s+target\s*=\s*(["']).*?\1/gi, "");
    return "<a" + replacedAttrs + ">" + inner + "</a>";
  });
  return html;
}

/** Validate model-generated source before it is saved or previewed. */
export function validateGeneratedWebsite(input: unknown, options: { prompt?: string } = {}): GeneratedWebsite {
  const source = asRecord(input);
  let title = cleanText(source.title, 100);
  let tagline = cleanText(source.tagline, 240);
  const privatePrompt = (options.prompt || "").trim();
  if (privatePrompt.length >= 12) {
    const promptPattern = new RegExp(escapeRegExp(privatePrompt), "gi");
    title = title.replace(promptPattern, "").trim();
    tagline = tagline.replace(promptPattern, "").trim();
  }
  let html = typeof source.html === "string" ? source.html.trim() : "";
  html = normalizeWebsiteNavigation(html, options.prompt || "");
  let css = typeof source.css === "string" ? source.css.trim() : "";
  let js = typeof source.js === "string" ? source.js.trim() : "";
  const typescript = typeof source.typescript === "string" ? source.typescript.trim() : "";

  if (!title || !tagline) throw new Error("The generated website is missing its title or description.");
  if (html.length < 500 || html.length > 45_000) throw new Error("The AI returned incomplete or oversized HTML. Please regenerate the website.");
  if (css.length < 300 || css.length > 45_000) throw new Error("The AI returned incomplete or oversized CSS. Please regenerate the website.");
  if (js.length > 24_000) throw new Error("The AI returned oversized JavaScript. Please regenerate the website.");
  if (typescript.length > 24_000) throw new Error("The AI returned oversized TypeScript. Please regenerate the website.");
  if (/^\s*(?:import|export)\s/m.test(typescript)) throw new Error("Generated TypeScript must not import external modules in the isolated website preview.");
  if (!/<html\b/i.test(html) || !/<head\b/i.test(html) || !/<body\b/i.test(html)) {
    throw new Error("The AI response is not a complete HTML document. Please regenerate the website.");
  }
  if (/<(?:iframe|object|embed|base|portal)\b/i.test(html)) {
    throw new Error("The generated HTML contains an unsupported embedded document. Please regenerate the website.");
  }

  // Executable page logic is injected from the validated JavaScript/TypeScript file, never inline model HTML.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  html = html.replace(/<script\b[^>]*\/?>/gi, "");
  html = html.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
  html = html.replace(/\b(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');

  // Avoid refresh redirects and remote CSS/JS bootstrap code in the preview.
  html = html.replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?refresh\1?[^>]*>/gi, "");
  html = html.replace(/<link\b(?=[^>]*\brel\s*=\s*(["'])?modulepreload\1?)[^>]*>/gi, "");
  css = css.replace(/@import\s+(?:url\([^)]*\)|[^;]+);?/gi, "");
  css = css.replace(/expression\s*\(/gi, "/* blocked expression( */");

  if (/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|navigator\.sendBeacon|import\s*\(|\bimport\s*["']|new\s+Function\b|\beval\s*\(|document\.cookie|localStorage|sessionStorage|window\.(?:parent|top|opener|location|open)\b|document\.(?:write|domain|location)\b|\blocation\.(?:href|assign|replace)\b|history\.(?:pushState|replaceState)\b/i.test(js)) {
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
  // Generated TypeScript is transpiled for preview and remains the Vite entry in the exported project.
  html = html.replace(/<\/body>/i, (closingBody) =>
    (typescript
      ? '<script type="module" src="./src/main.ts"></script>'
      : '<script src="./src/main.js"></script>') + closingBody,
  );

  return { title, tagline, html, css, js, ...(typescript ? { typescript } : {}) };
}

export function composeGeneratedWebsiteFiles(
  input: unknown,
  options: { startupName?: string; imageUrl?: string; prompt?: string } = {},
): { indexHtml: string; stylesCss: string; mainJs: string; mainTs?: string; packageJson: string; readmeMd: string } {
  const website = validateGeneratedWebsite(input, { prompt: options.prompt });
  const imageUrl = typeof options.imageUrl === "string" && options.imageUrl.length <= 12_000_000 ? options.imageUrl.trim() : "";
  let html = website.html;

  // Keep the marker in the persisted project to avoid duplicating large base64
  // images in localStorage. The preview/export hydrates it from imagePreview.
  if (!isAllowedImage(imageUrl)) html = hydrateWebsiteImage(html, "");

  const projectName = cleanText(options.startupName || website.title, 100);
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "mornai-website";
  const scripts: Record<string, string> = {
    dev: "vite --host 0.0.0.0",
    build: "vite build",
    preview: "vite preview",
  };
  const devDependencies: Record<string, string> = { vite: "^6.0.0" };
  if (website.typescript) {
    scripts.typecheck = "tsc --noEmit --target ES2022 --module ESNext --lib ES2022,DOM --strict src/main.ts";
    devDependencies.typescript = "^5.8.3";
  }
  const packageJson = JSON.stringify({
    name: slug,
    version: "1.0.0",
    private: true,
    scripts,
    devDependencies,
  }, null, 2);
  const readmeMd = "# " + website.title + "\n\nGenerated by THE MORN AI Website Studio.\n\n## Run locally\n\n1. Run npm install.\n2. Run npm run dev.\n3. Run npm run build to validate the production bundle.\n" +
    (website.typescript ? "4. Run npm run typecheck to type-check src/main.ts.\n" : "") +
    "\nThe index.html entry imports the source files through Vite, so run the development server rather than opening index.html directly.\n\nReview contact details, pricing, claims, backend integrations, and any placeholders before publishing.";

  return {
    indexHtml: html,
    stylesCss: website.css,
    mainJs: website.js,
    ...(website.typescript ? { mainTs: website.typescript } : {}),
    packageJson,
    readmeMd,
  };
}
