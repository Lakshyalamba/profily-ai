import type {
  Interview,
  InterviewTurn,
  InterviewBrief,
  Activity,
} from "@/types/interview";
import type { Snapshot } from "@/types/intelligence";
const technologies = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Prisma",
  "Python",
  "FastAPI",
  "Gemini",
  "Tailwind",
  "Docker",
  "Kubernetes",
  "AWS",
  "Redis",
  "MongoDB",
  "GraphQL",
  "SQL",
  "Java",
  "Rust",
  "C++",
  "C#",
];
const topics: [string, RegExp][] = [
  ["Backend APIs", /\b(api|apis|backend|rest|endpoint|express)\b/i],
  [
    "Databases",
    /\b(database|databases|sql|postgresql|prisma|transaction|schema)\b/i,
  ],
  [
    "Authentication",
    /\b(auth|authentication|session|permissions|authorization)\b/i,
  ],
  [
    "Frontend development",
    /\b(react|frontend|front-end|interface|css|accessibility)\b/i,
  ],
  ["AI integration", /\b(gemini|llm|ai|retrieval)\b/i],
  [
    "Education & experience",
    /\b(education|degree|internship|intern|experience)\b/i,
  ],
  [
    "Architecture & projects",
    /\b(architecture|project|projects|design|tradeoffs)\b/i,
  ],
  ["Testing", /\b(test|tests|testing|validation)\b/i],
  ["Deployment", /\b(aws|kubernetes|docker|deployment|deploy|production)\b/i],
];
export function answerText(turn: InterviewTurn) {
  return [
    ...turn.answer.paragraphs.map((p) => p.text),
    ...turn.answer.unknowns,
  ].join("\n\n");
}
export function mentionedSkills(snapshot: Snapshot, turns: InterviewTurn[]) {
  const names = [
    ...new Map(
      [
        ...technologies,
        ...snapshot.candidate.skills.split(/[,\n]/),
        ...snapshot.candidate.projects.flatMap((p) => p.stack),
      ]
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length <= 80)
        .map((s) => [s.toLowerCase(), s]),
    ).values(),
  ];
  return names
    .map((name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        "(^|[^a-z0-9])" + escaped + "(?=$|[^a-z0-9])",
        "i",
      );
      return {
        name,
        turnCount: turns.filter((t) =>
          pattern.test(t.question + "\n" + answerText(t)),
        ).length,
      };
    })
    .filter((s) => s.turnCount > 0)
    .sort((a, b) => b.turnCount - a.turnCount || a.name.localeCompare(b.name));
}
/** Compile existing checked answers; do not introduce a new assessment of the candidate. */
export function compileBrief(
  interview: Interview,
  now = new Date(),
): InterviewBrief {
  const turns = interview.turns,
    seen = new Set<string>();
  const supportedExperience = turns
    .flatMap((t) =>
      t.answer.withheld
        ? []
        : t.answer.paragraphs
            .filter((p) => p.kind === "fact" && p.citations.length > 0)
            .flatMap((p) => {
              const key = p.text.toLowerCase().replace(/\s+/g, " ");
              if (seen.has(key)) return [];
              seen.add(key);
              return [{ text: p.text, citations: p.citations, turnId: t.id }];
            }),
    )
    .slice(0, 12);
  return {
    generatedAt: now.toISOString(),
    method: "compiled-evidence",
    questions: turns.map((t) => ({ turnId: t.id, text: t.question })),
    topics: topics
      .map(([name, pattern]) => ({
        name,
        turnIds: turns
          .filter((t) => pattern.test(t.question + "\n" + answerText(t)))
          .map((t) => t.id),
      }))
      .filter((t) => t.turnIds.length),
    skills: mentionedSkills(interview.snapshot, turns),
    supportedExperience,
    unverified: [
      ...new Map(
        turns.flatMap((t) =>
          t.answer.unknowns.map(
            (text) =>
              [
                text.toLowerCase().replace(/\s+/g, " ").trim(),
                { text, turnId: t.id },
              ] as const,
          ),
        ),
      ).values(),
    ].slice(0, 60),
  };
}
export function calculateAnalytics(activity: Activity, now = new Date()) {
  const skills = new Map<string, { name: string; turnCount: number }>();
  for (const session of activity.interviews)
    for (const skill of mentionedSkills(session.snapshot, session.turns)) {
      const key = skill.name.toLowerCase(),
        current = skills.get(key);
      skills.set(key, {
        name: current?.name || skill.name,
        turnCount: (current?.turnCount || 0) + skill.turnCount,
      });
    }
  const turns = activity.interviews.flatMap((s) => s.turns);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setUTCDate(day.getUTCDate() - 6 + i);
    const date = day.toISOString().slice(0, 10);
    return {
      date,
      turnCount: turns.filter((t) => t.createdAt.slice(0, 10) === date).length,
    };
  });
  const counts = { supported: 0, partial: 0, not_established: 0 };
  for (const match of activity.matches)
    for (const requirement of match.result.requirements)
      counts[requirement.status]++;
  return {
    sessionCount: activity.interviews.length,
    completedCount: activity.interviews.filter((s) => s.status === "completed")
      .length,
    turnCount: turns.length,
    voiceTurns: turns.filter((t) => t.inputMode === "voice").length,
    textTurns: turns.filter((t) => t.inputMode === "text").length,
    savedMatches: activity.matches.length,
    skills: [...skills.values()].sort(
      (a, b) => b.turnCount - a.turnCount || a.name.localeCompare(b.name),
    ),
    days,
    requirementCounts: counts,
    sessions: activity.interviews
      .map((s) => ({
        id: s.id,
        candidateName: s.snapshot.candidate.name,
        profileMode: s.profileMode,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        turnCount: s.turns.length,
        hasBrief: !!s.brief,
      }))
      .reverse(),
    matches: [...activity.matches].reverse(),
  };
}
export type Analytics = ReturnType<typeof calculateAnalytics>;

/** Follow-ups quote recorded uncertainty; they introduce no candidate facts or hiring advice. */
export function interviewFollowUps(interview: Interview) {
  const seen = new Set<string>();
  return (interview.brief?.unverified || [])
    .flatMap((item) => {
      if (seen.has(item.turnId)) return [];
      const turn = interview.turns.find((turn) => turn.id === item.turnId);
      if (!turn) return [];
      seen.add(item.turnId);
      return [
        {
          turnId: item.turnId,
          text: `For the question “${turn.question.slice(0, 220)}”, ask the candidate for a project, source, or concrete example that clarifies: “${item.text.slice(0, 280)}”.`,
        },
      ];
    })
    .slice(0, 5);
}
