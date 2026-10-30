import { z } from "zod";
import { failure, json, sameOrigin, AppError } from "@/lib/server/http";
import { requireSession } from "@/lib/server/store";
import { updateActivity } from "@/lib/server/activity-store";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const id = z.uuid().parse((await params).id);
    await updateActivity(requireSession(request), (data) => {
      if (!data.matches.some((m) => m.id === id))
        throw new AppError(
          404,
          "MATCH_NOT_FOUND",
          "This saved comparison is unavailable.",
        );
      return { ...data, matches: data.matches.filter((m) => m.id !== id) };
    });
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
