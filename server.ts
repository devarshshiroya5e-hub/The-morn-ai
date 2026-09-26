import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set("trust proxy", 1);

// Firebase Google OAuth uses a cross-origin popup. Keep the opener in the
// browser context group so Firebase can safely inspect popup state.
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

app.use(express.json({ limit: "64kb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "*")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin =
    configuredOrigins.includes("*")
      ? "*"
      : origin && configuredOrigins.includes(origin)
        ? origin
        : null;

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

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

app.use("/api/ai", createRateLimiter(40, 60_000));

// Unified MornAI AI provider: OpenRouter first, Gemini fallback.
const PAID_MODEL_IDS = {
  ultra: "nvidia/nemotron-3-ultra-550b-a55b",
  super: "nvidia/nemotron-3-super-120b-a12b",
  gemma: "google/gemma-4-31b-it",
} as const;

const FREE_MODEL_IDS = {
  ultra: "nvidia/nemotron-3-ultra-550b-a55b:free",
  super: "nvidia/nemotron-3-super-120b-a12b:free",
  gemma: "google/gemma-4-31b-it:free",
} as const;

// Zero-credit OpenRouter accounts can use the free model variants.
// Set MORNAI_USE_PAID_MODELS=true in Render when paid credits are available.
const MODEL_IDS =
  process.env.MORNAI_USE_PAID_MODELS === "true"
    ? PAID_MODEL_IDS
    : FREE_MODEL_IDS;
const FAST_FREE_TEXT_MODEL = "stealth/space-bunny-alpha";
type AiContent = string | Array<{ role?: string; parts?: Array<{ text?: string }> }>;
type AiGenerateOptions = {
  model: string;
  contents: AiContent | any;
  config?: {
    responseMimeType?: string;
    maxTokens?: number;
    temperature?: number;
  };
};
let geminiClient: GoogleGenAI | null = null;
let lastAiProviderFailure: {
  at: string;
  model: string;
  status?: number;
  message: string;
} | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { "User-Agent": "mornai-production" } } });
  return geminiClient;
}
function uniqueKeys(values: Array<string | undefined>) { return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))); }
function keysForModel(model: string) {
  const isUltra = model === PAID_MODEL_IDS.ultra || model === FREE_MODEL_IDS.ultra;
  const isSuper = model === PAID_MODEL_IDS.super || model === FREE_MODEL_IDS.super;
  const isGemma = model === PAID_MODEL_IDS.gemma || model === FREE_MODEL_IDS.gemma;

  const specific = isUltra
    ? process.env.OPENROUTER_API_KEY_NEMOTRON_ULTRA
    : isSuper
      ? process.env.OPENROUTER_API_KEY_NEMOTRON_SUPER
      : isGemma
        ? process.env.OPENROUTER_API_KEY_GEMMA
        : undefined;

  return uniqueKeys([
    specific,
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_1,
  ]);
}

function hasAnyOpenRouterKey() {
  return Boolean(
    keysForModel(MODEL_IDS.ultra).length ||
    keysForModel(MODEL_IDS.super).length ||
    keysForModel(MODEL_IDS.gemma).length
  );
}

