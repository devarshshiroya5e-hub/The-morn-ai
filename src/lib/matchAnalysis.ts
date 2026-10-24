export interface MatchAnalysisResult {
  matchScore: number;
  strengths: string[];
  synergyAnalysis: string;
  suggestedNextSteps: string;
  degraded?: boolean;
}

type LooseRecord = Record<string, unknown>;

const toRecord = (value: unknown): LooseRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as LooseRecord
    : {};

const toStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => typeof item === "string" ? item.trim() : "")
        .filter(Boolean)
    : [];

const toText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

/**
 * A transparent, deterministic match estimate to keep the booking flow useful
 * when the live model/API cannot be reached. It is not presented as an AI verdict.
 */
export function buildHeuristicMatchAnalysis(
  startupValue: unknown,
  candidateValue: unknown,
): MatchAnalysisResult {
  const startup = toRecord(startupValue);
  const candidate = toRecord(candidateValue);
  const roleSkills = Array.isArray(startup.openRoles)
    ? startup.openRoles.flatMap((role) => toStrings(toRecord(role).skills))
    : [];
  const requiredSkills = new Set(
    [...toStrings(startup.techStack), ...roleSkills]
      .map((skill) => skill.toLocaleLowerCase()),
  );
  const candidateSkills = Array.from(new Map(
    toStrings(candidate.skills).map((skill) => [skill.toLocaleLowerCase(), skill]),
  ).values());
  const matchedSkills = candidateSkills.filter((skill) =>
    requiredSkills.has(skill.toLocaleLowerCase()),
  );
  const coverage = candidateSkills.length
    ? matchedSkills.length / candidateSkills.length
    : 0;
  const matchScore = candidateSkills.length
    ? Math.max(45, Math.min(95, Math.round(48 + coverage * 47)))
    : 58;
  const startupName = toText(startup.name, "this startup");
  const candidateName = toText(candidate.name, "This candidate");
  const sharedSkills = matchedSkills.length
    ? matchedSkills.slice(0, 4).join(", ")
    : "";

  return {
    matchScore,
    strengths: [
      sharedSkills
        ? `Shared listed skills: ${sharedSkills}`
        : "Review the candidate's listed skills against the startup's actual role requirements.",
      `Startup stage: ${toText(startup.stage, "not specified")}`,
      `Candidate focus: ${toText(candidate.title, "general startup contribution")}`,
    ],
    synergyAnalysis: sharedSkills
      ? `Quick skills-based estimate: ${candidateName}'s listed skills (${sharedSkills}) overlap with ${startupName}'s technology or open-role requirements. This is an initial signal, not a full compatibility verdict.`
      : `Quick skills-based estimate: there is limited explicit skills overlap between ${candidateName}'s profile and ${startupName}'s listed requirements. Review role expectations and transferable experience before deciding.`,
    suggestedNextSteps: `Discuss the role's first deliverable, availability, and partnership terms for ${startupName} before making a decision.`,
    degraded: true,
  };
}
