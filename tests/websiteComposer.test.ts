import test from "node:test";
import assert from "node:assert/strict";
import { composeWebsiteFiles, groundSensitiveWebsiteClaims, validateWebsiteSpec } from "../src/lib/websiteComposer";

function fixture(kind: "dental" | "saas" | "fashion") {
  const common = {
    title: kind + " studio", tagline: "A useful, honest website for " + kind,
    theme: {
      style: kind === "dental" ? "clinical" : kind === "saas" ? "technical" : "editorial",
      palette: kind === "dental"
        ? { background: "#f7fbfc", surface: "#ffffff", text: "#17313b", muted: "#58717b", primary: "#087e8b", accent: "#bde7e7" }
        : kind === "saas"
          ? { background: "#080d18", surface: "#111a2a", text: "#edf4ff", muted: "#9daec5", primary: "#6b9cff", accent: "#42dfbd" }
          : { background: "#f6f1e9", surface: "#fffdf8", text: "#2c2723", muted: "#796f65", primary: "#9b3d2b", accent: "#d9b680" },
      headingFont: kind === "fashion" ? "serif" : "sans", bodyFont: "sans",
      spacing: kind === "fashion" ? "airy" : "balanced", corners: kind === "saas" ? "square" : "soft"
    },
    hero: {
      layout: kind === "dental" ? "centered" : kind === "saas" ? "split" : "editorial",
      eyebrow: kind, headline: kind === "dental" ? "Comfortable care, close to home" : kind === "saas" ? "Ship software with clarity" : "A quieter kind of statement",
      subheadline: "Details shaped for " + kind, primaryCta: "Explore", secondaryCta: ""
    },
    sections: kind === "dental" ? [
      { type: "services", title: "Dental services", layout: "grid", items: [{ title: "Preventive care", body: "Add clinic details here." }] },
      { type: "steps", title: "Your visit", layout: "steps", items: [{ title: "Book", body: "Add appointment details." }] },
      { type: "contact", title: "Request an appointment", layout: "banner", items: [{ body: "Add clinic contact details." }] }
    ] : kind === "saas" ? [
      { type: "features", title: "A connected workflow", layout: "grid", items: [{ title: "Plan", body: "Describe your product." }, { title: "Build", body: "Describe your product." }] },
      { type: "process", title: "How it works", layout: "steps", items: [{ title: "Connect", body: "Add process details." }] },
      { type: "faq", title: "Technical questions", layout: "accordion", items: [{ title: "How does it work?", body: "Add a verified answer." }] }
    ] : [
      { type: "gallery", title: "The collection", layout: "masonry", items: [{ title: "Look one", body: "Add garment details." }, { title: "Look two", body: "Add garment details." }] },
      { type: "products", title: "Made to be worn", layout: "split", items: [{ title: "Signature piece", body: "Add fabric and fit details." }] },
      { type: "contact", title: "Find your fit", layout: "banner", items: [{ body: "Add store contact details." }] }
    ]
  };
  return common;
}

test("distinct industry specifications produce different theme, hero, and section order", () => {
  const dental = composeWebsiteFiles(fixture("dental"), { startupName: "Harbor Dental" });
  const saas = composeWebsiteFiles(fixture("saas"), { startupName: "Signal SaaS" });
  const fashion = composeWebsiteFiles(fixture("fashion"), { startupName: "Studio Atelier" });
  assert.match(dental.indexHtml, /theme-clinical/);
  assert.match(dental.indexHtml, /hero--centered/);
  assert.match(saas.indexHtml, /theme-technical/);
  assert.match(saas.indexHtml, /hero--split/);
  assert.match(fashion.indexHtml, /theme-editorial/);
  assert.match(fashion.indexHtml, /hero--editorial/);
  assert.ok(dental.indexHtml.indexOf("Dental services") < dental.indexHtml.indexOf("Your visit"));
  assert.ok(saas.indexHtml.indexOf("A connected workflow") < saas.indexHtml.indexOf("How it works"));
  assert.ok(fashion.indexHtml.indexOf("The collection") < fashion.indexHtml.indexOf("Made to be worn"));
  assert.notEqual(dental.stylesCss, saas.stylesCss);
  assert.notEqual(saas.stylesCss, fashion.stylesCss);
});

test("rejects incomplete or unsupported specifications", () => {
  assert.throws(() => validateWebsiteSpec({ title: "Missing" }), /missing a title, tagline/);
  const invalid = fixture("dental") as any;
  invalid.sections[0].type = "run-script";
  assert.throws(() => validateWebsiteSpec(invalid), /Unsupported website section/);
});

test("escapes hostile copy and grounds unsupported prices, metrics, and testimonials", () => {
  const raw = fixture("saas") as any;
  raw.hero.headline = "<script>alert(1)</script>Ship faster";
  raw.sections.push({ type: "pricing", title: "Plans", layout: "grid", items: [{ title: "Pro", price: "$999", body: "Trusted by 10,000 teams." }] });
  raw.sections.push({ type: "stats", title: "Results", layout: "grid", items: [{ title: "Customers", label: "Users", value: "10,000+", body: "Worldwide" }] });
  raw.sections.push({ type: "testimonials", title: "Praise", layout: "cards", items: [{ quote: "This is the best product ever.", author: "A famous customer" }] });
  const grounded = groundSensitiveWebsiteClaims(validateWebsiteSpec(raw), "Signal SaaS is a workflow product.");
  const files = composeWebsiteFiles(grounded);
  assert.ok(!files.indexHtml.includes("<script>alert(1)</script>"));
  assert.ok(files.indexHtml.includes("Price not provided"));
  assert.ok(files.indexHtml.includes("Add metric"));
  assert.ok(files.indexHtml.includes("Add an approved customer quote here."));
  assert.ok(files.indexHtml.includes("./src/styles.css"));
  assert.ok(files.indexHtml.includes("./src/main.js"));
});
