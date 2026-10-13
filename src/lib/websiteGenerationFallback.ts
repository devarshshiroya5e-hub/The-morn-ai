import { composeWebsiteFiles, validateWebsiteSpec } from "./websiteComposer";
import { validateGeneratedWebsite, type GeneratedWebsite } from "./websiteCodeGenerator";

type WebsiteFallbackInput = {
  startup?: { name?: unknown; industry?: unknown; tagline?: unknown; pitch?: unknown };
  prompt?: unknown;
  imageProvided?: unknown;
};

/**
 * Produce a clearly marked, editable starter site if the remote coding model is
 * unavailable. This keeps Website Studio usable without pretending the model
 * generated the source.
 */
export function createWebsiteGenerationFallback(input: WebsiteFallbackInput): GeneratedWebsite & { degraded: true } {
  const startup: NonNullable<WebsiteFallbackInput["startup"]> = input.startup && typeof input.startup === "object" ? input.startup : {};
  const name = clean(startup.name, 100) || "Your Business";
  const industry = clean(startup.industry, 120);
  const tagline = clean(startup.tagline, 240) || clean(startup.pitch, 240) || clean(input.prompt, 240) || "A clear, thoughtful experience for your customers.";
  const brief = clean(input.prompt, 360) || clean(startup.pitch, 360) || tagline;
  const context = (industry + " " + brief + " " + name).toLowerCase();

  const style = /dental|clinic|health|medical|doctor|wellness|skin|hospital/.test(context)
    ? "clinical"
    : /fashion|clothing|apparel|jewelry|luxury|beauty|salon/.test(context)
      ? "editorial"
      : /restaurant|cafe|coffee|food|organic|farm/.test(context)
        ? "organic"
        : /ai|software|saas|developer|technology|tech|app|platform/.test(context)
          ? "technical"
          : /design|creative|video|media|agency|art/.test(context)
            ? "bold"
            : "minimal";

  const spec = validateWebsiteSpec({
    title: name + " Website",
    tagline,
    theme: { style },
    hero: {
      layout: "split",
      eyebrow: industry || "Welcome",
      headline: clean(startup.tagline, 150) || "Discover " + name,
      subheadline: brief,
      primaryCta: "Get in touch",
      secondaryCta: "Explore",
    },
    sections: [
      {
        type: industry ? "services" : "features",
        title: industry ? "What we offer" : "A better way to get started",
        subtitle: "A starting point shaped around " + name + ".",
        layout: "split",
        items: [
          { title: "Built around your needs", body: brief },
          { title: "Clear next steps", body: "Add the specific services, products, or outcomes your business provides." },
          { title: "Details that matter", body: "Replace this starter copy with verified information about your offering." },
        ],
      },
      {
        type: "process",
        title: "How it works",
        subtitle: "Make the next step simple for visitors.",
        layout: "steps",
        items: [
          { title: "Explore", body: "Introduce the products or services that fit your audience." },
          { title: "Choose", body: "Explain how customers can decide what is right for them." },
          { title: "Connect", body: "Add your real contact details and preferred way to get in touch." },
        ],
      },
      {
        type: "faq",
        title: "Common questions",
        subtitle: "Add answers that reflect your actual business policies.",
        layout: "accordion",
        items: [
          { title: "What do you offer?", body: "Add a concise, accurate description of your products or services." },
          { title: "How can I get started?", body: "Add the real steps customers should follow to work with you." },
        ],
      },
      {
        type: "contact",
        title: "Let's start a conversation",
        subtitle: "Add your verified contact information before publishing.",
        layout: "banner",
        items: [{ title: "Contact", body: "Add your email, phone number, address, or booking link." }],
      },
    ],
  });

  const files = composeWebsiteFiles(spec, { startupName: name, prompt: brief });
  const validated = validateGeneratedWebsite({
    title: spec.title,
    tagline: spec.tagline,
    html: files.indexHtml,
    css: files.stylesCss,
    js: files.mainJs,
  });

  return { ...validated, degraded: true };
}

function clean(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max)
    : "";
}
