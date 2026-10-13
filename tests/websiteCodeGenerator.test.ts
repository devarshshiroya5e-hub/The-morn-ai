import test from "node:test";
import assert from "node:assert/strict";
import { composeGeneratedWebsiteFiles, validateGeneratedWebsite } from "../src/lib/websiteCodeGenerator";

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
  assert.match(result.indexHtml, /data:image\/png;base64,aGVsbG8=/);
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
