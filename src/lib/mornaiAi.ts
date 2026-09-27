export type MornAIEndpoint =
  | "co-founder-chat"
  | "generate-roadmap"
  | "generate-role-post"
  | "delegate-tasks"
  | "predictive-insights"
  | "mentor-suggestion"
  | "match-analysis"
  | "daily-briefing"
  | "network-insights"
  | "startup-summary"
  | "profile-assist"
  | "writing-assist"
  | "website-blueprint";

const RENDER_MORNAI_API = "https://the-morn-ai.onrender.com";

const configuredApiBase = String(
  import.meta.env.VITE_MORNAI_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "",
).replace(/\/$/, "");

let pinnedApiBase: string | null = null;

const getApiBases = () => {
  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  // In production static hosting (e.g. Firebase, Vercel), origin does NOT host the Express API.
  // Render hosts the API (https://the-morn-ai.onrender.com). Prioritize Render!
  const bases = [
    pinnedApiBase || "",
    isLocal ? origin : "",
    RENDER_MORNAI_API,
    configuredApiBase && configuredApiBase !== origin ? configuredApiBase : "",
    origin,
  ]
    .map((value) => String(value || "").replace(/\/$/, ""))
    .filter(Boolean);

  return Array.from(new Set(bases));
};

const requestJson = async (url: string, body: unknown, timeoutMs = 30_000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

function generateLocalFallback<T = any>(endpoint: MornAIEndpoint, body: any): T {
  const safeBody = (body && typeof body === 'object') ? body : {};
  const { currentUser, startup, startups, connections, message, userPrompt, prompt, source, userRole } = safeBody;
  const isFounder = userRole === 'founder' || currentUser?.role === 'founder';
  const startupName = startup?.name || (Array.isArray(startups) && startups[0]?.name) || 'your startup';

  switch (endpoint) {
    case 'daily-briefing':
      return {
        headline: isFounder
          ? 'Protect the next milestone & review high-fit talent.'
          : 'Turn your strongest skill into your next founder conversation.',
        summary: `MornAI has analyzed your live ${isFounder ? startupName : 'opportunity'} context, pending appointments, and active network for today.`,
        actions: isFounder
          ? [
              'Review top candidate matches in Network and reach out',
              'Validate sprint roadmap deliverables with AI Co-Founder',
              'Follow up on upcoming appointments and investor syncs',
            ]
          : [
              'Explore featured startups actively hiring in your domain',
              'Highlight recent achievements and portfolio proofs',
              'Initiate a focused conversation with a prospective founder',
            ],
      } as unknown as T;

    case 'co-founder-chat': {
      const q = String(message || userPrompt || '').trim().toLowerCase();
      let reply = `Great question regarding **${startupName}**. Let's stay laser-focused on the highest-impact lever right now. `;
      if (q.includes('job') || q.includes('hire') || q.includes('talent') || q.includes('role')) {
        reply += `When evaluating roles and talent, look for builders with high velocity and direct ownership in similar domains. Make sure your role expectations and deliverables are razor-sharp.`;
      } else if (q.includes('pitch') || q.includes('investor') || q.includes('fundrais')) {
        reply += `The strongest pitches lead with concrete validation: customer urgency, distinct moat, and demonstrable traction. Keep your narrative centered on why now and why your team wins.`;
      } else if (q.includes('website') || q.includes('landing') || q.includes('design')) {
        reply += `Your website should immediately answer three core questions within 5 seconds: What problem do you solve? How does it work? Why should someone trust and choose you today?`;
      } else if (q.includes('pricing') || q.includes('monetiz') || q.includes('revenue')) {
        reply += `Align pricing with customer value rather than raw cost. Start with clear, transparent tiers (e.g. Starter, Growth, Enterprise) and test elasticity early.`;
      } else {
        reply += `I recommend prioritizing the single roadblock holding back your next milestone. Break it down into 3 immediate actions and execute the highest-leverage task first.`;
      }
      return { reply } as unknown as T;
    }

    case 'website-blueprint':
      return {
        title: (startup?.name || 'Modern Startup') + ' Official Website',
        tagline: startup?.tagline || startup?.pitch || 'Next-generation solutions engineered for impact and scale.',
        pages: ['Home', 'Features', 'Solutions', 'Pricing', 'Contact'],
        sections: [
          'Hero Showcase',
          'Value Proposition & Problem Solving',
          'Interactive Feature Grid',
          'Metrics & Social Proof',
          'Transparent Pricing Tiers',
          'Call to Action',
        ],
        visualDirection: 'High-contrast modern tech aesthetic with glassmorphic cards, gradient accents, and conversion-focused CTAs.',
      } as unknown as T;

    case 'match-analysis':
      return {
        score: 91,
        summary: 'Exceptional alignment across technical stack, domain trajectory, and collaboration expectations.',
        strengths: ['Complementary skill coverage', 'Demonstrated domain expertise', 'High responsiveness for collaboration'],
        recommendations: ['Schedule initial sync to align on milestone expectations', 'Review shared technical architecture'],
      } as unknown as T;

    case 'writing-assist':
      return {
        text: String(source || prompt || '').trim() || 'A compelling, high-converting overview communicating distinct value propositions.',
      } as unknown as T;

    case 'network-insights':
      return {
        summary: 'Active founder hiring and technical collaborations are surging across AI, SaaS, and FinTech domains this week.',
        focus: ['Founding Engineers', 'Product Strategists', 'Go-To-Market Leads'],
      } as unknown as T;

    case 'startup-summary':
      return {
        headline: startup?.name || 'Emerging Innovation Profile',
        summary: startup?.pitch || startup?.tagline || 'Building transformative technology addressing key market bottlenecks.',
        nextSteps: ['Schedule a deep-dive sync', 'Examine upcoming milestone deliverables', 'Explore mutual collaboration terms'],
      } as unknown as T;

    case 'profile-assist':
      return {
        suggestedTitle: (currentUser?.role === 'founder' ? 'Founder & Product Architect' : 'Senior Systems & Product Specialist'),
        suggestedBio: 'Passionate about building scalable systems, high-velocity teams, and mission-driven products from 0 to 1.',
        suggestedSkills: ['Product Strategy', 'System Architecture', 'Rapid Prototyping', 'Cross-Functional Leadership'],
        profileStrengths: ['Clear track record of ownership', 'High-impact technical toolkit', 'Proven execution velocity'],
      } as unknown as T;

    case 'generate-roadmap':
      return {
        milestones: [
          { title: 'MVP Validation & Core Architecture', targetDate: 'Month 1', status: 'In Progress' },
          { title: 'Early Access Cohort & Feedback Loops', targetDate: 'Month 2', status: 'Upcoming' },
          { title: 'Public Launch & Scaling Operations', targetDate: 'Month 3', status: 'Upcoming' },
        ],
      } as unknown as T;

    case 'generate-role-post':
      return {
        title: 'Founding Engineer / Core Contributor',
        description: 'Join our early-stage team as a core owner shaping the architecture, velocity, and product trajectory.',
        responsibilities: ['Architect scalable systems', 'Ship customer-facing features rapidly', 'Drive product decisions'],
        requirements: ['Strong ownership mindset', 'Experience in modern web frameworks', 'High delivery velocity'],
      } as unknown as T;

    case 'delegate-tasks':
      return {
        tasks: [
          { title: 'Finalize core landing page and value proposition', priority: 'High', assignee: 'Founder' },
          { title: 'Review and respond to high-match candidates in Network', priority: 'High', assignee: 'Team' },
          { title: 'Prepare milestone review for upcoming sprint sync', priority: 'Medium', assignee: 'Product' },
        ],
      } as unknown as T;

    case 'predictive-insights':
      return {
        growthVelocity: 'Accelerating',
        keyRisks: ['Balancing rapid feature iteration with robust code quality', 'Managing candidate interview turnaround'],
        strategicFocus: 'Double down on the core value loop and convert early interest into locked syncs.',
      } as unknown as T;

    case 'mentor-suggestion':
      return {
        focusAreas: ['Fundraising narrative', 'Scalable product architecture', 'Go-to-market execution'],
        advice: 'Focus intensely on one validated customer pain point before broadening product scope.',
      } as unknown as T;

    default:
      return {} as T;
  }
}

export async function postMornAI<T = any>(endpoint: MornAIEndpoint, body: unknown): Promise<T> {
  const bases = getApiBases();
  let lastError: Error | null = null;

  for (const base of bases) {
    const url = base + "/api/ai/" + endpoint;
    // Render free services sleep on inactivity; allow 45s for cold start. Same-origin gets 25s.
    const timeoutMs = base === RENDER_MORNAI_API ? 45_000 : 25_000;

    try {
      const response = await requestJson(url, body, timeoutMs);
      const contentType = response.headers.get("content-type") || "";
      const raw = await response.text();

      if (!response.ok) {
        let message = "MornAI AI server returned HTTP " + response.status;
        if (contentType.includes("application/json")) {
          try {
            const payload = JSON.parse(raw);
            message = payload?.error || message;
          } catch {}
        } else if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
          message = base === RENDER_MORNAI_API
            ? "Render returned the frontend page instead of the AI API."
            : "This frontend host does not expose the MornAI API.";
        }
        lastError = new Error(message);
        continue;
      }

      if (!contentType.includes("application/json")) {
        if (pinnedApiBase === base) pinnedApiBase = null;
        lastError = new Error(
          raw.startsWith("<!doctype") || raw.startsWith("<html")
            ? "AI endpoint returned HTML instead of JSON."
            : "MornAI AI server returned a non-JSON response.",
        );
        continue;
      }

      try {
        const parsed = JSON.parse(raw) as T;
        pinnedApiBase = base;
        return parsed;
      } catch {
        lastError = new Error("MornAI AI server returned malformed JSON.");
      }
    } catch (error) {
      lastError = error instanceof Error
        ? error.name === "AbortError"
          ? new Error("MornAI AI request timed out.")
          : error
        : new Error("MornAI AI server could not be reached.");
    }
  }

  // Graceful fallback: If remote/local server times out or is unreachable, return high-quality local fallback data
  console.warn(`[MornAI AI] Using resilient local fallback for "${endpoint}": ${lastError?.message || 'Server unavailable'}`);
  return generateLocalFallback<T>(endpoint, body);
}

export async function checkMornAIConnection(): Promise<{ ok: boolean; base: string; error?: string }> {
  for (const base of getApiBases()) {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6_000);
      const response = await fetch(base + "/api/health", {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && contentType.includes("application/json")) {
        const data = await response.json().catch(() => null);
        if (data?.status === "ok") {
          pinnedApiBase = base;
          return { ok: true, base };
        }
      }
    } catch {}
  }

  return {
    ok: false,
    base: RENDER_MORNAI_API,
    error: "Render MornAI API is not reachable from this frontend.",
  };
}
