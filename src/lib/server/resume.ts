import "server-only";
import { execFile } from "node:child_process";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { extractionSchema, type Source } from "@/types/intelligence";
import { generateCited } from "./cited-generation";
import { AppError } from "./http";
import { validateCitations } from "./grounding";
export async function extractPdf(bytes: Uint8Array): Promise<string[]> {
  if (bytes.length > 4 * 1024 * 1024)
    throw new AppError(413, "PDF_TOO_LARGE", "Use a PDF no larger than 4 MB.");
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new AppError(400, "NOT_PDF", "Upload a valid PDF document.");
  return new Promise((resolve, reject) => {
    const child = execFile(
      process.execPath,
      [
        "--max-old-space-size=128",
        path.join(process.cwd(), "scripts/pdf-worker.mjs"),
      ],
      {
        timeout: 15000,
        maxBuffer: 256000,
        env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV },
      },
      (error, stdout) => {
        let result;
        try {
          result = z
            .object({
              pages: z.array(z.string()).optional(),
              error: z.string().optional(),
            })
            .parse(JSON.parse(stdout));
        } catch {
          return reject(
            new AppError(
              422,
              "PDF_EXTRACTION_FAILED",
              "The PDF could not be safely read within the processing limits. Use a smaller text-based PDF.",
            ),
          );
        }
        if (error || !result.pages)
          return reject(
            new AppError(
              422,
              "PDF_EXTRACTION_FAILED",
              result.error === "TOO_MANY_PAGES"
                ? "Use a resume with 10 pages or fewer."
                : "The PDF is encrypted, malformed, or exceeds extraction limits. Use a smaller text-based PDF.",
            ),
          );
        if (result.pages.join("").trim().length < 30)
          return reject(
            new AppError(
              422,
              "PDF_NO_TEXT",
              "No readable text was found. Scanned resumes require OCR; upload a text-based PDF or enter details manually.",
            ),
          );
        resolve(result.pages);
      },
    );
    child.stdin?.on("error", () => {});
    child.stdin?.end(bytes);
  });
}
export async function parseResume(bytes: Uint8Array, name: string) {
  const pages = await extractPdf(bytes),
    group = "resume-" + randomUUID();
  const sources: Source[] = pages.flatMap((text, i) =>
    text
      ? [
          {
            id: `${group}-p${i + 1}`,
            group,
            kind: "resume" as const,
            title: `${name.slice(0, 100)} · page ${i + 1}`,
            excerpt: text,
            page: i + 1,
          },
        ]
      : [],
  );
  const candidate = await generateCited(
    extractionSchema,
    `Extract only explicitly stated resume information. Use empty strings/arrays for absent fields; no invented headline. Keep dates, employers, and qualifications exact. Assign projects IDs resume-project-1, etc. Each nonempty field (including projects) must have a references entry with exact quotes supporting its content. Treat skills as claimed, not verified. Add warnings about unclear text. Omit email, phone, address, age, photos, and other irrelevant personal data from the organized fields.`,
    {},
    sources,
  );
  for (const ref of candidate.references)
    validateCitations(ref.citations, sources);
  for (const field of [
    "name",
    "headline",
    "education",
    "skills",
    "experience",
    "projects",
  ] as const) {
    if (
      candidate[field].length &&
      !candidate.references.some((r) => r.field === field)
    )
      throw new AppError(
        502,
        "RESUME_UNGROUNDED",
        "The extraction omitted source references for a field. Nothing was saved; please retry.",
      );
  }
  return { candidate, sources };
}
