import { profileModeSchema } from "@/types/intelligence";
import { randomUUID } from "node:crypto";
import { updateActivity } from "@/lib/server/activity-store";
import { z } from "zod";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  aiRateLimit,
} from "@/lib/server/http";
import { sessionId, newSession, setSession } from "@/lib/server/store";
import { profileFor } from "@/lib/server/profiles";
import { matchJob } from "@/lib/ai/career";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = sessionId(request) || newSession();
    await aiRateLimit(owner);
    const input = z
      .object({
        description: z.string().trim().min(20).max(15000),
        profile: profileModeSchema,
        saveResult: z.boolean().default(false),
        requestId: z.string().uuid().optional(),
        revision: z.string().max(100).optional(),
      })
      .parse(await readJson(request));
    const profile = await profileFor(request, input.profile, input.revision);
    const result = await matchJob(profile, input.description);
    if (input.saveResult)
      await updateActivity(owner, (data) => {
        const id = input.requestId || randomUUID();
        if (data.matches.some((m) => m.id === id)) return data;
        const used = new Set(
          result.requirements.flatMap((r) =>
            r.citations.map((c) => c.sourceId),
          ),
        );
        return {
          ...data,
          matches: [
            ...data.matches,
            {
              id,
              candidateName: profile.candidate.name,
              profileMode: input.profile,
              revision: profile.revision,
              createdAt: new Date().toISOString(),
              description: input.description,
              result,
              sources: profile.sources.filter((s) => used.has(s.id)),
            },
          ].slice(-30),
        };
      });
    return setSession(
      json({
        ...result,
        revision: profile.revision,
        recorded: input.saveResult,
      }),
      owner,
      request,
    );
  } catch (e) {
    return failure(e);
  }
}
