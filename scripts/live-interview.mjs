// Real Gemini + HTTP workflow. Voice device behavior is tested separately, never faked in metrics.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.PROFILY_TEST_URL || "http://127.0.0.1:3000";
let cookie = "",
  id = "",
  matchId = "";
const checks = [];
async function request(path, init = {}, expected = 200) {
  const r = await fetch(base + path, {
    ...init,
    headers: { ...init.headers, ...(cookie ? { cookie } : {}) },
    signal: AbortSignal.timeout(190000),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  const type = r.headers.get("content-type");
  const value = type?.includes("application/pdf")
    ? new Uint8Array(await r.arrayBuffer())
    : await r.json();
  if (r.status !== expected)
    throw new Error(
      path +
        ": HTTP " +
        r.status +
        " " +
        (value.code || "") +
        " " +
        (value.error || ""),
    );
  console.log(path, r.status, "passed");
  return value;
}
const post = (value) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
try {
  assert.equal((await fetch(base + "/profile/demo")).status, 200);
  checks.push("Guest-accessible fictional profile opens");
  const start = await request("/api/analytics");
  assert.equal(start.turnCount, 0);
  assert.equal(start.sessionCount, 0);
  assert.equal(start.savedMatches, 0);
  checks.push("Fresh recruiter session shows zero actual activity");
  await request(
    "/api/interviews",
    post({ profile: "demo", consent: false }),
    400,
  );
  let session = await request(
    "/api/interviews",
    post({ profile: "demo", consent: true }),
    201,
  );
  id = session.id;
  assert.equal(session.turns.length, 0);
  checks.push(
    "Explicit transcript consent creates an interview with a frozen profile snapshot",
  );
  await request(`/api/interviews/${id}/pdf`, {}, 409);
  const stranger = await fetch(base + "/api/analytics");
  const strangerCookie = stranger.headers.get("set-cookie").split(";")[0];
  const denied = await fetch(base + `/api/interviews/${id}`, {
    headers: { cookie: strangerCookie },
  });
  assert.equal(denied.status, 404);
  checks.push("Interview access is isolated between browser sessions");
  const firstInput = {
    requestId: randomUUID(),
    question: "How does the sample Taskflow project use PostgreSQL and Prisma?",
    inputMode: "text",
  };
  session = await request(`/api/interviews/${id}/turn`, post(firstInput));
  assert.equal(session.turns.length, 1);
  assert.ok(session.turns[0].answer.paragraphs.some((p) => p.citations.length));
  checks.push(
    "Real Gemini interview answer contains server-checked evidence citations",
  );
  session = await request(
    `/api/interviews/${id}/turn`,
    post({
      requestId: randomUUID(),
      question:
        "Can you expand on that project’s database choices and what the evidence establishes?",
      inputMode: "text",
    }),
  );
  assert.equal(session.turns.length, 2);
  const follow = session.turns[1].answer;
  assert.match(
    [...follow.paragraphs.map((p) => p.text), ...follow.unknowns].join(" "),
    /PostgreSQL|Prisma|Taskflow/i,
  );
  checks.push("Follow-up uses the server-recorded conversation history");
  session = await request(`/api/interviews/${id}/turn`, post(firstInput));
  assert.equal(session.turns.length, 2);
  checks.push("A replayed request does not duplicate a question or analytics");
  session = await request(
    `/api/interviews/${id}/turn`,
    post({
      requestId: randomUUID(),
      question:
        "Does the available evidence establish production Kubernetes administration experience?",
      inputMode: "text",
    }),
  );
  assert.ok(session.turns[2].answer.unknowns.length);
  checks.push("Unsupported experience stays explicitly unverified");
  session = await request(`/api/interviews/${id}/end`, { method: "POST" });
  assert.equal(session.status, "completed");
  assert.equal(session.brief.questions.length, 3);
  assert.ok(session.brief.supportedExperience.length);
  assert.ok(session.brief.unverified.length);
  checks.push(
    "Ending automatically compiles a grounded brief from all recorded questions",
  );
  await request(
    `/api/interviews/${id}/turn`,
    post({
      requestId: randomUUID(),
      question: "New question after ending",
      inputMode: "text",
    }),
    409,
  );
  const pdf = await request(`/api/interviews/${id}/pdf`);
  assert.equal(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  await mkdir("docs", { recursive: true });
  await writeFile("docs/phase-three-sample-brief.pdf", pdf);
  checks.push("Completed interview exports a real downloadable PDF");
  const match = await request(
    "/api/match",
    post({
      profile: "demo",
      description:
        "Software engineering internship requiring React, PostgreSQL data modeling, REST APIs, and production Kubernetes experience. Explain each requirement using the available evidence.",
      saveResult: true,
      requestId: randomUUID(),
    }),
  );
  assert.equal(match.recorded, true);
  checks.push(
    "Opted-in live Gemini job matching is recorded in the same recruiter dashboard",
  );
  const analytics = await request("/api/analytics");
  assert.equal(analytics.sessionCount, 1);
  assert.equal(analytics.completedCount, 1);
  assert.equal(analytics.turnCount, 3);
  assert.equal(analytics.textTurns, 3);
  assert.equal(analytics.voiceTurns, 0);
  assert.equal(analytics.savedMatches, 1);
  assert.ok(analytics.skills.some((s) => s.name === "PostgreSQL"));
  matchId = analytics.matches[0].id;
  checks.push(
    "Analytics match the actual three text turns, one interview and one saved comparison",
  );
  await mkdir(".data", { recursive: true });
  await writeFile(
    ".data/live-phase-three.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        checks,
        summaryMethod: session.brief.method,
        questions: session.brief.questions.length,
        pdfBytes: pdf.length,
        counts: {
          sessions: analytics.sessionCount,
          turns: analytics.turnCount,
          voice: analytics.voiceTurns,
          matches: analytics.savedMatches,
        },
        limitations: [
          "Live workflow used text; physical speech recognition and audible playback are not attested.",
        ],
      },
      null,
      2,
    ),
  );
  await request(`/api/interviews/${id}`, { method: "DELETE" });
  id = "";
  await request(`/api/matches/${matchId}`, { method: "DELETE" });
  matchId = "";
  const after = await request("/api/analytics");
  assert.equal(after.turnCount, 0);
  assert.equal(after.savedMatches, 0);
  console.log(
    "PASS",
    checks.length,
    "live phase-three checks; temporary records deleted.",
  );
} catch (e) {
  console.error("LIVE INTERVIEW FAILED:", e.message);
  if (id)
    try {
      await request(`/api/interviews/${id}`, { method: "DELETE" });
    } catch {}
  if (matchId)
    try {
      await request(`/api/matches/${matchId}`, { method: "DELETE" });
    } catch {}
  process.exitCode = 1;
}
