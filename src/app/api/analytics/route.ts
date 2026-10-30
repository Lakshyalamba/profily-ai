import { failure, json, rateLimit, sameOrigin } from "@/lib/server/http";
import { sessionId, newSession, setSession } from "@/lib/server/store";
import { loadActivity } from "@/lib/server/activity-store";
import { calculateAnalytics } from "@/lib/interview-metrics";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    sameOrigin(request);
    const owner = sessionId(request) || newSession();
    rateLimit("analytics:" + owner, 60);
    return setSession(
      json(calculateAnalytics(await loadActivity(owner))),
      owner,
      request,
    );
  } catch (e) {
    return failure(e);
  }
}
