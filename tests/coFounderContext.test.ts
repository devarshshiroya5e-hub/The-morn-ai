import test from "node:test";
import assert from "node:assert/strict";
import { buildCoFounderContext } from "../src/lib/coFounderContext";

test("Co-Founder context includes detailed startup strategy, execution, and founder profile", () => {
  const context = buildCoFounderContext(
    {
      founderId: "uid-123",
      name: "Northstar",
      tagline: "Simple planning for clinics",
      industry: "HealthTech",
      stage: "Pre-Seed",
      problem: "Clinics lose time coordinating appointments.",
      solution: "A scheduling and patient workflow platform.",
      targetCustomer: "Independent clinics",
      businessModel: "Monthly SaaS subscription",
      tractionDetails: "Three pilot clinics",
      techStack: ["React", "TypeScript"],
      members: [{ name: "Asha", role: "Product Designer", status: "active", skills: ["Figma"] }],
      openRoles: [{ title: "Backend Developer", skills: ["Node.js"], description: "Build the API" }],
      roadmap: [{ phase: "MVP", title: "Pilot launch", status: "in_progress", kpiTarget: "3 clinics" }],
      tasks: [{ title: "Interview clinic managers", priority: "High", actionItems: ["Schedule interviews"] }],
      historyLogs: [{ date: "2026-10-01", title: "Pilot started", description: "Started a pilot" }],
    },
    {
      id: "uid-123",
      name: "Founder Name",
      email: "private@example.com",
      title: "Product Founder",
      bio: "Building healthcare software.",
      skills: ["Product strategy", "Customer research"],
      onboarding: { story: "Experienced clinic operator", goal: "Validate the product", availability: "Full-time" },
    },
  );

  assert.equal(context.startup.identity.name, "Northstar");
  assert.equal(context.startup.productAndMarket.targetCustomer, "Independent clinics");
  assert.equal(context.startup.team[0].name, "Asha");
  assert.equal(context.startup.openRoles[0].title, "Backend Developer");
  assert.equal(context.startup.roadmap[0].kpiTarget, "3 clinics");
  assert.equal(context.user.name, "Founder Name");
  assert.deepEqual(context.user.skills, ["Product strategy", "Customer research"]);
  assert.equal(context.user.onboarding.goal, "Validate the product");
  assert.equal(JSON.stringify(context).includes("private@example.com"), false);
});

test("Co-Founder context safely handles missing or malformed profile data", () => {
  const context = buildCoFounderContext(null, { name: "Founder", skills: "not-an-array" });
  assert.equal(context.startup.identity.name, undefined);
  assert.equal(context.user.name, "Founder");
  assert.deepEqual(context.user.skills, []);
});
