import { profileModeSchema } from "@/types/intelligence";
import { z } from "zod";
import {
  snapshotSchema,
  groundedAnswerSchema,
  matchOutputSchema,
  sourceSchema,
  statementSchema,
} from "./intelligence";
export const turnSchema = z.object({
  id: z.string().uuid(),
  question: z.string().min(1).max(2000),
  answer: groundedAnswerSchema,
  inputMode: z.enum(["text", "voice"]),
  createdAt: z.string(),
});
export const briefSchema = z.object({
  generatedAt: z.string(),
  method: z.literal("compiled-evidence"),
  questions: z
    .array(z.object({ turnId: z.string(), text: z.string() }))
    .max(30),
  topics: z.array(z.object({ name: z.string(), turnIds: z.array(z.string()) })),
  skills: z.array(
    z.object({ name: z.string(), turnCount: z.number().int().nonnegative() }),
  ),
  supportedExperience: z
    .array(statementSchema.extend({ turnId: z.string() }))
    .max(12),
  unverified: z
    .array(z.object({ text: z.string(), turnId: z.string() }))
    .max(60),
});
export const interviewSchema = z.object({
  id: z.string().uuid(),
  profileMode: profileModeSchema,
  snapshot: snapshotSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  status: z.enum(["active", "completed"]),
  consent: z.literal("transcript-v1"),
  turns: z.array(turnSchema).max(30),
  pending: z
    .object({ id: z.string().uuid(), startedAt: z.number() })
    .nullable(),
  brief: briefSchema.nullable(),
});
export const matchRecordSchema = z.object({
  id: z.string().uuid(),
  candidateName: z.string(),
  profileMode: profileModeSchema,
  revision: z.string(),
  createdAt: z.string(),
  description: z.string().max(15000),
  result: matchOutputSchema,
  sources: z.array(sourceSchema).max(80),
});
export const activitySchema = z.object({
  interviews: z.array(interviewSchema).max(20),
  matches: z.array(matchRecordSchema).max(30),
  updatedAt: z.number(),
});
export const newInterviewSchema = z.object({
  profile: profileModeSchema,
  revision: z.string().max(100).optional(),
  consent: z.literal(true),
});
export const interviewTurnInput = z.object({
  requestId: z.string().uuid(),
  question: z.string().trim().min(1).max(2000),
  inputMode: z.enum(["text", "voice"]).default("text"),
});
export type Interview = z.infer<typeof interviewSchema>;
export type InterviewTurn = z.infer<typeof turnSchema>;
export type InterviewBrief = z.infer<typeof briefSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type MatchRecord = z.infer<typeof matchRecordSchema>;
