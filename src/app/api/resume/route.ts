import {
  failure,
  json,
  boundedBytes,
  sameOrigin,
  aiRateLimit,
} from "@/lib/server/http";
import {
  requireSession,
  updateWorkspace,
  loadWorkspace,
} from "@/lib/server/store";
import { requireGemini } from "@/lib/server/gemini";
import { parseResume } from "@/lib/server/resume";
import { AppError } from "@/lib/server/http";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const id = requireSession(request);
    await aiRateLimit(id);
    requireGemini();
    const baseline = (await loadWorkspace(id)).revision;
    const bytes = await boundedBytes(request.body, 4 * 1024 * 1024 + 16000);
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(bytes).buffer, {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      throw new AppError(
        400,
        "INVALID_UPLOAD",
        "Send a PDF using the resume upload form. The upload request could not be read.",
      );
    }
    if (form.get("consent") !== "true")
      throw new AppError(
        400,
        "CONSENT_REQUIRED",
        "Confirm that resume text may be sent to Gemini.",
      );
    const file = form.get("resume");
    if (
      !(file instanceof File) ||
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
    )
      throw new AppError(400, "INVALID_FILE", "Choose a PDF resume.");
    const result = await parseResume(
      new Uint8Array(await file.arrayBuffer()),
      file.name.replace(/[^\w. -]/g, "_").slice(0, 180),
    );
    const workspace = await updateWorkspace(id, (current) => {
      if (current.revision !== baseline)
        throw new AppError(
          409,
          "DRAFT_CHANGED",
          "Your draft changed while the resume was being processed. Reload and retry the import.",
        );
      return {
        ...current,
        pendingCandidate: result.candidate,
        pendingSources: [
          ...current.pendingSources.filter((s) => s.kind !== "resume"),
          ...result.sources,
        ],
      };
    });
    return json(workspace);
  } catch (e) {
    return failure(e);
  }
}
