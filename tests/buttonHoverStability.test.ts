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

test("interactive buttons physically lift on hover while their lower-edge hover guard stays in place", () => {
  for (const selector of [
    "button:hover",
    "[role=\"button\"]:hover",
    'a[class*="btn"]:hover',
    'a[class*="button"]:hover',
  ]) {
    assert.ok(stabilityCss.includes(selector), `missing lifted interaction selector: ${selector}`);
  }

  assert.match(stabilityCss, /transform:\s*translateY\(-2px\)\s*!important/);
  assert.match(stabilityCss, /top:\s*calc\(100% - 3px\)/);
  assert.match(stabilityCss, /height:\s*6px/);
  assert.match(stabilityCss, /button:hover::after[\s\S]*?transform:\s*translateY\(2px\)/);
  assert.match(stabilityCss, /transition-property:\s*transform,/);
});

test("press feedback and reduced-motion accessibility are preserved", () => {
  assert.match(stabilityCss, /button:active[\s\S]*?transform:\s*translateY\(-1px\)/);
  assert.match(stabilityCss, /\.mornai-ai-btn:hover[\s\S]*?drop-shadow/);
  assert.match(stabilityCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(stabilityCss, /prefers-reduced-motion:\s*reduce[\s\S]*?transform:\s*none\s*!important/);
});
