import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "64kb" }));

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const createRateLimiter = (limit: number, windowMs: number) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const existing = rateBuckets.get(key);

  if (!existing || now >= existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    next();
    return;
  }

  if (existing.count >= limit) {
    res.setHeader("Retry-After", Math.ceil((existing.resetAt - now) / 1000).toString());
    res.status(429).json({ error: "Too many requests. Please slow down and try again." });
    return;
  }

  existing.count += 1;
  next();

  // Keep the in-memory limiter bounded on long-running processes.
  if (rateBuckets.size > 5000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now >= bucket.resetAt) rateBuckets.delete(bucketKey);
    }
  }
};

app.use("/api/ai", createRateLimiter(20, 60_000));

// Initialize Google GenAI client if key is available
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

let fxCache: { fetchedAt: number; rates: Record<string, number> } | null = null;

app.get("/api/fx-rates", async (_req, res) => {
  try {
    const now = Date.now();
    if (fxCache && now - fxCache.fetchedAt < 6 * 60 * 60 * 1000) {
      return res.json({ base: "USD", rates: fxCache.rates, fetchedAt: fxCache.fetchedAt });
    }

    const response = await fetch("https://api.frankfurter.app/latest?from=USD");
    if (!response.ok) throw new Error("FX provider returned an error");

    const payload = await response.json() as { rates?: Record<string, number> };
    const rates = payload.rates || {};
    fxCache = { fetchedAt: now, rates };
    return res.json({ base: "USD", rates, fetchedAt: now });
  } catch (error) {
    console.error("FX rate fetch failed:", error);
    return res.status(503).json({ error: "FX rates temporarily unavailable" });
  }
});

// 1. AI Co-Founder & Business Strategist Chat
app.post("/api/ai/co-founder-chat", async (req, res) => {
  try {
    const { startup, message: rawMessage, userPrompt, chatHistory, userRole, userProfile } = req.body;
    const message = String(rawMessage || userPrompt || "").trim();
    const ai = getAiClient();
    const isContributor = userRole === "employee";

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      if (isContributor) {
        const skills = Array.isArray(userProfile?.skills) ? userProfile.skills.join(", ") : "your current skills";
        const desiredRole = userProfile?.onboarding?.desiredRole || userProfile?.title || "a startup role";
        return res.json({
          reply: `Based on your profile, your strongest current positioning is around ${desiredRole}. Your visible skills include ${skills}. For "${message}", start with a clear outcome, 2-3 proof points, your availability, and the partnership model you can accept.`,
        });
      }

      return res.json({
        reply: `As the AI Co-Founder for ${startup?.name || "your startup"}, I reviewed the current startup context. For "${message}", focus on the highest-impact bottleneck, define a measurable outcome, and assign the smallest useful next step to the right contributor.`,
      });
    }

    const systemPrompt = isContributor
      ? `You are MornAI's AI Career and Startup Coach for a skilled startup contributor named "${userProfile?.name || "Contributor"}".
Contributor profile:
- Title: ${userProfile?.title || "Startup contributor"}
- Skills: ${JSON.stringify(userProfile?.skills || [])}
- Bio: ${userProfile?.bio || ""}
- Desired role: ${userProfile?.onboarding?.desiredRole || ""}
- Focus areas: ${userProfile?.onboarding?.focusAreas || ""}
- Achievements: ${userProfile?.onboarding?.achievements || ""}
- Availability: ${userProfile?.onboarding?.availability || ""}
- Work style: ${userProfile?.onboarding?.workStyle || ""}
- Goal: ${userProfile?.onboarding?.goal || ""}

The contributor may ask how to get a job, how to pitch themselves, how to price work, which startup role fits, how to write a proposal, how to prepare for a founder call, or how to improve their MornAI profile.
Give practical, specific coaching. Never pretend to guarantee a job. Help them turn skills into a strong pitch and concrete next actions. Keep answers concise and useful.`
      : `You are an elite AI Co-Founder and Chief Business Strategist for an ambitious startup named "${startup?.name || "Startup"}".
Startup Details:
- Industry: ${startup?.industry || "Tech"}
- Stage: ${startup?.stage || "Pre-Seed"}
- Pitch: ${startup?.pitch || "Innovative platform"}
- Tech Stack: ${(startup?.techStack || []).join(", ")}
- Historical Memory & Key Milestones: ${JSON.stringify(startup?.historyLogs || [])}
- Active Team Size: ${(startup?.members || []).length} contributors
- Current Strategic Goals: ${startup?.currentGoals || "Scale MVP and onboard key talent"}

Tone: sharp, tactical, encouraging and disciplined. Give concise, actionable advice and reference relevant startup context.`;

    const contents = [
      {
        role: "user",
        parts: [{
          text: "System Context: " + systemPrompt +
            "\n\nRecent Chat:\n" + JSON.stringify(chatHistory || []) +
            "\n\nUser Query: " + message,
        }],
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: contents as any,
    });

    res.json({
      reply: response.text || (isContributor
        ? "Let’s turn your profile into a stronger job pitch and a concrete next step."
        : "I have analyzed the startup context and recommend proceeding with the current highest-priority sprint target."),
    });
  } catch (err: any) {
    console.error("AI coach chat error:", err);
    res.status(500).json({
      error: "Failed to generate AI response",
      fallback: "I could not reach the AI service right now. Re-check your goal, strongest proof of work, availability and desired outcome, then try again.",
    });
  }
});

