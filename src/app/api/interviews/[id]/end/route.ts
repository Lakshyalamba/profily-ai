import { z } from "zod";
import { failure, json, sameOrigin } from "@/lib/server/http";
import { requireSession } from "@/lib/server/store";
import { endInterview } from "@/lib/server/interviews";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    return json(
      await endInterview(
        requireSession(request),
        z.uuid().parse((await params).id),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
