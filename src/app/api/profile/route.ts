import { mutatePublication, unpublishProfile } from "@/lib/server/public-store";
import { clearActivity } from "@/lib/server/activity-store";
import { randomUUID } from "node:crypto";
import { saveSchema } from "@/types/intelligence";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  rateLimit,
  AppError,
} from "@/lib/server/http";
import {
  sessionId,
  newSession,
  setSession,
  loadWorkspace,
  updateWorkspace,
  requireSession,
  deleteWorkspace,
} from "@/lib/server/store";
import { buildSnapshot } from "@/lib/server/profiles";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    sameOrigin(request);
    const id = sessionId(request) ?? newSession();
    rateLimit("read:" + id, 60);
    const workspace = await loadWorkspace(id);
    return setSession(json(workspace), id, request);
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const id = requireSession(request);
    rateLimit("save:" + id);
    const input = saveSchema.parse(await readJson(request, 100000));
    const workspace = await updateWorkspace(id, (current) => {
      if (current.revision !== input.revision)
        throw new AppError(
          409,
          "DRAFT_CHANGED",
          "Your draft changed in another tab. Reload and review before saving.",
        );
      return {
        ...current,
        saved: buildSnapshot(
          current,
          input.candidate,
          input.sourceGroups,
          randomUUID(),
        ),
      };
    });
    return json(workspace);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const owner = requireSession(request);
    await mutatePublication(owner, async () => {
      await unpublishProfile(owner);
      await clearActivity(owner);
      await deleteWorkspace(owner);
    });
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
