import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { demoSnapshot } from "../src/lib/server/profiles";
import { interviewPdf } from "../src/lib/server/interview-pdf";
import { compileBrief } from "../src/lib/interview-metrics";
import type { Interview } from "../src/types/interview";
import { AppError } from "../src/lib/server/http";
test("PDF export requires a completed session and paginates long Unicode text safely", async () => {
  const session: Interview = {
    id: randomUUID(),
    profileMode: "demo",
    snapshot: demoSnapshot(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "active",
    consent: "transcript-v1",
    pending: null,
    turns: [],
    brief: null,
  };
  await assert.rejects(() => interviewPdf(session), AppError);
  session.turns = Array.from({ length: 30 }, (_, i) => ({
    id: randomUUID(),
    question: `Question ${i + 1}: résumé, PostgreSQL, API design. ${"Explain this technical decision and its limitations. ".repeat(8)} ${"long-token".repeat(30)} 🙂`,
    answer: {
      paragraphs: [],
      unknowns: [
        "This is a synthetic pagination fixture; no ability is established.",
      ],
    },
    inputMode: "text",
    createdAt: new Date().toISOString(),
  }));
  session.endedAt = new Date().toISOString();
  session.status = "completed";
  session.brief = compileBrief(session);
  const bytes = await interviewPdf(session);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  const doc = await PDFDocument.load(bytes);
  assert.ok(doc.getPageCount() > 2);
  assert.equal(doc.getTitle(), "Profily AI | Interview Brief");
});
