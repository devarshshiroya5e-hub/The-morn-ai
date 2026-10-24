import test from "node:test";
import assert from "node:assert/strict";
import { buildHeuristicMatchAnalysis } from "../src/lib/matchAnalysis";

test("match fallback returns the same shape the booking screen expects", () => {
  const result = buildHeuristicMatchAnalysis(
    {
      name: "MornAI",
      stage: "Pre-Seed",
      techStack: ["React", "TypeScript"],
      openRoles: [{ title: "Developer", skills: ["Firebase"] }],
    },
    {
      name: "A contributor",
      title: "Frontend developer",
      skills: ["React", "TypeScript", "Video Editing"],
    },
  );

  assert.equal(result.matchScore, 79);
  assert.deepEqual(result.strengths[0], "Shared listed skills: React, TypeScript");
  assert.match(result.synergyAnalysis, /Quick skills-based estimate/);
  assert.equal(typeof result.suggestedNextSteps, "string");
  assert.equal(result.degraded, true);
});

test("match fallback avoids an invented high score when there is no skill data", () => {
  const result = buildHeuristicMatchAnalysis({ name: "Example" }, {});
  assert.equal(result.matchScore, 58);
  assert.match(result.synergyAnalysis, /limited explicit skills overlap/);
});
