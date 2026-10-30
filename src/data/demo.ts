import { evidenceSchema } from "@/types/profile";
export const candidate = {
  name: "Alex Morgan",
  headline: "Full-stack developer. Thoughtful problem solver.",
  location: "Bengaluru, India",
  initials: "AM",
  intro:
    "I build accessible interfaces and dependable APIs. I’m looking for an internship where I can turn complex problems into useful, well-crafted software.",
  skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Python"],
  education:
    "B.Tech in Computer Science · Example Institute of Technology · 2023–2027",
  experience:
    "Software engineering intern · Example Studio · May–July 2026. Contributed React components and API integration for an internal inventory tool.",
};
export const projects = [
  {
    id: "taskflow",
    name: "Taskflow",
    category: "BACKEND + FULL STACK",
    description:
      "A collaborative task manager with workspace permissions, searchable tasks, and a dependable API.",
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    evidenceIds: ["taskflow-api", "taskflow-db"],
    icon: "layers",
  },
  {
    id: "lens",
    name: "CodeLens",
    category: "AI-ASSISTED TOOLS",
    description:
      "A code explanation assistant that retrieves selected source snippets and returns answers with file references.",
    stack: ["Python", "Gemini", "FastAPI"],
    evidenceIds: ["lens-readme"],
    icon: "code",
  },
  {
    id: "openui",
    name: "Open UI",
    category: "FRONTEND + ACCESSIBILITY",
    description:
      "A responsive component explorer with keyboard navigation, reusable React primitives, and theme switching.",
    stack: ["React", "TypeScript", "Tailwind"],
    evidenceIds: ["openui-readme"],
    icon: "layout",
  },
];
export const evidence = evidenceSchema.array().parse([
  {
    id: "taskflow-api",
    title: "Taskflow · sample API source",
    kind: "sample-repository",
    excerpt:
      "Synthetic source summary: POST /api/tasks validates input with Zod and checks workspace membership using a session. The author describes role checks for owner and member. No security audit or production deployment is established.",
  },
  {
    id: "taskflow-db",
    title: "Taskflow · sample schema",
    kind: "sample-repository",
    excerpt:
      "Synthetic schema summary: PostgreSQL through Prisma. User, Workspace, Membership and Task models use foreign-key relationships; task creation and assignment are wrapped in a transaction.",
  },
  {
    id: "lens-readme",
    title: "CodeLens · sample README",
    kind: "sample-repository",
    excerpt:
      "Synthetic README: a FastAPI service retrieves selected Python source snippets for Gemini prompts. Responses include file references. This sample does not establish model evaluation results or production-scale usage.",
  },
  {
    id: "openui-readme",
    title: "Open UI · sample README",
    kind: "sample-repository",
    excerpt:
      "Synthetic README: React and TypeScript component explorer styled with Tailwind. Includes keyboard navigation, responsive layouts, and a light/dark theme. No formal accessibility audit is provided.",
  },
  {
    id: "resume",
    title: "Alex Morgan · sample resume",
    kind: "sample-resume",
    excerpt:
      "Fictional candidate: B.Tech Computer Science, Example Institute of Technology, 2023–2027. Intern at Example Studio, May–July 2026, contributing React components and API integration to an inventory tool. Skills listed: TypeScript, React, Next.js, Node.js, PostgreSQL, Python.",
  },
]);
export const suggestedQuestions = [
  "What is Alex’s most challenging project?",
  "What backend experience does Alex have?",
  "Has Alex used PostgreSQL?",
];
