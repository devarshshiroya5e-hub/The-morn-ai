export type WebsiteSectionType =
  | "features" | "services" | "products" | "steps" | "process" | "gallery"
  | "testimonials" | "pricing" | "faq" | "stats" | "team" | "before-after"
  | "contact" | "cta" | "trust";

export type WebsiteSpec = {
  title: string; tagline: string;
  theme: {
    style: "clinical" | "editorial" | "playful" | "luxury" | "technical" | "organic" | "bold" | "minimal" | "brutalist";
    palette: { background: string; surface: string; text: string; muted: string; primary: string; accent: string };
    headingFont: "sans" | "serif" | "mono"; bodyFont: "sans" | "serif" | "mono";
    spacing: "compact" | "balanced" | "airy"; corners: "square" | "soft" | "rounded" | "pill";
  };
  hero: { layout: "centered" | "left" | "split" | "editorial" | "banner" | "overlap"; eyebrow: string; headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  sections: Array<{
    type: WebsiteSectionType; title: string; subtitle: string;
    layout: "grid" | "cards" | "list" | "split" | "masonry" | "steps" | "accordion" | "banner" | "minimal";
    items: Array<{ title: string; body: string; label: string; value: string; price: string; quote: string; author: string; imageUrl: string }>;
  }>;
};

type UnknownRecord = Record<string, unknown>;
const SECTION_TYPES = new Set<WebsiteSectionType>(["features", "services", "products", "steps", "process", "gallery", "testimonials", "pricing", "faq", "stats", "team", "before-after", "contact", "cta", "trust"]);
const LAYOUTS = new Set(["grid", "cards", "list", "split", "masonry", "steps", "accordion", "banner", "minimal"]);
const STYLES = new Set(["clinical", "editorial", "playful", "luxury", "technical", "organic", "bold", "minimal", "brutalist"]);
const HERO_LAYOUTS = new Set(["centered", "left", "split", "editorial", "banner", "overlap"]);
const FONTS = new Set(["sans", "serif", "mono"]);
const SPACING = new Set(["compact", "balanced", "airy"]);
const CORNERS = new Set(["square", "soft", "rounded", "pill"]);
const PALETTES: Record<string, WebsiteSpec["theme"]["palette"]> = {
  clinical: { background: "#f7fbfc", surface: "#ffffff", text: "#17313b", muted: "#58717b", primary: "#087e8b", accent: "#bde7e7" },
  editorial: { background: "#f6f1e9", surface: "#fffdf8", text: "#2c2723", muted: "#796f65", primary: "#9b3d2b", accent: "#d9b680" },
  playful: { background: "#fff9f1", surface: "#ffffff", text: "#29243c", muted: "#706b83", primary: "#7257e8", accent: "#f8c85a" },
  luxury: { background: "#f4f0e8", surface: "#fffdf8", text: "#1e211d", muted: "#77776d", primary: "#293d32", accent: "#c7a66a" },
  technical: { background: "#080d18", surface: "#111a2a", text: "#edf4ff", muted: "#9daec5", primary: "#6b9cff", accent: "#42dfbd" },
  organic: { background: "#f3f5ec", surface: "#ffffff", text: "#29382b", muted: "#6a7866", primary: "#557548", accent: "#dfb66b" },
  bold: { background: "#fff8f0", surface: "#ffffff", text: "#171717", muted: "#66605b", primary: "#e34c2f", accent: "#f1be34" },
  minimal: { background: "#fafafa", surface: "#ffffff", text: "#171717", muted: "#737373", primary: "#242424", accent: "#dedede" },
  brutalist: { background: "#f8ff3d", surface: "#ffffff", text: "#111111", muted: "#444444", primary: "#ff4d00", accent: "#7c5cff" },
};
function record(value: unknown): UnknownRecord { return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {}; }
function cleanText(value: unknown, max = 240): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function pick<T extends string>(value: unknown, choices: Set<T>, fallback: T): T { return typeof value === "string" && choices.has(value as T) ? value as T : fallback; }
function safeColor(value: unknown, fallback: string): string {
  const color = cleanText(value, 16);
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : fallback;
}
function safeImageUrl(value: unknown): string {
  const url = cleanText(value, 1600);
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url;
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  return "";
}
function escapeHtml(value: unknown): string {
  return cleanText(value, 2000).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function slugify(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "section"; }

export function validateWebsiteSpec(input: unknown): WebsiteSpec {
  const root = record(input), themeInput = record(root.theme), paletteInput = record(themeInput.palette), heroInput = record(root.hero);
  const title = cleanText(root.title, 100), tagline = cleanText(root.tagline, 240), headline = cleanText(heroInput.headline, 180), subheadline = cleanText(heroInput.subheadline, 360);
  const sectionsInput = Array.isArray(root.sections) ? root.sections : [];
  const style = pick(themeInput.style, STYLES as Set<WebsiteSpec["theme"]["style"]>, "minimal");
  const defaults = PALETTES[style];
  if (!title || !tagline || !headline || !subheadline) throw new Error("The website design response is missing a title, tagline, or hero headline. Try a more specific prompt.");
  if (sectionsInput.length < 2) throw new Error("The website design response included fewer than two page sections. Please regenerate the website.");
  if (sectionsInput.length > 10) throw new Error("The website design response included too many sections. Please regenerate the website.");
  const sections = sectionsInput.map((rawSection, index) => {
    const section = record(rawSection), type = cleanText(section.type, 32) as WebsiteSectionType;
    if (!SECTION_TYPES.has(type)) throw new Error("Unsupported website section at position " + (index + 1) + ".");
    const sectionTitle = cleanText(section.title, 120);
    if (!sectionTitle) throw new Error("Section " + (index + 1) + " is missing a title.");
    const items = (Array.isArray(section.items) ? section.items.slice(0, 8) : []).map((rawItem) => {
      const item = record(rawItem);
      return { title: cleanText(item.title, 140), body: cleanText(item.body, 480), label: cleanText(item.label, 100), value: cleanText(item.value, 80), price: cleanText(item.price, 80), quote: cleanText(item.quote, 480), author: cleanText(item.author, 100), imageUrl: safeImageUrl(item.imageUrl) };
    });
    return {
      type, title: sectionTitle, subtitle: cleanText(section.subtitle, 240),
      layout: pick(section.layout, LAYOUTS, type === "faq" ? "accordion" : type === "steps" || type === "process" ? "steps" : "grid") as WebsiteSpec["sections"][number]["layout"],
      items,
    };
  });
  return {
    title, tagline,
    theme: {
      style, palette: {
        background: safeColor(paletteInput.background, defaults.background), surface: safeColor(paletteInput.surface, defaults.surface),
        text: safeColor(paletteInput.text, defaults.text), muted: safeColor(paletteInput.muted, defaults.muted),
        primary: safeColor(paletteInput.primary, defaults.primary), accent: safeColor(paletteInput.accent, defaults.accent),
      },
      headingFont: pick(themeInput.headingFont, FONTS, style === "editorial" || style === "luxury" ? "serif" : "sans") as WebsiteSpec["theme"]["headingFont"],
      bodyFont: pick(themeInput.bodyFont, FONTS, "sans") as WebsiteSpec["theme"]["bodyFont"],
      spacing: pick(themeInput.spacing, SPACING, style === "luxury" || style === "editorial" ? "airy" : "balanced") as WebsiteSpec["theme"]["spacing"],
      corners: pick(themeInput.corners, CORNERS, style === "brutalist" ? "square" : "soft") as WebsiteSpec["theme"]["corners"],
    },
    hero: { layout: pick(heroInput.layout, HERO_LAYOUTS, "split") as WebsiteSpec["hero"]["layout"], eyebrow: cleanText(heroInput.eyebrow, 120), headline, subheadline, primaryCta: cleanText(heroInput.primaryCta, 60) || "Get in touch", secondaryCta: cleanText(heroInput.secondaryCta, 60) },
    sections,
  };
}

export function groundSensitiveWebsiteClaims(spec: WebsiteSpec, sourceContext: string): WebsiteSpec {
  const source = cleanText(sourceContext, 14000).toLowerCase();
  const supplied = (value: string) => Boolean(value && source.includes(value.toLowerCase()));
  const sections = spec.sections.map((section) => {
    if (section.type === "testimonials") return { ...section, items: section.items.map((item) => item.quote && supplied(item.quote) ? item : { ...item, title: item.title && supplied(item.title) ? item.title : "Customer feedback", quote: "Add an approved customer quote here.", author: "Add customer name with permission", body: "" }) };
    if (section.type === "stats") return { ...section, items: section.items.map((item) => [item.title, item.label, item.value, item.body].filter(Boolean).every(supplied) ? item : { ...item, title: "Verified metric", label: "Founder to provide", value: "Add metric", body: "Replace this placeholder with a verified figure supplied by your team." }) };
    if (section.type === "pricing") return { ...section, items: section.items.map((item) => item.price && supplied(item.price) ? item : { ...item, price: "Price not provided", body: item.body && supplied(item.body) ? item.body : "Add this plan's details and price." }) };
    return section;
  });
  return { ...spec, sections };
}

function fontStack(font: WebsiteSpec["theme"]["bodyFont"]): string {
  if (font === "serif") return "Georgia, 'Times New Roman', serif";
  if (font === "mono") return "'SFMono-Regular', Consolas, monospace";
  return "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
}
function renderItem(item: WebsiteSpec["sections"][number]["items"][number], type: WebsiteSectionType): string {
  if (type === "pricing") return '<article class="item-card price-card"><p class="item-label">' + escapeHtml(item.label || item.title || "Plan") + '</p><p class="price">' + escapeHtml(item.price || "Price not provided") + '</p><p>' + escapeHtml(item.body || "Add plan details.") + '</p></article>';
  if (type === "testimonials") return '<figure class="item-card quote-card"><blockquote>' + escapeHtml(item.quote || "Add an approved customer quote here.") + '</blockquote><figcaption>' + escapeHtml(item.author || "Customer name with permission") + '</figcaption></figure>';
  if (type === "stats") return '<article class="item-card stat-card"><span>' + escapeHtml(item.label || "Verified metric") + '</span><strong>' + escapeHtml(item.value || "Add metric") + '</strong><p>' + escapeHtml(item.body || "Add a verified figure supplied by your team.") + '</p></article>';
  if (type === "faq") return '<details class="faq-item"><summary>' + escapeHtml(item.title || "Add a question") + '</summary><p>' + escapeHtml(item.body || "Add an answer from your team.") + '</p></details>';
  const image = item.imageUrl ? '<img class="item-image" loading="lazy" alt="" src="' + escapeHtml(item.imageUrl) + '">' : "";
  return '<article class="item-card">' + image + (item.label ? '<span class="item-label">' + escapeHtml(item.label) + '</span>' : "") + '<h3>' + escapeHtml(item.title || "Add details") + '</h3>' + (item.body ? '<p>' + escapeHtml(item.body) + '</p>' : "") + (item.value ? '<strong class="item-value">' + escapeHtml(item.value) + '</strong>' : "") + '</article>';
}
function renderSection(section: WebsiteSpec["sections"][number], index: number): string {
  const id = slugify(section.type + "-" + section.title) + "-" + index;
  const title = '<div class="section-heading"><p class="eyebrow">' + escapeHtml(section.type.replace(/-/g, " ")) + '</p><h2>' + escapeHtml(section.title) + '</h2>' + (section.subtitle ? '<p>' + escapeHtml(section.subtitle) + '</p>' : "") + '</div>';
  if (section.type === "contact" || section.type === "cta") return '<section class="page-section section--' + section.type + ' layout--banner" id="' + id + '"><div class="cta-panel">' + title + '<p>' + escapeHtml(section.items[0]?.body || "Add your preferred contact method or next step.") + '</p><a class="button button--primary" href="mailto:">Contact the team</a></div></section>';
  if (section.type === "faq") return '<section class="page-section section--faq layout--accordion" id="' + id + '">' + title + '<div class="faq-list">' + (section.items.length ? section.items.map((item) => renderItem(item, section.type)).join("") : '<p class="placeholder">Add questions and answers from your team.</p>') + '</div></section>';
  const content = section.items.length ? section.items.map((item) => renderItem(item, section.type)).join("") : '<p class="placeholder">Add content for this section when it is ready.</p>';
  const list = section.layout === "list" || section.layout === "steps" || section.type === "steps" || section.type === "process";
  return '<section class="page-section section--' + section.type + ' layout--' + section.layout + (list ? ' layout-list' : '') + '" id="' + id + '">' + title + '<div class="item-layout">' + content + '</div></section>';
}

export function composeWebsiteFiles(input: unknown, options: { startupName?: string; imageUrl?: string; prompt?: string } = {}): { indexHtml: string; stylesCss: string; mainJs: string; packageJson: string; readmeMd: string } {
  const spec = validateWebsiteSpec(input), palette = spec.theme.palette, heroImageUrl = safeImageUrl(options.imageUrl);
  const contactSection = spec.sections.find((section) => section.type === "contact" || section.type === "cta");
  const finalSection = spec.sections[spec.sections.length - 1], targetSection = contactSection || finalSection;
  const ctaTarget = slugify(targetSection.type + "-" + targetSection.title) + "-" + spec.sections.indexOf(targetSection);
  const navItems = spec.sections.filter((section) => ["features", "services", "products", "gallery", "process", "steps", "pricing", "faq", "contact"].includes(section.type));
  const nav = navItems.map((section) => '<a href="#' + slugify(section.type + "-" + section.title) + "-" + spec.sections.indexOf(section) + '">' + escapeHtml(section.title) + '</a>').join("");
  const brand = escapeHtml(options.startupName || spec.title);
  const heroVisual = heroImageUrl ? '<div class="hero-visual"><img src="' + escapeHtml(heroImageUrl) + '" alt="' + brand + '" loading="lazy"></div>' : '<div class="hero-visual hero-art" aria-hidden="true"><div class="art-orbit"></div><div class="art-panel"><span>' + escapeHtml(spec.theme.style.toUpperCase()) + '</span><strong>' + escapeHtml((options.startupName || spec.title).slice(0, 1)) + '</strong><small>' + escapeHtml(spec.tagline) + '</small></div></div>';
  const page = '<header class="site-header"><a class="brand" href="#top">' + brand + '</a><nav class="site-nav">' + nav + '</nav><a class="button button--small" href="#' + ctaTarget + '">' + escapeHtml(spec.hero.primaryCta) + '</a><button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button></header>'
    + '<main id="top"><section class="hero hero--' + spec.hero.layout + '"><div class="hero-copy">' + (spec.hero.eyebrow ? '<p class="eyebrow">' + escapeHtml(spec.hero.eyebrow) + '</p>' : "") + '<h1>' + escapeHtml(spec.hero.headline) + '</h1><p class="hero-subtitle">' + escapeHtml(spec.hero.subheadline) + '</p><div class="hero-actions"><a class="button button--primary" href="#' + ctaTarget + '">' + escapeHtml(spec.hero.primaryCta) + '</a>' + (spec.hero.secondaryCta ? '<a class="button button--secondary" href="#' + ctaTarget + '">' + escapeHtml(spec.hero.secondaryCta) + '</a>' : "") + '</div></div>' + heroVisual + '</section>' + spec.sections.map(renderSection).join("") + '</main><footer class="site-footer"><span>' + brand + '</span><span>' + escapeHtml(spec.tagline) + '</span></footer>';
  const html = '<!doctype html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="' + escapeHtml(spec.tagline) + '"><meta name="theme-color" content="' + palette.primary + '"><title>' + escapeHtml(spec.title) + '</title><link rel="stylesheet" href="./src/styles.css"></head><body class="theme-' + spec.theme.style + '">' + page + '<script src="./src/main.js"></script></body></html>';
  const spacing = spec.theme.spacing === "compact" ? "1.1rem" : spec.theme.spacing === "airy" ? "2.8rem" : "1.8rem";
  const radius = spec.theme.corners === "square" ? "0" : spec.theme.corners === "pill" ? "999px" : spec.theme.corners === "rounded" ? "28px" : "14px";
  const css = [
    ":root{--bg:" + palette.background + ";--surface:" + palette.surface + ";--ink:" + palette.text + ";--muted:" + palette.muted + ";--primary:" + palette.primary + ";--accent:" + palette.accent + ";--heading:" + fontStack(spec.theme.headingFont) + ";--body:" + fontStack(spec.theme.bodyFont) + ";--space:" + spacing + ";--radius:" + radius + "}",
    "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.65}a{color:inherit;text-decoration:none}.site-header{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:1.2rem;padding:1rem clamp(1rem,5vw,5rem);background:var(--bg);border-bottom:1px solid color-mix(in srgb,var(--ink) 15%,transparent)}.brand{font:700 1.05rem var(--heading);margin-right:auto}.site-nav{display:flex;gap:1.1rem;align-items:center}.site-nav a{font-size:.88rem;color:var(--muted)}.button{display:inline-flex;align-items:center;justify-content:center;padding:.82rem 1.1rem;border-radius:var(--radius);font-weight:700;border:1px solid var(--primary);gap:.5rem}.button--primary,.site-header .button{background:var(--primary);color:var(--surface)}.button--secondary{background:transparent;color:var(--ink);border-color:color-mix(in srgb,var(--ink) 25%,transparent)}.button--small{font-size:.82rem;padding:.55rem .9rem}.menu-toggle{display:none;background:none;border:1px solid var(--muted);color:var(--ink);border-radius:var(--radius);padding:.4rem .65rem}",
    ".hero{display:grid;align-items:center;gap:clamp(2rem,5vw,5.5rem);padding:clamp(3.5rem,8vw,8rem) clamp(1rem,7vw,7rem);min-height:70vh}.hero--centered{text-align:center;grid-template-columns:1fr;justify-items:center}.hero--centered .hero-copy{max-width:850px}.hero--centered .hero-visual{max-width:760px;width:100%}.hero--left{grid-template-columns:1fr}.hero--left .hero-copy{max-width:900px}.hero--split{grid-template-columns:minmax(0,1fr) minmax(260px,.85fr)}.hero--editorial{grid-template-columns:minmax(0,1.3fr) minmax(250px,.7fr);align-items:end}.hero--banner{grid-template-columns:1fr;text-align:center;background:var(--primary);color:var(--surface)}.hero--banner .hero-visual{display:none}.hero--overlap{grid-template-columns:1fr;position:relative}.hero--overlap .hero-visual{position:absolute;right:5%;bottom:5%;width:35%;opacity:.5;z-index:0}.hero--overlap .hero-copy{position:relative;z-index:1;max-width:75%}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:var(--primary);font-size:.72rem;font-weight:800}.hero h1{font:700 clamp(2.5rem,6vw,5.8rem)/1.02 var(--heading);letter-spacing:-.045em;margin:.3em 0}.hero-subtitle{font-size:clamp(1rem,1.6vw,1.25rem);max-width:680px;color:var(--muted)}.hero-actions{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.8rem}.hero-visual{min-height:280px;display:grid;place-items:center;position:relative}.hero-visual img{width:100%;height:100%;max-height:560px;object-fit:cover;border-radius:var(--radius);box-shadow:0 25px 75px #0002}.hero-art{overflow:hidden;background:var(--surface);border:1px solid color-mix(in srgb,var(--primary) 35%,transparent);border-radius:calc(var(--radius) * 1.4);min-height:340px}.art-orbit{position:absolute;width:65%;aspect-ratio:1;border:1px solid var(--accent);border-radius:50%;transform:rotate(-22deg) scaleY(.52);box-shadow:0 0 0 35px color-mix(in srgb,var(--primary) 12%,transparent),0 0 0 75px color-mix(in srgb,var(--accent) 15%,transparent)}.art-panel{position:relative;z-index:1;width:min(72%,360px);padding:2rem;background:var(--bg);border:1px solid color-mix(in srgb,var(--primary) 35%,transparent);border-radius:var(--radius);box-shadow:0 22px 55px #0002;display:grid;gap:.9rem}.art-panel span,.art-panel small{color:var(--muted);font-size:.7rem}.art-panel strong{font:700 5rem/1 var(--heading);color:var(--primary)}",
    ".page-section{padding:var(--space) clamp(1rem,7vw,7rem);margin:0 auto;max-width:1500px}.section-heading{max-width:760px;margin:0 0 2rem}.section-heading h2{font:700 clamp(1.8rem,3.5vw,3.25rem)/1.1 var(--heading);letter-spacing:-.035em;margin:.3rem 0}.section-heading>p:last-child{color:var(--muted)}.item-layout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.layout--list .item-layout,.layout--steps .item-layout{grid-template-columns:1fr}.layout--split .item-layout{grid-template-columns:repeat(2,minmax(0,1fr))}.layout--masonry .item-layout{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.item-card,.faq-item{background:var(--surface);border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);border-radius:var(--radius);padding:clamp(1rem,2vw,1.8rem);min-width:0}.item-card h3{font:700 1.2rem/1.25 var(--heading);margin:.6rem 0}.item-card p{margin:.5rem 0;color:var(--muted)}.item-label{display:inline-block;color:var(--primary);font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.item-value{display:block;font:700 1.5rem var(--heading);margin-top:.7rem}.item-image{width:100%;max-height:230px;object-fit:cover;border-radius:calc(var(--radius) * .7)}.section--steps .item-card,.section--process .item-card{border:0;border-top:2px solid var(--primary);border-radius:0;background:transparent}.section--gallery .item-layout{grid-template-columns:repeat(2,minmax(0,1fr))}.section--gallery .item-card{min-height:220px;display:flex;flex-direction:column;justify-content:end;background:linear-gradient(140deg,var(--surface),color-mix(in srgb,var(--accent) 24%,var(--surface)))}.quote-card blockquote{font:600 1.25rem/1.45 var(--heading);margin:0}.quote-card figcaption{margin-top:1rem;color:var(--muted);font-size:.86rem}.price{font:700 1.5rem var(--heading);color:var(--primary)}.stat-card strong{display:block;font:700 2rem var(--heading);margin:.4rem 0}.faq-list{display:grid;gap:.6rem;max-width:850px}.faq-item summary{cursor:pointer;font-weight:750}.faq-item p{color:var(--muted)}.cta-panel{padding:clamp(2rem,5vw,5rem);border-radius:var(--radius);background:var(--primary);color:var(--surface)}.cta-panel .section-heading .eyebrow,.hero--banner .eyebrow{color:var(--accent)}.cta-panel .section-heading>p:last-child{color:inherit;opacity:.85}.cta-panel>p{opacity:.9}.cta-panel .button{margin-top:1rem;color:var(--ink);background:var(--surface);border-color:var(--surface)}.placeholder{padding:1.4rem;background:var(--surface);border:1px dashed var(--muted);border-radius:var(--radius);color:var(--muted)}.site-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;padding:2rem clamp(1rem,7vw,7rem);border-top:1px solid color-mix(in srgb,var(--ink) 15%,transparent);color:var(--muted);font-size:.86rem}.theme-clinical .hero-art{box-shadow:0 18px 55px #087e8b18}.theme-luxury .site-header,.theme-editorial .site-header{font-family:var(--heading)}.theme-brutalist .button,.theme-brutalist .item-card{border:2px solid var(--ink);box-shadow:5px 5px 0 var(--ink);border-radius:0}.theme-technical .hero-art{background:linear-gradient(135deg,var(--surface),var(--bg))}.theme-organic .item-card{border-radius:calc(var(--radius) * 1.5)}",
    "@media(max-width:760px){.site-header{flex-wrap:wrap}.site-nav{display:none;order:4;width:100%;flex-direction:column;align-items:flex-start;padding:.8rem 0}.site-nav.is-open{display:flex}.menu-toggle{display:block}.hero,.hero--split,.hero--editorial,.hero--overlap{grid-template-columns:1fr;min-height:auto}.hero--overlap .hero-copy{max-width:100%}.hero--overlap .hero-visual{position:relative;right:auto;bottom:auto;width:100%;opacity:1}.hero--banner{text-align:left}.hero-visual{min-height:210px}.item-layout,.layout--split .item-layout,.layout--masonry .item-layout,.section--gallery .item-layout{grid-template-columns:1fr}.page-section{padding-top:calc(var(--space) * .8);padding-bottom:calc(var(--space) * .8)}.site-footer{flex-direction:column}}"
  ].join("\n");
  const mainJs = "(function(){var toggle=document.querySelector('.menu-toggle');var nav=document.querySelector('.site-nav');if(toggle&&nav){toggle.addEventListener('click',function(){var open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});}document.querySelectorAll('a[href^=\"#\"]').forEach(function(link){link.addEventListener('click',function(){if(nav)nav.classList.remove('is-open');if(toggle)toggle.setAttribute('aria-expanded','false');});});})();";
  const slug = slugify(options.startupName || spec.title);
  const packageJson = JSON.stringify({ name: slug, version: "1.0.0", private: true, scripts: { dev: "vite", build: "vite build", preview: "vite preview" }, devDependencies: { vite: "^6.0.0" } }, null, 2);
  const readmeMd = "# " + spec.title + "\n\nWebsite generated by THE MORN AI Website Studio.\n\n## Run locally\n\n1. Run npm install.\n2. Run npm run dev.\n3. Run npm run build to check the production bundle.\n\nReplace visible placeholders with verified business information before publishing.";
  return { indexHtml: html, stylesCss: css, mainJs, packageJson, readmeMd };
}
