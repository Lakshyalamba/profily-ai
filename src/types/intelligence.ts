import { z } from "zod";

export const profileModeSchema = z.union([
  z.enum(["demo", "private", "judge"]),
  z.string().regex(/^public-[a-f0-9]{32}$/),
]);
export type ProfileMode = z.infer<typeof profileModeSchema>;

export const sourceSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  title: z.string().max(300),
  kind: z.enum([
    "resume",
    "repository",
    "developer",
    "sample-resume",
    "sample-repository",
  ]),
  excerpt: z.string().max(16000),
  group: z.string().max(120),
  url: z.string().max(1500).optional(),
  path: z.string().max(500).optional(),
  commit: z.string().max(64).optional(),
  page: z.number().int().positive().optional(),
});
export const citationSchema = z.object({
  sourceId: z.string().max(100),
  quote: z.string().min(5).max(800),
});
export const statementSchema = z.object({
  text: z.string().min(1).max(1600),
  citations: z.array(citationSchema).min(1).max(5),
});
export const projectSchema = z.object({
  id: z.string().regex(/^[\w-]{1,100}$/),
  name: z.string().min(1).max(120),
  description: z.string().max(1800),
  stack: z.array(z.string().max(80)).max(25),
});
export const candidateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  headline: z.string().max(160),
  education: z.string().max(4000),
  skills: z.string().max(2000),
  experience: z.string().max(6000),
  projects: z.array(projectSchema).max(12),
});
export const extractionSchema = z.object({
  name: z.string().max(100),
  headline: z.string().max(160),
  education: z.string().max(4000),
  skills: z.string().max(2000),
  experience: z.string().max(6000),
  projects: z.array(projectSchema).max(12),
  references: z
    .array(
      z.object({
        field: z.enum([
          "name",
          "headline",
          "education",
          "skills",
          "experience",
          "projects",
        ]),
        citations: z.array(citationSchema).min(1).max(8),
      }),
    )
    .max(30),
  warnings: z.array(z.string().max(300)).max(10),
});
export const repositoryAnalysisSchema = z.object({
  purpose: statementSchema,
  technologies: z.array(statementSchema).max(20),
  features: z.array(statementSchema).max(12),
  architecture: z.array(statementSchema).max(8),
  limitations: z.array(z.string().max(400)).max(10),
});
export const repositorySchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  commit: z.string(),
  fetchedAt: z.string(),
  analysis: repositoryAnalysisSchema.nullable(),
  sources: z.array(sourceSchema).max(20),
  warnings: z.array(z.string().max(400)).max(20),
});
export const snapshotSchema = z.object({
  candidate: candidateSchema,
  sources: z.array(sourceSchema).max(80),
  repositories: z.array(repositorySchema).max(4),
  revision: z.string(),
  savedAt: z.string(),
});
export const workspaceSchema = z.object({
  pendingCandidate: extractionSchema.nullable(),
  pendingSources: z.array(sourceSchema).max(80),
  repositories: z.array(repositorySchema).max(4),
  saved: snapshotSchema.nullable(),
  updatedAt: z.number(),
  revision: z.string(),
});
export const saveSchema = z.object({
  candidate: candidateSchema,
  sourceGroups: z.array(z.string().max(120)).max(5),
  reviewed: z.literal(true),
  revision: z.string().max(100),
});
export const historySchema = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string().max(8000),
    }),
  )
  .max(20);
export const liveChatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  profile: profileModeSchema,
  history: historySchema.default([]),
  revision: z.string().max(100).optional(),
});
export const groundedAnswerSchema = z
  .object({
    paragraphs: z
      .array(
        z.object({
          kind: z.enum(["fact", "question"]),
          text: z.string().min(1).max(1600),
          citations: z.array(citationSchema).max(5),
        }),
      )
      .max(8),
    unknowns: z.array(z.string().max(1000)).max(6),
    withheld: z.boolean().optional(),
  })
  .refine((v) => v.paragraphs.length + v.unknowns.length > 0);
export const matchOutputSchema = z.object({
  requirements: z
    .array(
      z.object({
        requirement: z.string().min(1).max(400),
        requirementQuote: z.string().min(5).max(800),
        status: z.enum(["supported", "partial", "not_established"]),
        explanation: z.string().max(1400),
        citations: z.array(citationSchema).max(5),
      }),
    )
    .min(1)
    .max(25),
  limitations: z.array(z.string().max(400)).max(8),
});
export type Source = z.infer<typeof sourceSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type Citation = z.infer<typeof citationSchema>;
export type GroundedAnswer = z.infer<typeof groundedAnswerSchema>;
export type MatchOutput = z.infer<typeof matchOutputSchema>;
