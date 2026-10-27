import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const entry = fs.readFileSync(path.join(root, "src", "main.tsx"), "utf8");
const stabilityCss = fs.readFileSync(path.join(root, "src", "mornaiButtonStability.css"), "utf8");

test("button stability stylesheet is loaded after existing motion styles", () => {
  const imports = [
    "import './index.css';",
    "import './mornaiMotionPolish.css';",
    "import './mornaiPerformance.css';",
    "import './mornaiButtonStability.css';",
  ];
  let previousIndex = -1;

  for (const statement of imports) {
    const index = entry.indexOf(statement);
    assert.ok(index > previousIndex, `expected ${statement} after the previous stylesheet import`);
    previousIndex = index;
  }
});

test("hover, focus, and active states keep interactive pointer targets stationary", () => {
  for (const selector of [
    "button:hover",
    "button:focus-visible",
    "button:active",
    "a:hover",
    "a:focus-visible",
    "a:active",
    '[role="button"]:hover',
    '[role="button"]:focus-visible',
    '[role="button"]:active',
  ]) {
    assert.ok(stabilityCss.includes(selector), `missing stable interaction selector: ${selector}`);
  }

  assert.match(stabilityCss, /transform:\s*none\s*!important/);
  assert.match(stabilityCss, /translate:\s*none\s*!important/);
  assert.match(stabilityCss, /rotate:\s*none\s*!important/);
  assert.match(stabilityCss, /scale:\s*none\s*!important/);
});

test("button lift is animated through a moving drop shadow, not target geometry", () => {
  assert.match(stabilityCss, /filter:\s*drop-shadow\(0 3px 5px rgba\(79, 70, 229, 0\)\) brightness\(1\) saturate\(1\)/);
  assert.match(stabilityCss, /button:hover[\s\S]*?drop-shadow\(0 1px 11px rgba\(79, 70, 229, \.16\)\)/);
  assert.match(stabilityCss, /button:active[\s\S]*?drop-shadow\(0 2px 3px/);
  assert.match(stabilityCss, /\.mornai-ai-btn:hover[\s\S]*?drop-shadow\(0 1px 12px/);
  assert.match(stabilityCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
