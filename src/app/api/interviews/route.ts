import { newInterviewSchema } from "@/types/interview";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  rateLimit,
} from "@/lib/server/http";
import { sessionId, newSession, setSession } from "@/lib/server/store";
import { profileFor } from "@/lib/server/profiles";
import { startInterview } from "@/lib/server/interviews";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = sessionId(request) || newSession();
    rateLimit("interview-start:" + owner, 10);
    const input = newInterviewSchema.parse(await readJson(request, 2000));
    const snapshot = await profileFor(request, input.profile, input.revision);
    const session = await startInterview(owner, snapshot, input.profile);
    return setSession(json(session, 201), owner, request);
  } catch (e) {
    return failure(e);
  }
}
