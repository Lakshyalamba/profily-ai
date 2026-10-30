import { z } from "zod";
import {
  AppError,
  failure,
  json,
  readJson,
  sameOrigin,
  rateLimit,
} from "@/lib/server/http";
import { requireSession, loadWorkspace } from "@/lib/server/store";
import {
  mutatePublication,
  ownerPublication,
  publishProfile,
  unpublishProfile,
} from "@/lib/server/public-store";
export const runtime = "nodejs";
const view = (record: Awaited<ReturnType<typeof ownerPublication>>) =>
  record
    ? {
        path: `/p/${record.id}`,
        expiresAt: record.expiresAt,
        revision: record.snapshot.revision,
        sourceRevision: record.sourceRevision,
        sourceIds: record.snapshot.sources
          .filter((source) => source.kind === "repository")
          .map((source) => source.id),
      }
    : null;
export async function GET(request: Request) {
  try {
    return json(view(await ownerPublication(requireSession(request))));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const owner = requireSession(request);
    rateLimit("publish:" + owner, 10);
    const input = z
      .object({
        consent: z.literal(true),
        revision: z.string().max(100),
        sourceIds: z.array(z.string().max(100)).max(80),
      })
      .parse(await readJson(request));
    return await mutatePublication(owner, async () => {
      const saved = (await loadWorkspace(owner)).saved;
      if (!saved || saved.revision !== input.revision)
        throw new AppError(
          409,
          "PROFILE_CHANGED",
          "Save and review your latest profile before publishing.",
        );
      return json(view(await publishProfile(owner, saved, input.sourceIds)));
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const owner = requireSession(request);
    await mutatePublication(owner, () => unpublishProfile(owner));
    return json({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