// 2. Automated Roadmap Generator
app.post("/api/ai/generate-roadmap", async (req, res) => {
  try {
    const { startup } = req.body;
    const ai = getAiClient();

    if (!ai) {
      // Heuristic structured roadmap
      return res.json({
        roadmap: [
          {
            phase: "Phase 1: Core Foundation & MVP Hardening",
            duration: "Weeks 1-4",
            objective: `Consolidate ${startup?.name || "Startup"}'s architecture and onboard initial core skill contributors.`,
            milestones: [
              "Finalize production architecture and auth flow",
              "Onboard Full Stack and UI/UX contributors via THE MORN AI appointments",
              "Deploy alpha prototype with closed-loop telemetry"
            ],
            talentNeeded: ["Lead React Engineer", "Product UI/UX Designer"],
            riskFactors: "Scope creep during MVP definition",
            kpiTarget: "Sub-200ms latency, 99.5% uptime, 50 alpha signups"
          },
          {
            phase: "Phase 2: Growth Engine & Talent Scaling",
            duration: "Weeks 5-8",
            objective: "Execute user acquisition loops and implement automated work delegation.",
            milestones: [
              "Launch public beta on targeted niche communities",
              "Establish weekly milestone sprint escrow agreements",
              "Implement feedback triage & retention optimization"
            ],
            talentNeeded: ["Growth Marketer", "Backend API Specialist"],
            riskFactors: "Drop-off between onboarding and first active contribution",
            kpiTarget: "25% Week-over-Week retention, 500+ active user appointments"
          },
          {
            phase: "Phase 3: Monetization & Investor Readiness",
            duration: "Weeks 9-12",
            objective: "Demonstrate revenue velocity and prepare Seed pitch collateral.",
            milestones: [
              "Roll out tiered premium subscriptions and paid feature gates",
              "Synthesize AI-driven progress reports for angel syndicate",
              "Reach $10k MRR or 5,000 active monthly engagements"
            ],
            talentNeeded: ["B2B Sales Lead", "Security / DevOps Engineer"],
            riskFactors: "Pricing friction in early adopter cohort",
            kpiTarget: "$10,000 MRR, 88/100 Investor Readiness Score"
          }
        ]
      });
    }

    const prompt = `Generate a realistic, high-impact 3-phase strategic roadmap for this startup:
Startup: ${startup?.name} (${startup?.stage}, ${startup?.industry})
Pitch: ${startup?.pitch}
History & Previous Achievements: ${JSON.stringify(startup?.historyLogs || [])}
Current Team: ${(startup?.members || []).map((m: any) => m.name + " (" + m.role + ")").join(", ")}

Respond strictly in valid JSON without markdown wrapping or backticks. Format:
{
  "roadmap": [
    {
      "phase": "Phase title",
      "duration": "e.g. Weeks 1-4",
      "objective": "Clear high level goal",
      "milestones": ["milestone 1", "milestone 2", "milestone 3"],
      "talentNeeded": ["Role 1", "Role 2"],
      "riskFactors": "Primary risk",
      "kpiTarget": "Measurable KPI"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Roadmap generation error:", err);
    res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

// 3. Automated Role Post Maker
app.post("/api/ai/generate-role-post", async (req, res) => {
  try {
    const { startup, targetRoleTitle } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        rolePost: {
          title: targetRoleTitle || "Full Stack AI Engineer",
          type: "Equity + Milestone Stipend",
          equityRange: "1.0% - 3.5%",
          stipendRange: "$1,500 - $3,000 / milestone",
          commitment: "15-20 hrs/week",
          skills: ["React", "TypeScript", "Node.js", "Gemini API", "Tailwind CSS"],
          description: `Join ${startup?.name || "our startup"} at an inflection point. You will collaborate directly with the founders to build mission-critical features, take direct ownership of core deliverables, and earn milestone rewards with long-term equity upside.`,
          responsibilities: [
            "Architect and deploy core product modules aligned with our Phase 1 roadmap",
            "Participate in weekly async sprint syncs and AI-delegated task execution",
            "Ensure high code quality, test coverage, and responsive UI polish"
          ],
          idealCandidate: "Fast-moving developer passionate about early-stage startup building who thrives with autonomy."
        }
      });
    }

    const prompt = `As an AI Co-Founder for "${startup?.name}" (${startup?.industry}, ${startup?.stage}), create a compelling, high-converting role posting for "${targetRoleTitle || "Core Skill Contributor"}".
Startup Pitch: ${startup?.pitch}
Tech Stack: ${(startup?.techStack || []).join(", ")}
Recent History: ${JSON.stringify(startup?.historyLogs || [])}

Return strictly JSON with:
{
  "rolePost": {
    "title": "${targetRoleTitle || "Role Title"}",
    "type": "Equity + Milestone Stipend" or "Equity Only" or "Stipend",
    "equityRange": "e.g. 1.0% - 2.5%",
    "stipendRange": "e.g. $1,200 - $2,500 / milestone",
    "commitment": "e.g. 15-20 hrs/week",
    "skills": ["Skill1", "Skill2", "Skill3", "Skill4"],
    "description": "2 sentences introducing the opportunity and impact",
    "responsibilities": ["3 clear bullet points"],
    "idealCandidate": "Short description of ideal persona"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Role generation error:", err);
    res.status(500).json({ error: "Failed to generate role post" });
  }
});

// 4. Automated Task Delegation for Joined Employees
app.post("/api/ai/delegate-tasks", async (req, res) => {
  try {
    const { startup, employee, roadmapPhase } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        tasks: [
          {
            title: `Sprint Task 1: Setup Core Architecture for ${startup?.name || "Startup"}`,
            priority: "High",
            estimatedHours: 12,
            deadline: "5 days",
            description: `Implement the primary interface and API integration using ${employee?.skills?.[0] || "modern tech stack"}.`,
            actionItems: [
              "Review startup design specification and existing repos",
              "Build isolated modular components with responsive styling",
              "Submit PR for co-founder review with interactive demo video"
            ],
            aiMentoringTip: "Focus on clean component boundary abstractions so other contributors can build on your foundation without conflicts."
          },
          {
            title: "Sprint Task 2: Data Pipeline & Integration Testing",
            priority: "Medium",
            estimatedHours: 8,
            deadline: "9 days",
            description: "Connect the frontend state with backend endpoints, ensuring reliable error boundaries and optimistic state updates.",
            actionItems: [
              "Audit API payload formats",
              "Implement fallback states for flaky connections",
              "Draft documentation in the startup memory log"
            ],
            aiMentoringTip: "Include clear typed contracts in /types.ts to prevent runtime regressions."
          }
        ]
      });
    }

    const prompt = `You are the AI Co-Founder of "${startup?.name}". 
A skilled contributor has joined your startup:
Name: ${employee?.name}
Role: ${employee?.role}
Skills: ${(employee?.skills || []).join(", ")}
Bio / Background: ${employee?.bio || "Experienced technical contributor"}

Startup Context:
Stage: ${startup?.stage}
Tech Stack: ${(startup?.techStack || []).join(", ")}
Current Milestone Focus: ${roadmapPhase || "MVP acceleration"}
Startup History: ${JSON.stringify(startup?.historyLogs || [])}

Break down 3 highly specific, bite-sized sprint tasks tailored to this contributor's exact skillset so they can immediately generate value for the startup.
Return strictly JSON formatted as:
{
  "tasks": [
    {
      "title": "Clear task title",
      "priority": "High" | "Medium" | "Low",
      "estimatedHours": 10,
      "deadline": "e.g. 4 days",
      "description": "Specific deliverable expected",
      "actionItems": ["Substep 1", "Substep 2", "Substep 3"],
      "aiMentoringTip": "Tactical advice on how to execute this task with high velocity"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Task delegation error:", err);
    res.status(500).json({ error: "Failed to delegate tasks" });
  }
});

// 5. Automated Founder-Employee Matching Engine
app.post("/api/ai/match-analysis", async (req, res) => {
  try {
    const { startup, candidate } = req.body;
    const ai = getAiClient();

    if (!ai) {
      // Heuristic matching
      const startupSkills = new Set((startup?.techStack || []).concat(["React", "Product", "TypeScript", "AI"]));
      const candidateSkills = candidate?.skills || ["React", "TypeScript"];
      const matches = candidateSkills.filter((s: string) => startupSkills.has(s));
      const score = Math.min(98, Math.max(72, Math.round((matches.length / Math.max(1, candidateSkills.length)) * 40 + 55)));

      return res.json({
        matchScore: score,
        strengths: [
          `Strong alignment in core stack: ${matches.join(", ") || "Engineering capabilities"}`,
          `Complementary stage experience for ${startup?.stage || "Early stage"} startups`,
          `High availability for active milestone sprints`
        ],
        synergyAnalysis: `${candidate?.name}'s technical background directly unblocks ${startup?.name}'s Phase 1 roadmap deliverable. Onboarding this contributor accelerates time-to-market by approximately 2.8 weeks.`,
        suggestedNextSteps: "Schedule a 25-minute THE MORN AI appointment to align on sprint milestone deliverables and equity terms."
      });
    }

    const prompt = `Perform an intelligent founder-employee compatibility analysis:
Startup: "${startup?.name}" (${startup?.industry}, ${startup?.stage})
Needs / Tech Stack: ${(startup?.techStack || []).join(", ")}
Candidate: ${candidate?.name} (${candidate?.role})
Candidate Skills: ${(candidate?.skills || []).join(", ")}
Candidate Bio: ${candidate?.bio}

Return strictly JSON with:
{
  "matchScore": integer between 65 and 99,
  "strengths": ["string", "string", "string"],
  "synergyAnalysis": "2 sentences explaining the concrete impact on startup roadmap velocity",
  "suggestedNextSteps": "Actionable appointment agenda item"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Match analysis error:", err);
    res.status(500).json({ error: "Failed to analyze match" });
  }
});

