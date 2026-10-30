import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRepositoryUrl, selectFiles } from "../src/lib/server/github";
import {
  quoteOptions,
  resolveQuotes,
  validateCitations,
} from "../src/lib/server/grounding";
import { extractPdf } from "../src/lib/server/resume";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSnapshot } from "../src/lib/server/profiles";
import {
  emptyWorkspace,
  newSession,
  updateWorkspace,
  loadWorkspace,
} from "../src/lib/server/store";
import { AppError, sameOrigin } from "../src/lib/server/http";
import { generate } from "../src/lib/server/gemini";
import { z } from "zod";
const source = {
  id: "test",
  group: "repo",
  title: "test file",
  kind: "repository" as const,
  excerpt: 'router.post("/tasks", validateInput);',
};
test("repository URLs reject SSRF, credentials, ports and extra paths", () => {
  assert.equal(
    parseRepositoryUrl("https://github.com/expressjs/express.git").repo,
    "express",
  );
  for (const url of [
    "http://github.com/a/b",
    "https://evil.com/a/b",
    "https://github.com.evil.com/a/b",
    "https://github.com@127.0.0.1/a/b",
    "https://github.com/a/b?raw=1",
    "https://github.com/a/b/tree/main",
    "https://github.com:8080/a/b",
    "file:///etc/passwd",
  ])
    assert.throws(() => parseRepositoryUrl(url), AppError);
});
test("citation IDs and exact normalized quotes are checked", () => {
  validateCitations(
    [{ sourceId: "test", quote: 'router.post("/tasks", validateInput);' }],
    [source],
  );
  assert.throws(() =>
    validateCitations(
      [{ sourceId: "unknown", quote: "router.post" }],
      [source],
    ),
  );
  assert.throws(() =>
    validateCitations(
      [{ sourceId: "test", quote: "Kubernetes cluster deployment" }],
      [source],
    ),
  );
});
test("repository selection excludes symlinks, secrets, binary and generated files", () => {
  const entries = [
    "README.md",
    "package.json",
    "src/api.ts",
    "node_modules/x.ts",
    ".env",
    "private.key",
    "dist/main.js",
  ].map((path) => ({
    path,
    type: "blob",
    mode: "100644",
    sha: "a".repeat(40),
    size: 100,
  }));
  entries.push({
    path: "src/link.ts",
    type: "blob",
    mode: "120000",
    sha: "b".repeat(40),
    size: 10,
  });
  assert.deepEqual(
    selectFiles(entries).map((e) => e.path),
    ["README.md", "package.json", "src/api.ts"],
  );
});
test("PDF extraction reads real text; malformed and non-PDF inputs fail", async () => {
  const pages = await extractPdf(
    await readFile("tests/fixtures/sample-resume.pdf"),
  );
  assert.match(pages[0], /JORDAN ELLIS/);
  assert.match(pages[0], /PostgreSQL transactions/);
  await assert.rejects(
    () => extractPdf(new TextEncoder().encode("not a PDF")),
    AppError,
  );
  await assert.rejects(
    () => extractPdf(new TextEncoder().encode("%PDF-1.7 invalid")),
    AppError,
  );
});
test("saving reviewed claims does not invent repository verification", () => {
  const workspace = emptyWorkspace();
  workspace.pendingSources = [source];
  const snapshot = buildSnapshot(
    workspace,
    {
      name: "Test",
      headline: "",
      skills: "AWS",
      education: "",
      experience: "",
      projects: [],
    },
    [],
    "rev",
  );
  assert.ok(snapshot.sources.every((s) => s.kind === "developer"));
  assert.throws(
    () => buildSnapshot(workspace, snapshot.candidate, ["forged-group"], "rev"),
    AppError,
  );
});
test("session stores are isolated and updates are serialized", async () => {
  const folder = await mkdtemp(join(tmpdir(), "profily-test-"));
  process.env.PROFILY_DATA_DIR = folder;
  try {
    const a = newSession(),
      b = newSession();
    assert.equal(
      (await loadWorkspace(a)).revision,
      (await loadWorkspace(a)).revision,
    );
    await Promise.all([
      updateWorkspace(a, (d) => ({ ...d, pendingSources: [source] })),
      updateWorkspace(a, (d) => ({
        ...d,
        pendingSources: [...d.pendingSources, { ...source, id: "second" }],
      })),
    ]);
    assert.equal((await loadWorkspace(a)).pendingSources.length, 2);
    assert.equal((await loadWorkspace(b)).pendingSources.length, 0);
  } finally {
    delete process.env.PROFILY_DATA_DIR;
    await rm(folder, { recursive: true, force: true });
  }
});
test("Gemini output contracts reject malformed responses without disclosing upstream text", async () => {
  const originalFetch = globalThis.fetch,
    oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: '{"wrong":"data"}' }] },
            },
          ],
        }),
        { status: 200 },
      );
    await assert.rejects(
      () => generate(z.object({ answer: z.string() }), "test", {}),
      (e: unknown) => e instanceof AppError && e.code === "AI_INVALID_OUTPUT",
    );
    globalThis.fetch = async () =>
      new Response("private upstream diagnostic", { status: 403 });
    await assert.rejects(
      () => generate(z.object({ answer: z.string() }), "test", {}),
      (e: unknown) =>
        e instanceof AppError && !e.message.includes("private upstream"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("model-selected span IDs resolve to exact server-owned quotes", () => {
  const options = quoteOptions(source);
  assert.ok(options.length);
  const result = resolveQuotes(
    { citations: [{ sourceId: source.id, quoteId: options[0].id }] },
    [source],
  ) as { citations: { sourceId: string; quote: string }[] };
  validateCitations(result.citations, [source]);
  assert.throws(
    () => resolveQuotes({ sourceId: source.id, quoteId: "q999" }, [source]),
    AppError,
  );
});

test("same-origin checks handle local Host headers without permitting external origins", () => {
  sameOrigin(
    new Request("http://localhost:3000/api/profile", {
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    }),
  );
  assert.throws(
    () =>
      sameOrigin(
        new Request("http://localhost:3000/api/profile", {
          headers: {
            host: "127.0.0.1:3000",
            origin: "https://attacker.example",
          },
        }),
      ),
    AppError,
  );
});

test("career answers reject uncited facts and allow audited hypothetical questions", async () => {
  const { careerAnswer } = await import("../src/lib/ai/career");
  const { demoSnapshot } = await import("../src/lib/server/profiles");
  const originalFetch = globalThis.fetch,
    oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  const wrap = (value: unknown) =>
    new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(value) }] },
          },
        ],
      }),
      { status: 200 },
    );
  try {
    globalThis.fetch = async () =>
      wrap({
        paragraphs: [
          {
            kind: "fact",
            text: "The candidate served ten million users.",
            citations: [],
          },
        ],
        unknowns: [],
      });
    await assert.rejects(
      () => careerAnswer(demoSnapshot(), "What did they build?", []),
      (e: unknown) => e instanceof AppError && e.code === "UNCITED_FACT",
    );
    let call = 0;
    globalThis.fetch = async () =>
      wrap(
        call++ === 0
          ? {
              paragraphs: [
                {
                  kind: "question",
                  text: "How would you handle a failed transaction?",
                  citations: [],
                },
              ],
              unknowns: [],
            }
          : {
              grounded: true,
              reason: "Purely hypothetical question; no candidate claim.",
            },
      );
    const answer = await careerAnswer(
      demoSnapshot(),
      "What would you ask in an interview?",
      [],
    );
    assert.equal(answer.paragraphs[0].kind, "question");
    assert.equal(call, 2);
    call = 0;
    globalThis.fetch = async () =>
      wrap(
        call++ === 0
          ? {
              paragraphs: [],
              unknowns: ["They definitely have no Kubernetes skill."],
            }
          : {
              grounded: false,
              reason: "Missing evidence does not prove absence.",
            },
      );
    const withheld = await careerAnswer(
      demoSnapshot(),
      "Do they know Kubernetes?",
      [],
    );
    assert.equal(withheld.withheld, true);
    assert.equal(withheld.paragraphs.length, 0);
    assert.match(withheld.unknowns[0], /insufficient reliable evidence/);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
  }
});

