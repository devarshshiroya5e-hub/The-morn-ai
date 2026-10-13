import test from "node:test";
import assert from "node:assert/strict";
import { createWebsiteGenerationFallback } from "../src/lib/websiteGenerationFallback";

test("Website Studio can return an editable starter when the remote coding model fails", () => {
  const website = createWebsiteGenerationFallback({
    startup: {
      name: "Harbor Dental",
      industry: "Dental clinic",
      tagline: "Thoughtful dental care",
    },
    prompt: "Create a calm, modern website for our dental clinic.",
  });

  assert.equal(website.degraded, true);
  assert.match(website.title, /Harbor Dental/);
  assert.match(website.html, /<html/i);
  assert.match(website.html, /<body/i);
  assert.ok(website.css.length >= 300);
  assert.ok(website.html.includes("Thoughtful dental care"));
  assert.ok(website.generationNote);
});

test("starter fallback uses the founder's brief and avoids invented pricing or testimonials", () => {
  const website = createWebsiteGenerationFallback({
    startup: { name: "Signal Studio", industry: "Creative agency" },
    prompt: "A distinctive website for video editing services.",
  });

  assert.match(website.tagline, /video editing services/i);
  assert.doesNotMatch(website.html, /\$\d+/);
  assert.doesNotMatch(website.html, /5-star|five-star|trusted by 10,000/i);
});
