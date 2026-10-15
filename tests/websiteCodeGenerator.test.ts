import test from "node:test";
import assert from "node:assert/strict";
import { composeGeneratedWebsiteFiles, hydrateWebsiteImage, validateGeneratedWebsite } from "../src/lib/websiteCodeGenerator";

const html = (headline: string) => '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Draft</title></head><body><header><a href="#top">Brand</a></header><main id="top"><section><p>Design-led introduction</p><h1>' + headline + '</h1><p>A bespoke page body with enough structure to form a valid generated website.</p><a href="#contact">Explore</a></section><section id="contact"><h2>Next steps</h2><p>Contact the team</p></section></main><footer>Brand</footer></body></html>';

function fixture(headline = "A different custom website") {
  return {
    title: "Custom Website",
    tagline: "A tailored website description",
    html: html(headline),
    css: "body{margin:0;font-family:Georgia,serif;background:#f2eee7;color:#211f1c}main{max-width:1080px;margin:auto;padding:8vw}h1{font-size:clamp(3rem,9vw,7rem);letter-spacing:-.06em}section{padding:4rem 0}header,footer{padding:2rem 4vw;border-bottom:1px solid #c7beb3}a{color:inherit;text-underline-offset:.25em}section+section{border-top:1px solid #c7beb3}a:focus-visible{outline:2px solid #9b3d2b;outline-offset:4px}",
    js: "document.querySelectorAll('a[href^=\"#\"]').forEach(function(a){a.addEventListener('click',function(){document.body.dataset.lastTarget=a.getAttribute('href');});});",
  };
}

test("keeps generated page source instead of wrapping it in a fixed template", () => {
  const first = composeGeneratedWebsiteFiles(fixture("A sculptural clinic"), { startupName: "Clinic" });
  const second = composeGeneratedWebsiteFiles(fixture("An editorial fashion studio"), { startupName: "Fashion" });
  assert.match(first.indexHtml, /A sculptural clinic/);
  assert.match(second.indexHtml, /An editorial fashion studio/);
  assert.notEqual(first.indexHtml, second.indexHtml);
  assert.match(first.stylesCss, /font-family:Georgia/);
  assert.match(first.indexHtml, /\.\/src\/styles\.css/);
  assert.match(first.indexHtml, /\.\/src\/main\.js/);
});

test("injects uploaded product photos only into the explicit image placeholder", () => {
  const page = fixture();
  page.html = page.html.replace("</section>", '<img alt="Product" src="__MORNAI_PRODUCT_IMAGE__"></section>');
  const result = composeGeneratedWebsiteFiles(page, { imageUrl: "data:image/png;base64,aGVsbG8=" });
  assert.match(result.indexHtml, /__MORNAI_PRODUCT_IMAGE__/);
  const preview = hydrateWebsiteImage(result.indexHtml, "data:image/png;base64,aGVsbG8=");
  assert.match(preview, /data:image\/png;base64,aGVsbG8=/);
  const noPhoto = composeGeneratedWebsiteFiles(page);
  assert.doesNotMatch(noPhoto.indexHtml, /__MORNAI_PRODUCT_IMAGE__/);
});

test("removes inline execution hooks and rejects remote-code or sandbox escape APIs", () => {
  const page = fixture();
  page.html = page.html.replace('<a href="#top">', '<a onclick="alert(1)" href="javascript:alert(1)">');
  const safe = validateGeneratedWebsite(page);
  assert.doesNotMatch(safe.html, /onclick=/i);
  assert.doesNotMatch(safe.html, /javascript:/i);
  assert.throws(() => validateGeneratedWebsite({ ...page, js: "fetch('https://example.com')" }), /restricted browser API/);
  assert.throws(() => validateGeneratedWebsite({ ...page, html: page.html.replace("<main", "<iframe src='x'></iframe><main") }), /unsupported embedded document/);
});

test("rejects truncated or malformed model responses", () => {
  assert.throws(() => validateGeneratedWebsite({ title: "Short", tagline: "Missing files", html: "<html></html>", css: "body{}", js: "" }), /incomplete|complete HTML/i);
});

