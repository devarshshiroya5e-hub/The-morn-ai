type DataRecord = Record<string, unknown>;

const asRecord = (value: unknown): DataRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as DataRecord
    : {};

const cleanText = (value: unknown, maxLength = 900): string | undefined => {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return undefined;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : undefined;
};

const cleanNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const cleanTextList = (value: unknown, maxItems = 24, maxLength = 120): string[] =>
  Array.isArray(value)
    ? value
        .slice(0, maxItems)
        .map((item) => cleanText(item, maxLength))
        .filter((item): item is string => Boolean(item))
    : [];

const pickTextFields = (source: DataRecord, fields: string[], maxLength = 900): Record<string, string> =>
  Object.fromEntries(
    fields
      .map((field) => [field, cleanText(source[field], maxLength)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );

const ONBOARDING_FIELDS = [
  "story", "goal", "startupName", "startupStage", "industry", "availability",
  "workStyle", "experienceLevel", "profileTitle", "contribution", "motivation",
  "problem", "targetCustomer", "traction", "previousWins", "desiredRole",
  "focusAreas", "achievements", "idealStartup", "region", "countryCode",
];

function summarizeOnboarding(value: unknown) {
  return pickTextFields(asRecord(value), ONBOARDING_FIELDS, 700);
}

function summarizeMember(value: unknown): Record<string, any> {
  const member = asRecord(value);
  const summary: DataRecord = {
    ...pickTextFields(member, ["name", "role", "status", "joinedDate", "equityOrStipend"], 180),
    skills: cleanTextList(member.skills, 16),
  };
  const profileDetails = summarizeOnboarding(member.profileDetails);
  if (Object.keys(profileDetails).length) summary.profileDetails = profileDetails;
  return summary;
}

function summarizeRole(value: unknown): Record<string, any> {
  const role = asRecord(value);
  return {
    ...pickTextFields(
      role,
      ["title", "type", "equityRange", "stipendRange", "commitment", "description", "idealCandidate", "status"],
      650,
    ),
    skills: cleanTextList(role.skills, 16),
    responsibilities: cleanTextList(role.responsibilities, 8, 300),
    partnership: pickTextFields(asRecord(role.partnership), [
      "mode", "label", "equityPercent", "currencyCode", "unit", "milestone", "period", "details", "expectation",
    ], 300),
  };
}

function summarizeMilestone(value: unknown): Record<string, any> {
  const milestone = asRecord(value);
  return {
    ...pickTextFields(
      milestone,
      ["phase", "title", "description", "duration", "kpiTarget", "status", "riskFactors"],
      700,
    ),
    talentNeeded: cleanTextList(milestone.talentNeeded, 12),
  };
}

function summarizeTask(value: unknown): Record<string, any> {
  const task = asRecord(value);
  return {
    ...pickTextFields(
      task,
      ["title", "priority", "status", "deadline", "description", "aiMentoringTip"],
      600,
    ),
    estimatedHours: cleanNumber(task.estimatedHours),
    actionItems: cleanTextList(task.actionItems, 8, 250),
  };
}

function summarizeHistory(value: unknown) {
  const entry = asRecord(value);
  return pickTextFields(entry, ["date", "type", "title", "description", "impact"], 650);
}

/**
 * Create a compact, privacy-conscious snapshot for each AI Co-Founder request.
 * Account identifiers, email addresses, avatar URLs, and credentials are
 * deliberately excluded; strategic profile and startup data are retained.
 */
export function buildCoFounderContext(startupInput: unknown, userInput: unknown) {
  const startup = asRecord(startupInput);
  const user = asRecord(userInput);

  const startupContext: Record<string, any> = {
    identity: pickTextFields(startup, [
      "name", "tagline", "industry", "stage", "pitch", "website", "foundedYear",
      "founderName", "location",
    ], 1200),
    productAndMarket: pickTextFields(startup, [
      "problem", "solution", "targetCustomer", "businessModel", "tractionDetails",
      "competitiveAdvantage", "foundingStory", "vision", "currentChallenges", "currentGoals",
    ], 1600),
    resources: {
      techStack: cleanTextList(startup.techStack, 30),
      fundingRaised: cleanText(startup.fundingRaised, 120),
      valuationUsd: cleanNumber(startup.valuationUsd),
      currencyCode: cleanText(startup.currencyCode, 12),
    },
    team: Array.isArray(startup.members) ? startup.members.slice(0, 16).map(summarizeMember) : [],
    openRoles: Array.isArray(startup.openRoles) ? startup.openRoles.slice(0, 18).map(summarizeRole) : [],
    roadmap: Array.isArray(startup.roadmap) ? startup.roadmap.slice(0, 12).map(summarizeMilestone) : [],
    currentTasks: Array.isArray(startup.tasks) ? startup.tasks.slice(0, 16).map(summarizeTask) : [],
    historyAndMilestones: Array.isArray(startup.historyLogs)
      ? startup.historyLogs.slice(-12).map(summarizeHistory)
      : [],
    platformSignals: {
      investorReadinessScore: cleanNumber(startup.investorReadinessScore),
      growthVelocityScore: cleanNumber(startup.growthVelocityScore),
      verified: typeof startup.verified === "boolean" ? startup.verified : undefined,
    },
  };

  const userContext: Record<string, any> = {
    ...pickTextFields(user, [
      "name", "role", "title", "bio", "hourlyRate", "equityPreference",
    ], 1400),
    skills: cleanTextList(user.skills, 30),
    reputationScore: cleanNumber(user.reputationScore),
    completedMilestones: cleanNumber(user.completedMilestones),
    onboarding: summarizeOnboarding(user.onboarding),
  };

  // Keep the serialized context predictable for the Groq free-tier input budget.
  // Oldest history records are dropped first; current role/task/roadmap data stays.
  while (
    JSON.stringify({ startup: startupContext, user: userContext }).length > 20_000
  ) {
    if (startupContext.historyAndMilestones.length > 2) {
      startupContext.historyAndMilestones.shift();
    } else if (startupContext.currentTasks.length > 6) {
      startupContext.currentTasks.pop();
    } else if (startupContext.openRoles.length > 8) {
      startupContext.openRoles.pop();
    } else if (startupContext.roadmap.length > 6) {
      startupContext.roadmap.pop();
    } else if (startupContext.team.length > 8) {
      startupContext.team.pop();
    } else {
      break;
    }
  }

  return { startup: startupContext, user: userContext };
}