test("a grounded job report can contain requirements with missing evidence", async () => {
  const { matchJob } = await import("../src/lib/ai/career");
  const { demoSnapshot } = await import("../src/lib/server/profiles");
  const originalFetch = globalThis.fetch,
    oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only";
  let call = 0;
  try {
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
                      call++ === 0
                        ? {
                            requirements: [
                              {
                                requirement: "PostgreSQL",
                                requirementQuote: "PostgreSQL",
                                status: "partial",
                                explanation:
                                  "Synthetic Taskflow schema describes PostgreSQL.",
                                citations: [
                                  { sourceId: "taskflow-db", quoteId: "q1" },
                                ],
                              },
                              {
                                requirement: "Kubernetes",
                                requirementQuote: "Kubernetes",
                                status: "not_established",
                                explanation:
                                  "No evidence establishes this requirement.",
                                citations: [],
                              },
                            ],
                            limitations: ["Synthetic evidence only."],
                          }
                        : {
                            grounded: true,
                            reason:
                              "The report correctly distinguishes a sample claim from missing evidence.",
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
    const result = await matchJob(
      demoSnapshot(),
      "Requirements: PostgreSQL and Kubernetes.",
    );
    assert.equal(result.requirements[1].status, "not_established");
    assert.equal(call, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey) process.env.GEMINI_API_KEY = oldKey;
    else delete process.env.GEMINI_API_KEY;
  }
});
