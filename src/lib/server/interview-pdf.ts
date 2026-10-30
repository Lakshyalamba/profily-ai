import { interviewFollowUps } from "@/lib/interview-metrics";
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Interview } from "@/types/interview";
import { AppError } from "./http";
export async function interviewPdf(session: Interview) {
  if (!session.brief || session.status !== "completed")
    throw new AppError(
      409,
      "INTERVIEW_ACTIVE",
      "End the interview before exporting its summary.",
    );
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all(
    ["Vera.ttf", "VeraBd.ttf"].map((name) =>
      readFile(path.join(process.cwd(), "assets/fonts", name)).then((bytes) =>
        pdf.embedFont(bytes, { subset: true }),
      ),
    ),
  );
  pdf.setTitle("Profily AI | Interview Brief");
  pdf.setAuthor("Profily AI");
  pdf.setSubject(
    "Evidence-backed interview record; not a hiring recommendation",
  );
  const width = 595.28,
    height = 841.89,
    margin = 48,
    contentWidth = width - margin * 2;
  let page: PDFPage,
    y = 0;
  let substituted = false;
  function clean(text: string, font: PDFFont) {
    const supported = new Set(font.getCharacterSet());
    return [
      ...text.replace(/\t/g, " ").replace(/[\u0000-\u0008\u000b-\u001f]/g, ""),
    ]
      .map((c) => {
        if (c === "\n" || supported.has(c.codePointAt(0)!)) return c;
        substituted = true;
        return `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`;
      })
      .join("");
  }
  function newPage() {
    page = pdf.addPage([width, height]);
    y = height - 54;
    page.drawText("PROFILY AI  /  INTERVIEW BRIEF", {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: rgb(0.35, 0.31, 0.52),
    });
    page.drawLine({
      start: { x: margin, y: y - 13 },
      end: { x: width - margin, y: y - 13 },
      thickness: 0.6,
      color: rgb(0.84, 0.83, 0.89),
    });
    y -= 43;
  }
  function ensure(space: number) {
    if (y - space < 54) newPage();
  }
  function line(
    text: string,
    size = 10,
    font = regular,
    color = rgb(0.16, 0.17, 0.22),
  ) {
    ensure(size + 7);
    page.drawText(text, { x: margin, y, size, font, color });
    y -= size + 6;
  }
  function paragraph(text: string, size = 10, font = regular) {
    const value = clean(text, font);
    for (const raw of value.split("\n")) {
      let current = "";
      for (const word of raw.split(/\s+/).filter(Boolean)) {
        if (font.widthOfTextAtSize(word, size) > contentWidth) {
          if (current) {
            line(current, size, font);
            current = "";
          }
          let part = "";
          for (const c of [...word]) {
            if (font.widthOfTextAtSize(part + c, size) > contentWidth) {
              line(part, size, font);
              part = c;
            } else part += c;
          }
          current = part;
        } else if (
          current &&
          font.widthOfTextAtSize(current + " " + word, size) > contentWidth
        ) {
          line(current, size, font);
          current = word;
        } else current = current ? current + " " + word : word;
      }
      if (current) line(current, size, font);
      else if (!raw.trim()) {
        ensure(8);
        y -= 8;
      }
    }
    y -= 5;
  }
  function heading(title: string) {
    ensure(62);
    y -= 11;
    paragraph(title, 12, bold);
  }
  newPage();
  paragraph(session.snapshot.candidate.name, 23, bold);
  paragraph(session.snapshot.candidate.headline, 11);
  paragraph(
    session.profileMode === "judge"
      ? "FICTIONAL CANDIDATE - SAMPLE RESUME AND REAL PUBLIC REPOSITORY EVIDENCE"
      : session.profileMode === "demo"
        ? "FICTIONAL CANDIDATE - SYNTHETIC EVIDENCE"
        : session.profileMode.startsWith("public-")
          ? "PUBLISHED REVIEWED PROFILE - SELF-REPORTED CLAIMS"
          : "PRIVATE REVIEWED PROFILE - SELF-REPORTED CLAIMS",
    8,
    bold,
  );
  paragraph(
    `Session: ${session.id}\nStarted: ${session.startedAt} (UTC)\nEnded: ${session.endedAt} (UTC)\nProfile revision: ${session.snapshot.revision}`,
    8,
  );
  const brief = session.brief;
  heading("Interview overview");
  paragraph(
    `${brief.questions.length} recorded question${brief.questions.length === 1 ? "" : "s"}. This brief compiles the session’s checked AI answers and source references. It does not independently verify employment, authorship, competence, or hiring suitability.`,
  );
  if (!brief.questions.length)
    paragraph(
      "No questions were recorded. No assessment or skill conclusions can be drawn.",
    );
  heading("Topics discussed");
  paragraph(
    brief.topics.length
      ? brief.topics
          .map(
            (t) =>
              `${t.name} (${t.turnIds.length} recorded ${t.turnIds.length === 1 ? "turn" : "turns"})`,
          )
          .join(" | ")
      : "No categorized topics were recorded.",
  );
  heading("Technical skills mentioned");
  paragraph(
    brief.skills.length
      ? brief.skills
          .map(
            (s) =>
              `${s.name} (${s.turnCount} ${s.turnCount === 1 ? "turn" : "turns"})`,
          )
          .join(", ")
      : "No technical skill mentions were detected.",
  );
  paragraph(
    "Mention counts describe the conversation, including unsupported questions. They do not establish skill proficiency.",
    8,
  );
  heading("Questions asked");
  brief.questions.forEach((q, i) => paragraph(`${i + 1}. ${q.text}`));
  const references: { sourceId: string; quote: string }[] = [];
  heading("Evidence-supported experience discussed");
  if (!brief.supportedExperience.length)
    paragraph("No factual answer with supporting citations was recorded.");
  for (const fact of brief.supportedExperience) {
    const numbers = fact.citations.map((c) => {
      let index = references.findIndex(
        (r) => r.sourceId === c.sourceId && r.quote === c.quote,
      );
      if (index < 0) {
        references.push(c);
        index = references.length - 1;
      }
      return `[${index + 1}]`;
    });
    paragraph(fact.text + " " + numbers.join(" "));
  }
  heading("Areas that remain unverified");
  if (!brief.unverified.length)
    paragraph(
      "No explicit uncertainty was recorded by the assistant. This is not proof that every candidate claim was verified.",
    );
  brief.unverified.forEach((u, i) => paragraph(`${i + 1}. ${u.text}`));
  const followUps = interviewFollowUps(session);
  if (followUps.length) {
    heading("Suggested follow-up checklist");
    followUps.forEach((item, index) => paragraph(`${index + 1}. ${item.text}`));
  }
  heading("Useful next steps");
  paragraph(
    "Review the referenced material with the candidate. Ask them to explain their personal contribution, reproduce relevant technical decisions, and clarify the unresolved areas. This brief provides interview context, not a candidate ranking.",
  );
  heading("Supporting sources");
  if (!references.length) paragraph("No cited sources in this brief.");
  references.forEach((r, i) => {
    const source = session.snapshot.sources.find((s) => s.id === r.sourceId);
    ensure(70);
    paragraph(`[${i + 1}] ${source?.title || r.sourceId}`, 10, bold);
    paragraph(
      `Provenance: ${source ? { resume: "Resume claim (self-reported)", repository: "Retrieved repository evidence", developer: "Reviewed developer claim", "sample-resume": "Synthetic resume claim", "sample-repository": "Synthetic repository excerpt" }[source.kind] : "Unknown source"}${source?.page ? ` | Page ${source.page}` : ""}${source?.commit ? ` | Commit ${source.commit}` : ""}`,
      8,
    );
    paragraph("Quote: " + r.quote, 9);
    if (source?.url) paragraph(source.url, 8);
  });
  if (substituted) {
    heading("Text rendering note");
    paragraph(
      "Characters outside the embedded font’s coverage are shown using explicit [U+XXXX] code-point notation to avoid silently dropping content.",
      8,
    );
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: margin, y: 40 },
      end: { x: width - margin, y: 40 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    p.drawText(`PRIVATE INTERVIEW RECORD  |  ${i + 1} / ${pages.length}`, {
      x: margin,
      y: 26,
      size: 8,
      font: regular,
      color: rgb(0.45, 0.45, 0.5),
    });
  });
  return pdf.save();
}
