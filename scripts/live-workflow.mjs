// End-to-end live verification using only synthetic personal information.
// Requires a running server and real Gemini configuration. Never substitutes mocks.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.PROFILY_TEST_URL || "http://127.0.0.1:3000";
let cookie = "";
const checks = [];
async function call(path, init = {}) {
  const start = Date.now();
  const r = await fetch(base + path, {
    ...init,
    headers: { ...init.headers, ...(cookie ? { cookie } : {}) },
    signal: AbortSignal.timeout(230000),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      path + ": HTTP " + r.status + " " + data.code + " " + data.error,
    );
  console.log(path, "passed", Math.round((Date.now() - start) / 1000) + "s");
  return data;
}
function post(value) {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  };
}
try {
  const status = await call("/api/status");
  assert.ok(status.geminiConfigured, "Configure Gemini first");
  await call("/api/profile");
  const form = new FormData();
  form.set("consent", "true");
  form.set(
    "resume",
    new Blob([await readFile("tests/fixtures/sample-resume.pdf")], {
      type: "application/pdf",
    }),
    "sample-resume.pdf",
  );
  let workspace = await call("/api/resume", { method: "POST", body: form });
  assert.match(workspace.pendingCandidate.name, /Jordan/i);
  assert.match(workspace.pendingCandidate.skills, /PostgreSQL/i);
  assert.ok(workspace.pendingCandidate.projects.length >= 1);
  assert.ok(!workspace.saved);
  checks.push(
    "Live PDF text extraction and Gemini structuring with references; no automatic save",
  );
  workspace = await call(
    "/api/repositories",
    post({ url: "https://github.com/expressjs/express", consent: true }),
  );
  const repo = workspace.repositories.find(
    (r) => r.name.toLowerCase() === "expressjs/express",
  );
  assert.ok(repo);
  assert.ok(repo.sources.some((s) => s.path === "package.json"));
  assert.ok(
    repo.sources.some((s) => s.path === "Readme.md" || s.path === "README.md"),
  );
  assert.ok(
    repo.analysis,
    "Real repository retrieval succeeded but Gemini analysis did not",
  );
  assert.match(repo.commit, /^[a-f0-9]{40,64}$/);
  checks.push(
    "Live public Express repository retrieval and Gemini analysis pinned to a commit",
  );
  const c = workspace.pendingCandidate;
  const candidate = {
    name: c.name,
    headline: c.headline,
    skills: c.skills,
    education: c.education,
    experience: c.experience,
    projects: c.projects,
  };
  workspace = await call("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      candidate,
      sourceGroups: [...new Set(workspace.pendingSources.map((s) => s.group))],
      reviewed: true,
      revision: workspace.revision,
    }),
  });
  assert.ok(workspace.saved);
  checks.push("Explicit review/save creates a private snapshot");
  const revision = workspace.saved.revision;
  const first = await call(
    "/api/chat",
    post({
      profile: "private",
      revision,
      question:
        "What evidence supports this candidate using PostgreSQL? Do not attribute Express authorship to them.",
      history: [],
    }),
  );
  assert.equal(first.mode, "gemini");
  assert.ok(first.paragraphs.length);
  assert.ok(first.paragraphs.some((p) => p.citations.length));
  checks.push("Live contextual chat returns checked source citations");
  const firstText = [
    ...first.paragraphs.map((p) => p.text),
    ...first.unknowns,
  ].join("\n");
  const follow = await call(
    "/api/chat",
    post({
      profile: "private",
      revision,
      question: "What would you ask them about that in an interview?",
      history: [
        {
          role: "user",
          text: "What evidence supports this candidate using PostgreSQL?",
        },
        { role: "assistant", text: firstText },
      ],
    }),
  );
  assert.ok(follow.paragraphs.length + follow.unknowns.length);
  checks.push("Follow-up chat processes conversation history");
  const unknown = await call(
    "/api/chat",
    post({
      profile: "private",
      revision,
      question:
        "Did this candidate design a Kubernetes platform at Netflix serving ten million users?",
      history: [],
    }),
  );
  assert.ok(
    unknown.unknowns.length || unknown.withheld ||
    unknown.paragraphs.some((p) => /no evidence|not (?:supported|established|claimed)|insufficient|does not (?:support|establish)|cannot (?:verify|confirm)/i.test(p.text)),
    "Unsupported achievements must be explicitly uncertain: " + JSON.stringify(unknown),
  );
  checks.push(
    "Unsupported achievements produce explicit insufficient-evidence messaging",
  );
  const report = await call(
    "/api/match",
    post({
      profile: "private",
      revision,
      description:
        "Software engineering internship. Requirements: React and TypeScript interfaces, Express REST APIs, PostgreSQL data modeling, Kubernetes administration, and production AWS deployments. For each requirement explain what is established by evidence. No hiring recommendation.",
    }),
  );
  assert.ok(report.requirements.some((r) => r.status === "not_established"));
  assert.ok(report.requirements.some((r) => r.citations.length));
  checks.push(
    "Live job requirement extraction, status assessment, and cited explanations",
  );
  await mkdir(".data", { recursive: true });
  await writeFile(
    ".data/live-verification.json",
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        model: status.model,
        repository: repo.url,
        commit: repo.commit,
        checks,
      },
      null,
      2,
    ),
  );
  await call("/api/profile", { method: "DELETE" });
  console.log(
    "PASS",
    checks.length,
    "live workflow checks. Synthetic session deleted.",
  );
} catch (error) {
  console.error("LIVE WORKFLOW FAILED:", error.message);
  if (cookie) {
    try {
      await call("/api/profile", { method: "DELETE" });
    } catch {}
  }
  process.exitCode = 1;
}
