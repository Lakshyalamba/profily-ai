import { liveChatRequestSchema } from "@/types/intelligence";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  aiRateLimit,
} from "@/lib/server/http";
import { sessionId, newSession, setSession } from "@/lib/server/store";
import { profileFor } from "@/lib/server/profiles";
import { careerAnswer } from "@/lib/ai/career";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = sessionId(request) || newSession();
    await aiRateLimit(owner);
    const input = liveChatRequestSchema.parse(await readJson(request, 100000));
    const profile = await profileFor(request, input.profile, input.revision);
    const answer = await careerAnswer(profile, input.question, input.history);
    return setSession(
      json({ ...answer, mode: "gemini", revision: profile.revision }),
      owner,
      request,
    );
  } catch (e) {
    return failure(e);
  }
}
