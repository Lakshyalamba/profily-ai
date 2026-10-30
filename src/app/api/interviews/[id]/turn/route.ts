import { z } from "zod";
import { interviewTurnInput } from "@/types/interview";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  aiRateLimit,
} from "@/lib/server/http";
import { requireSession } from "@/lib/server/store";
import { interviewTurn } from "@/lib/server/interviews";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const owner = requireSession(request),
      id = z.uuid().parse((await params).id),
      input = interviewTurnInput.parse(await readJson(request, 6000));
    await aiRateLimit(owner);
    return json(await interviewTurn(owner, id, input));
  } catch (e) {
    return failure(e);
  }
}
