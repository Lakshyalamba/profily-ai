import { answerSchema } from "@/types/profile";
export function demoAnswer(question: string) {
  const q = question.toLowerCase();
  let text =
    "The sample evidence does not establish that experience. Try asking about Taskflow, PostgreSQL, backend APIs, React, CodeLens, or Alex’s internship. Missing evidence is not proof of a missing skill.";
  let evidenceIds: string[] = [];
  if (/postgres|database|prisma|sql/.test(q)) {
    text =
      "The fictional Taskflow schema uses PostgreSQL through Prisma for users, workspaces, memberships, and tasks. It describes foreign-key relationships and a transaction for task creation and assignment. This supports a discussion of relational data modeling; it does not establish production database operations experience.";
    evidenceIds = ["taskflow-db"];
  } else if (/backend|api|auth|taskflow|challeng/.test(q)) {
    text =
      "Taskflow is a useful project to explore in this fictional profile. Its sample API source describes Zod input validation, session-based workspace membership checks, and owner/member permissions. Its schema describes relational modeling and transactional writes. These are concrete backend topics to ask about in an interview. The sample does not establish that this was Alex’s hardest project, or prove production scale or security.";
    evidenceIds = ["taskflow-api", "taskflow-db"];
  } else if (/ai|gemini|codelens|python/.test(q)) {
    text =
      "The sample CodeLens README describes a Python/FastAPI service that retrieves selected source snippets for Gemini and includes file references in answers. It supports an AI integration example, but provides no measured accuracy, evaluation results, or production usage.";
    evidenceIds = ["lens-readme"];
  } else if (/front|react|accessib|open ui|typescript/.test(q)) {
    text =
      "Open UI’s sample README describes a React and TypeScript component explorer, Tailwind styling, keyboard navigation, responsive layouts, and theme switching. Those are illustrative frontend features; a formal accessibility audit is not established.";
    evidenceIds = ["openui-readme"];
  } else if (/intern|education|experience|about|who/.test(q)) {
    text =
      "Alex’s fictional resume lists a May–July 2026 internship at Example Studio, contributing React components and API integration. It also lists a Computer Science degree in progress, 2023–2027. These are sample resume claims, not independently verified employment or education.";
    evidenceIds = ["resume"];
  }
  return answerSchema.parse({ text, evidenceIds, mode: "demo" });
}