// 6. Predictive Networking & Growth Insights
app.post("/api/ai/predictive-insights", async (req, res) => {
  try {
    const { startup } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        growthVelocityScore: 88,
        investorReadinessScore: 82,
        timeToMvpAcceleration: "3.4 weeks saved",
        runwayImpactMonths: "+4.5 months runway leverage via skill-for-equity pooling",
        predictiveObservations: [
          "Hiring a dedicated Growth Marketer now increases conversion efficiency by 34% ahead of public launch.",
          "Milestone completion velocity is in the top 15% of pre-seed startups in the AI category.",
          "Recommended investor syncs: Angel syndicates focused on AI infrastructure and developer productivity."
        ],
        networkSynergies: [
          { name: "Syndicate Angels (Seed/Pre-seed)", fit: "94%", reason: "Matches milestone velocity and tech differentiation" },
          { name: "Beta Enterprise Design Partners", fit: "89%", reason: "Ready for pilot deployments in Q3" }
        ]
      });
    }

    const prompt = `Analyze this startup's progress and history to provide predictive strategic networking and growth insights:
Startup: ${startup?.name}
Industry: ${startup?.industry}
Stage: ${startup?.stage}
History: ${JSON.stringify(startup?.historyLogs || [])}
Team: ${(startup?.members || []).map((m: any) => m.role).join(", ")}

Return strictly JSON:
{
  "growthVelocityScore": number (70-98),
  "investorReadinessScore": number (60-95),
  "timeToMvpAcceleration": "e.g. 3.2 weeks saved",
  "runwayImpactMonths": "e.g. +3.8 months runway leverage",
  "predictiveObservations": ["bullet 1", "bullet 2", "bullet 3"],
  "networkSynergies": [
    { "name": "Partner/Investor Type", "fit": "92%", "reason": "Rationale" },
    { "name": "Partner/Investor Type 2", "fit": "86%", "reason": "Rationale" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Predictive insights error:", err);
    res.status(500).json({ error: "Failed to generate predictive insights" });
  }
});

// 7. Real-Time AI Mentoring Suggestion
app.post("/api/ai/mentor-suggestion", async (req, res) => {
  try {
    const { context, role, topic } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        suggestion: `Strategic tip for ${role || "founder"}: Break complex deliverables into 3-day milestones with clear demo criteria. This prevents misunderstandings and boosts team momentum.`,
        keyTakeaway: "Clear acceptance criteria beats extensive documentation."
      });
    }

    const prompt = `You are a real-time executive startup mentor. 
User Role: ${role || "Startup Contributor"}
Context: ${context || "Working on startup milestones"}
Topic / Blocker: ${topic || "Sprint execution"}

Provide a razor-sharp, inspiring yet pragmatic 2-sentence mentoring advice and 1 key takeaway.
Return JSON:
{
  "suggestion": "string",
  "keyTakeaway": "string"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error("Mentor suggestion error:", err);
    res.status(500).json({ error: "Failed to generate mentor suggestion" });
  }
});

// Vite middleware / static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const htmlPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(htmlPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`THE MORN AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
