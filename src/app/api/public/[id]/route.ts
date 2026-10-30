import { sessionId, newSession, setSession } from "@/lib/server/store";
import { loadPublicProfile } from "@/lib/server/public-store";
import { failure, json } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const response = json(
      (await loadPublicProfile((await context.params).id)).snapshot,
    );
    // Public reads stay public, but an external navigation must not replace the owner cookie.
    if (request.headers.get("sec-fetch-site") === "cross-site") return response;
    return setSession(response, sessionId(request) || newSession(), request);
  } catch (error) {
    return failure(error);
  }
}
