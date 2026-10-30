import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { demoSnapshot } from "../src/lib/server/profiles";
import { calculateAnalytics, compileBrief } from "../src/lib/interview-metrics";
import {
  startInterview,
  endInterview,
  getInterview,
  interviewTurn,
} from "../src/lib/server/interviews";
import {
  loadActivity,
  updateActivity,
  clearActivity,
} from "../src/lib/server/activity-store";
import { newSession } from "../src/lib/server/store";
import type {
  Interview,
  Activity,
  InterviewTurn,
} from "../src/types/interview";
import { quoteOptions } from "../src/lib/server/grounding";
import { AppError } from "../src/lib/server/http";
function sample(): Interview {
  const snapshot = demoSnapshot();
  const source = snapshot.sources.find((s) => s.id === "taskflow-db")!;
  const turn: InterviewTurn = {
    id: randomUUID(),
    question: "How was PostgreSQL used?",
    answer: {
      paragraphs: [
        {
          kind: "fact",
          text: "The synthetic schema describes PostgreSQL through Prisma.",
          citations: [
            { sourceId: source.id, quote: quoteOptions(source)[0].text },
          ],
        },
      ],
      unknowns: [],
    },
    inputMode: "text",
    createdAt: new Date().toISOString(),
  };
  return {
    id: randomUUID(),
    profileMode: "demo",
    snapshot,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "active",
    consent: "transcript-v1",
    turns: [turn],
    pending: null,
    brief: null,
  };
}
test("brief preserves recorded questions, sources, and uncertainty without inventing a score", () => {
  const session = sample();
  session.turns.push({
    id: randomUUID(),
    question: "Has this candidate used Kubernetes?",
    answer: {
      paragraphs: [],
      unknowns: [
        "The included evidence does not establish Kubernetes experience.",
      ],
      withheld: true,
    },
    inputMode: "voice",
    createdAt: new Date().toISOString(),
  });
  const brief = compileBrief(session);
  assert.equal(brief.questions.length, 2);
  assert.equal(brief.supportedExperience.length, 1);
  assert.equal(brief.unverified.length, 1);
  session.turns.push({ ...session.turns[1], id: randomUUID() });
  assert.equal(compileBrief(session).unverified.length, 1);
  assert.equal(brief.skills.find((s) => s.name === "Kubernetes")?.turnCount, 1);
  assert.equal("score" in brief, false);
  assert.equal(
    brief.supportedExperience[0].citations[0].sourceId,
    "taskflow-db",
  );
});
test("analytics are derived solely from recorded sessions; empty data stays zero", () => {
  const empty: Activity = {
    interviews: [],
    matches: [],
    updatedAt: Date.now(),
  };
  assert.equal(calculateAnalytics(empty).turnCount, 0);
  assert.ok(calculateAnalytics(empty).days.every((d) => d.turnCount === 0));
  const session = sample();
  const stats = calculateAnalytics({ ...empty, interviews: [session] });
  assert.equal(stats.sessionCount, 1);
  assert.equal(stats.turnCount, 1);
  assert.equal(stats.textTurns, 1);
  assert.equal(stats.voiceTurns, 0);
  assert.equal(
    stats.days.reduce((n, d) => n + d.turnCount, 0),
    1,
  );
  assert.equal(stats.skills.find((s) => s.name === "PostgreSQL")?.turnCount, 1);
});
test("session isolation, immutable snapshots, automatic briefs and exactly-once turns", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "profily-interview-"));
  const oldDir = process.env.PROFILY_DATA_DIR,
    oldKey = process.env.GEMINI_API_KEY,
    originalFetch = globalThis.fetch;
  process.env.PROFILY_DATA_DIR = path.join(folder, "profiles");
  process.env.GEMINI_API_KEY = "test-only";
  try {
    const a = newSession(),
      b = newSession(),
      profile = demoSnapshot(),
      session = await startInterview(a, profile, "demo");
    assert.equal((await loadActivity(b)).interviews.length, 0);
    await assert.rejects(() => getInterview(b, session.id), AppError);
    profile.candidate.name = "Changed afterward";
    assert.notEqual(
      (await getInterview(a, session.id)).snapshot.candidate.name,
      profile.candidate.name,
    );
    const source = session.snapshot.sources.find(
      (s) => s.id === "taskflow-db",
    )!;
    let calls = 0;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      calls++ === 0
                        ? {
                            paragraphs: [
                              {
                                kind: "fact",
                                text: "The synthetic schema describes PostgreSQL through Prisma.",
                                citations: [
                                  { sourceId: source.id, quoteId: "q1" },
                                ],
                              },
                            ],
                            unknowns: [],
                          }
                        : {
                            grounded: true,
                            reason: "Synthetic claim correctly attributed.",
                          },
                    ),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    const input = {
      requestId: randomUUID(),
      question: "How was PostgreSQL used?",
      inputMode: "text" as const,
    };
    const first = await interviewTurn(a, session.id, input);
    const replay = await interviewTurn(a, session.id, input);
    assert.equal(first.turns.length, 1);
    assert.equal(replay.turns.length, 1);
    assert.equal(calls, 2);
    const ended = await endInterview(a, session.id);
    assert.equal(ended.brief?.questions.length, 1);
    assert.equal((await endInterview(a, session.id)).endedAt, ended.endedAt);
    await assert.rejects(
      () => interviewTurn(a, session.id, { ...input, requestId: randomUUID() }),
      AppError,
    );
    await clearActivity(a);
    assert.equal((await loadActivity(a)).interviews.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
    if (oldDir) process.env.PROFILY_DATA_DIR = oldDir;
    else delete process.env.PROFILY_DATA_DIR;
    await rm(folder, { recursive: true, force: true });
  }
});

test("dedicated interviews retain earlier turns beyond the casual chat context window", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "profily-history-"));
  const oldDir = process.env.PROFILY_DATA_DIR,
    oldKey = process.env.GEMINI_API_KEY,
    originalFetch = globalThis.fetch;
  process.env.PROFILY_DATA_DIR = path.join(folder, "profiles");
  process.env.GEMINI_API_KEY = "test-only";
  try {
    const owner = newSession(),
      session = await startInterview(owner, demoSnapshot(), "demo");
    const turn = sample().turns[0];
    await updateActivity(owner, (data) => {
      data.interviews[0].turns = Array.from({ length: 12 }, (_, i) => ({
        ...turn,
        id: randomUUID(),
        question: `Earlier question ${i + 1}`,
      }));
      return data;
    });
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      if (calls === 0) {
        const request = JSON.parse(String(init?.body));
        const payload = JSON.parse(request.contents[0].parts[0].text);
        assert.equal(payload.history.length, 24);
        assert.equal(payload.history[0].text, "Earlier question 1");
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify(
                      calls++ === 0
                        ? {
                            paragraphs: [],
                            unknowns: [
                              "The example contains no additional evidence.",
                            ],
                          }
                        : {
                            grounded: true,
                            reason: "Uncertainty is appropriately stated.",
                          },
                    ),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const result = await interviewTurn(owner, session.id, {
      requestId: randomUUID(),
      question: "Follow up on the first question.",
      inputMode: "text",
    });
    assert.equal(result.turns.length, 13);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
    if (oldDir) process.env.PROFILY_DATA_DIR = oldDir;
    else delete process.env.PROFILY_DATA_DIR;
    await rm(folder, { recursive: true, force: true });
  }
});
