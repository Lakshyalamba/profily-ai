import { z } from "zod";
import { failure, rateLimit } from "@/lib/server/http";
import { requireSession } from "@/lib/server/store";
import { getInterview } from "@/lib/server/interviews";
import { interviewPdf } from "@/lib/server/interview-pdf";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const owner = requireSession(request);
    rateLimit("pdf:" + owner, 10);
    const id = z.uuid().parse((await params).id),
      bytes = await interviewPdf(await getInterview(owner, id));
    return new Response(new Uint8Array(bytes).buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="profily-interview-${id}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
