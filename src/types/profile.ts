import { z } from "zod";
export const evidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["sample-repository", "sample-resume"]),
  excerpt: z.string(),
});
export const answerSchema = z.object({
  text: z.string(),
  evidenceIds: z.array(z.string()),
  mode: z.literal("demo"),
});
export const chatRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
});
export const draftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  headline: z.string().trim().max(160),
  education: z.string().max(2000),
  skills: z.string().max(1000),
  experience: z.string().max(5000),
  repositories: z.string().max(2000),
});
export type Evidence = z.infer<typeof evidenceSchema>;
export type Answer = z.infer<typeof answerSchema>;