function normalizeMessages(contents: AiContent | any) {
  if (typeof contents === "string") return [{ role: "user", content: contents }];
  if (!Array.isArray(contents)) return [{ role: "user", content: String(contents ?? "") }];
  return contents.map((entry: any) => ({ role: entry?.role === "assistant" ? "assistant" : "user", content: Array.isArray(entry?.parts) ? entry.parts.map((part: any) => part?.text || "").join("\n") : String(entry?.content ?? entry?.text ?? "") }));
}
function parseAiJson(text: string) {
  const clean = String(text || "").trim();
  try { return JSON.parse(clean); } catch {}
  const fenced = clean.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i)?.[1];
  if (fenced) { try { return JSON.parse(fenced); } catch {} }
  const objectStart = clean.indexOf("{"); const objectEnd = clean.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) { try { return JSON.parse(clean.slice(objectStart, objectEnd + 1)); } catch {} }
  return null;
}
async function openRouterGenerateContent(options: AiGenerateOptions) {
  let lastError: unknown = null;

  for (const model of modelFallbacks(
    options.model,
    options.config?.responseMimeType === "application/json",
  )) {
    const keys = keysForModel(model);
    if (!keys.length) continue;

    for (const key of keys) {
      try {
        const body: Record<string, unknown> = {
          model,
          messages: normalizeMessages(options.contents),
          temperature: options.config?.temperature ?? 0.2,
          max_tokens: options.config?.maxTokens ?? 800,
        };

        if (
          options.config?.responseMimeType === "application/json" &&
          !(MODEL_IDS === FREE_MODEL_IDS && model === FREE_MODEL_IDS.ultra)
        ) {
          body.response_format = { type: "json_object" };
        }

        const headers: Record<string, string> = {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "X-Title": "THE MORN AI",
        };

        if (process.env.MORNAI_APP_URL) {
          headers["HTTP-Referer"] = process.env.MORNAI_APP_URL;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);

        let response: Response;
        try {
          response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal },
          );
        } finally {
          clearTimeout(timeout);
        }

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          const providerMessage =
            payload?.error?.message ||
            "OpenRouter request failed (" + response.status + ")";

          lastAiProviderFailure = {
            at: new Date().toISOString(),
            model,
            status: response.status,
            message: String(providerMessage).slice(0, 500),
          };

          lastError = new Error(String(providerMessage));
          continue;
        }

        const text = payload?.choices?.[0]?.message?.content;
        if (!text) {
          lastError = new Error("OpenRouter returned an empty response");
          continue;
        }

        return { text: String(text) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lastAiProviderFailure = {
          at: new Date().toISOString(),
          model,
          message: message.slice(0, 500),
        };
        lastError = error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter request failed");
}
function resolveModel(requested: string) {
  if (requested === "mornai-ultra") return MODEL_IDS.ultra;
  if (requested === "mornai-super") return MODEL_IDS.super;
  if (requested === "mornai-gemma") return MODEL_IDS.gemma;
  if (requested === "gemini-3.8-flash") return MODEL_IDS.super;
  return requested;
}

function modelFallbacks(model: string, needsJson = false) {
  // Keep fallback chains short so failed free-model queues do not burn 30s+.
  const fallbackOrder =
    model === FAST_FREE_TEXT_MODEL
      ? [FAST_FREE_TEXT_MODEL, MODEL_IDS.gemma]
      : model === MODEL_IDS.ultra
        ? [MODEL_IDS.ultra, MODEL_IDS.gemma]
        : model === MODEL_IDS.super
          ? [MODEL_IDS.super, MODEL_IDS.gemma]
          : model === MODEL_IDS.gemma
            ? [MODEL_IDS.gemma, FAST_FREE_TEXT_MODEL]
            : [model];

  // Prefer structured-output capable models for JSON requests.
  if (needsJson && MODEL_IDS === FREE_MODEL_IDS) {
    if (model === MODEL_IDS.ultra || model === FAST_FREE_TEXT_MODEL) {
      return [MODEL_IDS.gemma, MODEL_IDS.super];
    }
  }

  return fallbackOrder;
}
function getAiClient() {
  const hasOpenRouter = hasAnyOpenRouterKey();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  if (!hasOpenRouter && !hasGemini) return null;

  return {
    models: {
      generateContent: async (options: AiGenerateOptions) => {
        const model = resolveModel(options.model);

        if (hasOpenRouter) {
          try {
            return await openRouterGenerateContent({ ...options, model });
          } catch (error) {
            console.error("OpenRouter AI request failed; trying Gemini fallback:", error);
          }
        }

        const gemini = getGeminiClient();
        if (gemini) {
          try {
            const response = await gemini.models.generateContent({
              model: "gemini-2.0-flash",
              contents: options.contents as any,
              config: options.config as any,
            });
            return { text: response.text || "" };
          } catch (error) {
            console.error("Gemini AI fallback failed:", error);
          }
        }

        throw new Error("No AI provider could complete the request");
      },
    },
  };
}
app.get("/api/firebase-config", async (_req, res) => {
  try {
    const response = await fetch("https://themorn-ai.firebaseapp.com/__/firebase/init.json", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Firebase web configuration is unavailable" });
    }

    const config = await response.json();
    if (
      typeof config?.apiKey !== "string" ||
      typeof config?.projectId !== "string"
    ) {
      return res.status(502).json({ error: "Firebase web configuration is invalid" });
    }

    return res.json(config);
  } catch (error) {
    console.error("Firebase config proxy failed:", error);
    return res.status(502).json({ error: "Firebase web configuration is unavailable" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ai/status", (_req, res) => {
  const keyStatus = {
    generic: Boolean(process.env.OPENROUTER_API_KEY),
    secondary: Boolean(process.env.OPENROUTER_API_KEY_1),
    gemma: Boolean(process.env.OPENROUTER_API_KEY_GEMMA),
    nemotronSuper: Boolean(process.env.OPENROUTER_API_KEY_NEMOTRON_SUPER),
    nemotronUltra: Boolean(process.env.OPENROUTER_API_KEY_NEMOTRON_ULTRA),
    geminiFallback: Boolean(process.env.GEMINI_API_KEY),
  };

  const configuredModels = {
    ultra: keysForModel(MODEL_IDS.ultra).length > 0,
    super: keysForModel(MODEL_IDS.super).length > 0,
    gemma: keysForModel(MODEL_IDS.gemma).length > 0,
  };

  res.json({
    status: hasAnyOpenRouterKey() || keyStatus.geminiFallback ? "configured" : "not-configured",
    provider: hasAnyOpenRouterKey() ? "openrouter" : keyStatus.geminiFallback ? "gemini" : "none",
    mode: MODEL_IDS === FREE_MODEL_IDS ? "free" : "paid",
    keys: keyStatus,
    models: {
      ...configuredModels,
      ids: MODEL_IDS,
    },
    lastProviderFailure: lastAiProviderFailure,
  });
});

let fxCache: { fetchedAt: number; rates: Record<string, number> } | null = null;

app.get("/api/fx-rates", async (_req, res) => {
  try {
    const now = Date.now();
    if (fxCache && now - fxCache.fetchedAt < 6 * 60 * 60 * 1000) {
      return res.json({ base: "USD", rates: fxCache.rates, fetchedAt: fxCache.fetchedAt });
    }

    const rates: Record<string, number> = { USD: 1 };

    // Frankfurter covers major ECB currencies well.
    try {
      const frankfurter = await fetch("https://api.frankfurter.app/latest?from=USD");
      if (frankfurter.ok) {
        const payload = await frankfurter.json() as { rates?: Record<string, number> };
        Object.assign(rates, payload.rates || {});
      }
    } catch (error) {
      console.warn("Frankfurter FX unavailable:", error);
    }

    // open.er-api covers a much wider set (INR, AED, etc.).
    try {
      const openEr = await fetch("https://open.er-api.com/v6/latest/USD");
      if (openEr.ok) {
        const payload = await openEr.json() as { result?: string; rates?: Record<string, number> };
        if (payload.result === "success" && payload.rates) {
          for (const [code, value] of Object.entries(payload.rates)) {
            if (typeof value === "number" && Number.isFinite(value) && value > 0) {
              rates[code.toUpperCase()] = value;
            }
          }
        }
      }
    } catch (error) {
      console.warn("open.er-api FX unavailable:", error);
    }

    if (Object.keys(rates).length <= 1) {
      throw new Error("No FX providers returned rates");
    }

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
Give practical, specific coaching. Never pretend to guarantee a job. Help them turn skills into a strong pitch and concrete next actions.

Response format:
### Answer
Give the direct answer in 2-5 short paragraphs. Use a few relevant emojis (🎯 🚀 ✅ 💡 ⚠️) where they add clarity.

### Key points
- Give 3-5 concrete points when useful. Wrap the most important phrases in **double asterisks** so they stand out.

### Next actions
1. Give 1-3 specific actions the user can take now.

Rules:
- Keep normal answers around 120-300 words.
- Keep simple questions under 150 words.
- Prioritize the highest-impact information first.
- Use short sentences and bullets.
- Highlight critical advice, metrics, deadlines, and decisions with **bold markers**.
- Include 2-6 relevant emojis across the reply — never spam every line.
- Do not invent experience, salary, job availability or qualifications.
- Do not use tables unless the user specifically asks for one.`
      : `You are an elite AI Co-Founder and Chief Business Strategist for an ambitious startup named "${startup?.name || "Startup"}".
Startup Details:
- Industry: ${startup?.industry || "Tech"}
- Stage: ${startup?.stage || "Pre-Seed"}
- Pitch: ${startup?.pitch || "Innovative platform"}
- Tech Stack: ${(startup?.techStack || []).join(", ")}
- Historical Memory & Key Milestones: ${JSON.stringify((startup?.historyLogs || []).slice(-8))}
- Active Team Size: ${(startup?.members || []).length} contributors
- Current Strategic Goals: ${startup?.currentGoals || "Scale MVP and onboard key talent"}

Tone: sharp, tactical, direct and practical. Do not repeat the user's question. Do not write a long essay.

Response format:
### Answer
Give the direct answer in 2-5 short paragraphs. Use a few relevant emojis (🎯 🚀 ✅ 💡 ⚠️ 🔥) where they add clarity.

### Key points
- Give 3-5 concrete points when useful. Wrap the most important phrases in **double asterisks** so they stand out.

### Next actions
1. Give 1-3 specific actions the user can take now.

Rules:
- Keep normal answers around 120-300 words.
- Keep simple questions under 150 words.
- Prioritize the highest-impact information first.
- Use short sentences and bullets.
- Highlight critical advice, metrics, deadlines, and decisions with **bold markers**.
- Include 2-6 relevant emojis across the reply — never spam every line.
- Do not invent startup facts, metrics or people.
- Do not use tables unless the user specifically asks for one.`;

    const contents = [
      {
        role: "user",
        parts: [{
          text: "System Context: " + systemPrompt +
            "\n\nRecent Chat:\n" + JSON.stringify(
              (chatHistory || [])
                .slice(-4)
                .map((entry: any) => ({
                  sender: entry?.sender,
                  text: String(entry?.text || "").slice(-900),
                })),
            ) +
            "\n\nUser Query: " + message,
        }],
      },
    ];

    const chatModel =
      process.env.MORNAI_USE_PAID_MODELS === "true"
        ? MODEL_IDS.ultra
        : FAST_FREE_TEXT_MODEL;

    const response = await ai.models.generateContent({
      model: chatModel,
      contents: contents as any,
      config: {
        maxTokens: 700,
        temperature: 0.12,
      },
    });

    res.json({
      reply: response.text || (isContributor
        ? "Let’s turn your profile into a stronger job pitch and a concrete next step."
        : "I have analyzed the startup context and recommend proceeding with the current highest-priority sprint target."),
    });
  } catch (err: any) {
    console.error("AI coach chat error:", err);

    const isContributor = req.body?.userRole === "employee";
    const profile = req.body?.userProfile || {};
    const startup = req.body?.startup || {};
    const userMessage = String(req.body?.message || req.body?.userPrompt || "").trim();

    const fallbackReply = isContributor
      ? `I could not reach the model service for this message, but your next useful move is to turn "${userMessage || "your current goal"}" into one concrete outcome, one proof point, and one startup conversation. Your profile currently emphasizes ${profile?.title || "your startup skills"}.`
      : `I could not reach the model service for this message, but the immediate move for ${startup?.name || "your startup"} is to define one measurable outcome for "${userMessage || "the current priority"}" and assign the smallest actionable next step.`;

    // AI provider/model failures should not crash the product shell. Return a
    // usable degraded response so the frontend remains functional while the
    // provider recovers or configuration is corrected.
    res.status(200).json({
      reply: fallbackReply,
      degraded: true,
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
      model: MODEL_IDS.gemma,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxTokens: 900,
        temperature: 0.2,
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
      model: MODEL_IDS.gemma,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxTokens: 700,
        temperature: 0.2,
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
      model: FAST_FREE_TEXT_MODEL,
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
      model: MODEL_IDS.gemma,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxTokens: 450,
        temperature: 0.15,
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
      model: "mornai-gemma",
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

// 8. Personalized AI daily briefing
app.post("/api/ai/daily-briefing", async (req, res) => {
  try {
    const { currentUser, startups, appointments, connections } = req.body;
    const ai = getAiClient();
    const fallback = {
      headline: currentUser?.role === "founder" ? "Protect the next milestone." : "Turn your strongest skill into your next conversation.",
      summary: "MornAI is using your live startup, appointment, connection, and profile context to focus today.",
      actions: currentUser?.role === "founder" ? ["Review the highest-priority roadmap item", "Check open roles and pending syncs", "Ask MornAI to pressure-test your next decision"] : ["Review your strongest startup matches", "Refresh one proof point on your profile", "Start one focused founder conversation"],
    };
    if (!ai) return res.json(fallback);
    const prompt = "You are MornAI daily operating assistant. Return JSON only with headline, summary, and exactly 3 actions. Do not invent facts.\nUser: " + JSON.stringify(currentUser || {}) + "\nStartups: " + JSON.stringify((startups || []).slice(0, 10)) + "\nAppointments: " + JSON.stringify((appointments || []).slice(0, 10)) + "\nConnections: " + JSON.stringify((connections || []).slice(0, 10));
    const response = await ai.models.generateContent({ model: MODEL_IDS.gemma, contents: prompt, config: { responseMimeType: "application/json" } });
    const parsed = parseAiJson(response.text) || {};
    const safeActions = Array.isArray(parsed.actions)
      ? parsed.actions
          .map((item: any) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item.action === "string") return item.action.trim();
            if (item && typeof item.text === "string") return item.text.trim();
            return "";
          })
          .filter(Boolean)
          .slice(0, 3)
      : [];
    res.json({
      headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : fallback.headline,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary,
      actions: safeActions.length === 3 ? safeActions : fallback.actions,
    });
  } catch (error) {
    console.error("Daily briefing error:", error);
    res.status(200).json({ headline: "Your next useful move", summary: "MornAI could not refresh the briefing right now.", actions: ["Open your workspace", "Review network matches", "Ask MornAI directly"] });
  }
});

// 9. AI network explanation
app.post("/api/ai/network-insights", async (req, res) => {
  try {
    const { currentUser, people, startups, query } = req.body;
    const ai = getAiClient();
    const fallback = { summary: "Matching combines skills, role fit, startup stage, availability, and current activity.", focus: ["Strong skill alignment", "Relevant startup stage", "Clear next action"] };
    if (!ai) return res.json(fallback);
    const prompt = "Act as MornAI network intelligence. Explain the most useful matching signals without inventing qualifications. Return JSON with summary and exactly 3 focus items.\nUser: " + JSON.stringify(currentUser || {}) + "\nPeople: " + JSON.stringify((people || []).slice(0, 20)) + "\nStartups: " + JSON.stringify((startups || []).slice(0, 20)) + "\nSearch: " + String(query || "");
    const response = await ai.models.generateContent({ model: "mornai-gemma", contents: prompt, config: { responseMimeType: "application/json" } });
    res.json(parseAiJson(response.text) || fallback);
  } catch (error) {
    console.error("Network insights error:", error);
    res.status(200).json({ summary: "Matching is based on live profile and network context.", focus: ["Skills", "Role fit", "Availability"] });
  }
});

// 10. AI startup explorer brief
app.post("/api/ai/startup-summary", async (req, res) => {
  try {
    const { startup, currentUser } = req.body;
    const ai = getAiClient();
    const fallback = { headline: (startup?.name || "Startup") + " at a glance", summary: startup?.pitch || startup?.tagline || "Explore the startup context, open roles and roadmap.", nextSteps: ["Review open roles", "Review the team", "Open MornAI strategist"] };
    if (!ai) return res.json(fallback);
    const prompt = "You are the MornAI startup explorer. Summarize this startup for a potential contributor or collaborator. Return JSON with headline, summary, and exactly 3 nextSteps. Ground every statement in supplied data.\nStartup: " + JSON.stringify(startup || {}) + "\nViewer profile: " + JSON.stringify(currentUser || {});
    const response = await ai.models.generateContent({ model: "mornai-gemma", contents: prompt, config: { responseMimeType: "application/json" } });
    res.json(parseAiJson(response.text) || fallback);
  } catch (error) {
    console.error("Startup summary error:", error);
    const startup = req.body?.startup;
    res.status(200).json({ headline: "Startup overview", summary: startup?.pitch || startup?.tagline || "", nextSteps: ["Review roles", "Review team", "Ask MornAI"] });
  }
});

// 11. AI profile optimizer
app.post("/api/ai/profile-assist", async (req, res) => {
  try {
    const { profile } = req.body;
    const ai = getAiClient();
    const fallback = { suggestedTitle: profile?.title || (profile?.role === "founder" ? "Startup Founder" : "Startup Contributor"), suggestedBio: profile?.bio || "", suggestedSkills: profile?.skills || [], profileStrengths: ["Clear role positioning", "Specific skills", "Concrete outcomes"] };
    if (!ai) return res.json(fallback);
    const prompt = "Improve this MornAI profile without inventing experience. Return JSON with suggestedTitle, suggestedBio, suggestedSkills, and exactly 3 profileStrengths.\nProfile: " + JSON.stringify(profile || {});
    const response = await ai.models.generateContent({ model: "mornai-gemma", contents: prompt, config: { responseMimeType: "application/json" } });
    res.json(parseAiJson(response.text) || fallback);
  } catch (error) {
    console.error("Profile assist error:", error);
    const profile = req.body?.profile;
    res.status(200).json({ suggestedTitle: profile?.title || "Startup Contributor", suggestedBio: profile?.bio || "", suggestedSkills: profile?.skills || [], profileStrengths: ["Specific skills", "Role context", "Clear goals"] });
  }
});

// 12. Fast AI text expansion and rewriting for profile/auth/startup fields
app.post("/api/ai/writing-assist", async (req, res) => {
  const { text: inputText, field, context } = req.body || {};
  const source = String(inputText || "").trim().slice(0, 4500);
  const fieldName = String(field || "text").trim().slice(0, 120);
  const contextText = typeof context === "string"
    ? context.slice(0, 1200)
    : JSON.stringify(context || {}).slice(0, 1200);

  if (!source) return res.status(400).json({ error: "Enter some text before using AI." });

  const localPolish = (raw: string) => {
    const sentences = raw
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

    if (sentences.length <= 1) {
      return (
        sentences[0] || raw
      ) + (raw.length < 80
        ? ` This ${fieldName.toLowerCase()} highlights what matters most and keeps the story clear, specific, and easy for others on MornAI to understand.`
        : "");
    }

    if (sentences.length <= 3) {
      return sentences.join(" ");
    }

    const lead = sentences.slice(0, 2).join(" ");
    const rest = sentences.slice(2);
    return lead + "\n\n" + rest.map((s) => "• " + s.replace(/^[•\-]\s*/, "")).join("\n");
  };

  try {
    const ai = getAiClient();
    if (!ai) {
      return res.json({ text: localPolish(source), local: true });
    }

    const prompt =
      "You are MornAI writing assist. Expand and organize the user's draft for the named field.\n" +
      "Return JSON only with exactly one key: text.\n" +
      "Goals:\n" +
      "- Make the writing more engaging, clearer, and better organized.\n" +
      "- Expand short drafts into a richer but still truthful description (aim for roughly 1.5x-3x length when the draft is thin).\n" +
      "- Use short paragraphs; use bullets only when they improve scanability.\n" +
      "- Keep the user's meaning, voice, and facts. Do not invent credentials, customers, revenue, metrics, employers, dates, or achievements.\n" +
      "- Never return the exact same text unless it is already excellent and complete.\n" +
      "- Never include instructions, analysis, labels, or commentary in the text value.\n" +
      "User field: " + fieldName +
      "\nUser text: " + source +
      "\nContext: " + (contextText || "None");

    const softMax = source.length < 80
      ? 420
      : source.length < 220
        ? 700
        : 1100;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "mornai-gemma",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          maxTokens: softMax,
          temperature: 0.35,
        },
      });
    } catch {
      response = await ai.models.generateContent({
        model: FAST_FREE_TEXT_MODEL,
        contents: prompt + "\nReturn only JSON like {\"text\":\"...\"}.",
        config: {
          maxTokens: softMax,
          temperature: 0.35,
        },
      });
    }

    const parsed = parseAiJson(response.text);
    let rewritten = typeof parsed?.text === "string" ? parsed.text.trim() : "";

    if (!rewritten) {
      const raw = String(response.text || "").trim();
      if (raw && !raw.startsWith("{")) rewritten = raw;
    }

    const leaked =
      /we need to rewrite|requirements:|user text:|context:|return json|return only|must preserve|do not invent|you are mornai|source text:/i.test(rewritten);

    if (leaked || !rewritten) {
      return res.json({ text: localPolish(source), local: true });
    }

    // If the model barely changed the draft, still polish locally so the button feels useful.
    const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();
    if (normalize(rewritten) === normalize(source) || rewritten.length < source.length * 1.05) {
      const polished = localPolish(source);
      if (normalize(polished) !== normalize(source)) {
        return res.json({ text: polished.slice(0, 5000), local: true });
      }
    }

    return res.json({ text: rewritten.slice(0, 5000) });
  } catch (error) {
    console.error("Writing assist error:", error);
    return res.status(200).json({ text: localPolish(source), local: true });
  }
});

// 12. AI website blueprint for the Website Studio
app.post("/api/ai/website-blueprint", async (req, res) => {
  try {
    const { startup, prompt: founderBrief, imageProvided } = req.body;
    const ai = getAiClient();
    const fallback = { title: (startup?.name || "Startup") + " website", tagline: startup?.tagline || startup?.pitch || "Build something people want.", pages: ["Home", "Product", "About", "Contact"], sections: ["Hero", "Value proposition", "How it works", "Proof", "CTA"], visualDirection: imageProvided ? "Use the uploaded product image as the primary visual anchor." : "Premium modern startup interface with restrained glass and blue-violet accents." };
    if (!ai) return res.json(fallback);
    const prompt = "Design an AI website blueprint. Do not claim to have analyzed image pixels; imageProvided only means an image was uploaded. Return JSON with title, tagline, pages, sections, and visualDirection.\nStartup: " + JSON.stringify(startup || {}) + "\nFounder brief: " + String(founderBrief || "") + "\nImage provided: " + Boolean(imageProvided);
    const response = await ai.models.generateContent({ model: "mornai-gemma", contents: prompt, config: { responseMimeType: "application/json" } });
    res.json(parseAiJson(response.text) || fallback);
  } catch (error) {
    console.error("Website blueprint error:", error);
    const startup = req.body?.startup;
    res.status(200).json({ title: startup?.name || "Startup website", tagline: startup?.tagline || startup?.pitch || "", pages: ["Home", "Product", "About", "Contact"], sections: ["Hero", "Value proposition", "CTA"], visualDirection: "Premium modern startup website." });
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
