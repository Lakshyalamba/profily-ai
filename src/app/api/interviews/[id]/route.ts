import { z } from "zod";
import { failure, json, sameOrigin, AppError } from "@/lib/server/http";
import { requireSession } from "@/lib/server/store";
import { getInterview } from "@/lib/server/interviews";
import { interviewIn, updateActivity } from "@/lib/server/activity-store";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return json(
      await getInterview(
        requireSession(request),
        z.uuid().parse((await params).id),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const owner = requireSession(request),
      id = z.uuid().parse((await params).id);
    await updateActivity(owner, (data) => {
      if (
        interviewIn(data, id).pending &&
        Date.now() - interviewIn(data, id).pending!.startedAt < 320000
      )
        throw new AppError(
          409,
          "TURN_PENDING",
          "Wait for the current question to finish before deleting.",
        );
      return {
        ...data,
        interviews: data.interviews.filter((s) => s.id !== id),
      };
    });
    return json({ deleted: true });
  } catch (e) {
    return failure(e);
  }
}