test("preserves TypeScript source and exports a Vite-compatible TypeScript project", () => {
  const page = fixture("An interactive product builder") as ReturnType<typeof fixture> & { typescript: string };
  page.typescript = "const button: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>(\"#add\");\nbutton?.addEventListener(\"click\", () => { document.body.dataset.clicked = \"true\"; });";
  const result = composeGeneratedWebsiteFiles(page, { startupName: "Interactive Studio" });

  assert.equal(result.mainTs, page.typescript);
  assert.match(result.indexHtml, /<script type="module" src="\.\/src\/main\.ts"><\/script>/);
  assert.match(result.packageJson, /"typescript": "\^5\.8\.3"/);
  assert.match(result.packageJson, /"typecheck":/);
  assert.match(result.readmeMd, /npm run typecheck/);
});

test("rejects external TypeScript imports from isolated preview source", () => {
  const page = {
    ...fixture(),
    typescript: 'import { createRoot } from "react";',
  };
  assert.throws(() => validateGeneratedWebsite(page), /must not import external modules/);
});


test("normalizes root-relative and MornAI links to local website anchors", () => {
  const page = fixture("A custom local navigation site");
  page.html = page.html.replace("<body>", '<body><section id="how-it-works">How this site works</section><nav><a href="/">Home</a><a href="/how-it-works">How it works</a><a href="https://themorn.ai/get-in-touch">Get in touch</a></nav>');
  const result = validateGeneratedWebsite(page);
  assert.match(result.html, /href="#top"/);
  assert.match(result.html, /href="#how-it-works"/);
  assert.match(result.html, /href="#contact"/);
  assert.doesNotMatch(result.html, /href="https?:\/\/(?:www\.)?(?:themorn\.ai|mornai\.app)/i);
});

test("strips a verbatim founder prompt if the model echoes it into HTML", () => {
  const prompt = "Create a blue bicycle store landing page with a booking button.";
  const page = fixture("A bicycle store");
  page.html = page.html.replace("<body>", "<body><p>" + prompt + "</p>");
  const result = validateGeneratedWebsite(page, { prompt });
  assert.equal(result.html.toLowerCase().includes(prompt.toLowerCase()), false);
});

test("rejects generated code that attempts to navigate the preview frame", () => {
  const page = { ...fixture("Unsafe navigation"), js: 'window.location.href = "/";' };
  assert.throws(() => validateGeneratedWebsite(page), /restricted browser API/i);
});



test("accepts complete model-written HTML and extracts embedded CSS and JavaScript into editable files", () => {
  const rawHtml = [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><meta name="description" content="A custom bicycle shop"><title>Northline Cycles</title>',
    "<style>body{margin:0;font-family:Arial,sans-serif;background:#f4f0e8;color:#142018}header,main,footer{max-width:1100px;margin:auto;padding:2rem}h1{font-size:clamp(3rem,8vw,6rem);letter-spacing:-.05em}button{border:0;border-radius:999px;padding:1rem 1.5rem;background:#173d2b;color:white;cursor:pointer}button:hover{transform:translateY(-2px)}@media(max-width:700px){header,main,footer{padding:1.25rem}}</style></head>",
    '<body><header><a href="#top">Northline</a></header><main id="top"><h1>Ride further.</h1><p>Thoughtful bicycles for everyday adventures.</p><button id="details">Explore bikes</button><p id="notice" aria-live="polite"></p></main><footer>Built for the long road.</footer>',
    "<script>const button = document.querySelector('#details'); button?.addEventListener('click', () => { document.querySelector('#notice').textContent = 'Choose your next ride.'; });</script></body></html>",
  ].join("");
  const parsed = parseGeneratedWebsiteResponse(rawHtml, { startupName: "Northline Cycles" });
  assert.equal(parsed.title, "Northline Cycles");
  assert.equal(parsed.tagline, "A custom bicycle shop");
  assert.match(parsed.css, /font-family:Arial/);
  assert.match(parsed.js, /Choose your next ride/);
  assert.doesNotMatch(parsed.html, /<style|<script/i);
  const files = composeGeneratedWebsiteFiles(rawHtml, { startupName: "Northline Cycles" });
  assert.match(files.indexHtml, /<h1>Ride further\\.<\\/h1>/);
  assert.ok(files.indexHtml.split("\\n").length > 8, "HTML code should be formatted across multiple lines");
  assert.ok(files.stylesCss.split("\\n").length > 4, "CSS code should be formatted across multiple lines");
  assert.ok(files.mainJs.split("\\n").length > 2, "JavaScript code should be formatted across multiple lines");
});
