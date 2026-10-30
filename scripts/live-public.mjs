// Real HTTP publication workflow with synthetic data and an independent guest cookie.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = process.env.PROFILY_TEST_URL || "http://127.0.0.1:3000";
let owner = "",
  guest = "",
  publicPath = "";
const checks = [];
async function call(
  path,
  body,
  who = "owner",
  method = body ? "POST" : "GET",
  expected = 200,
) {
  const cookie = who === "owner" ? owner : guest;
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(180000),
  });
  const next = response.headers.get("set-cookie")?.split(";")[0];
  if (next) {
    if (who === "owner") owner = next;
    else guest = next;
  }
  const value = await response.json();
  console.log(path, response.status, "received");
  assert.equal(
    response.status,
    expected,
    `${path}: ${value?.error || response.status}`,
  );
  return value;
}
try {
  let workspace = await call("/api/profile");
  const candidate = {
    name: "Sam Rivera",
    headline: "Synthetic developer for publication verification",
    education: "Example University · fictional",
    skills: "TypeScript, PostgreSQL",
    experience:
      "Self-reported synthetic experience building a task API. No employment is claimed.",
    projects: [
      {
        id: "tasks",
        name: "Task API",
        description:
          "Synthetic developer claim: built a TypeScript task API with PostgreSQL persistence.",
        stack: ["TypeScript", "PostgreSQL"],
      },
    ],
  };
  workspace = await call(
    "/api/profile",
    {
      candidate,
      sourceGroups: [],
      reviewed: true,
      revision: workspace.revision,
    },
    "owner",
    "PUT",
  );
  await call(
    "/api/publish",
    { consent: false, revision: workspace.saved.revision, sourceIds: [] },
    "owner",
    "POST",
    400,
  );
  const publication = await call("/api/publish", {
    consent: true,
    revision: workspace.saved.revision,
    sourceIds: [],
  });
  publicPath = publication.path;
  const id = publicPath.split("/").at(-1),
    mode = "public-" + id;
  assert.equal((await fetch(base + publicPath)).status, 200);
  const snapshot = await call("/api/public/" + id, undefined, "guest");
  assert.equal(snapshot.candidate.name, candidate.name);
  assert.ok(!JSON.stringify(snapshot).includes("owner"));
  assert.ok(snapshot.sources.every((s) => s.kind === "developer"));
  assert.notEqual(owner, guest);
  await call("/api/publish", undefined, "guest", "GET").then((value) =>
    assert.equal(value, null),
  );
  checks.push(
    "Explicit publication consent; approved snapshot opens without creator cookie; owner information withheld",
  );
  workspace = await call(
    "/api/profile",
    {
      candidate: { ...candidate, name: "Private draft changed" },
      sourceGroups: [],
      reviewed: true,
      revision: workspace.revision,
    },
    "owner",
    "PUT",
  );
  assert.equal(
    (await call("/api/public/" + id, undefined, "guest")).candidate.name,
    candidate.name,
  );
  checks.push("Private edits do not silently alter published snapshot");
  const interview = await call(
    "/api/interviews",
    { profile: mode, revision: snapshot.revision, consent: true },
    "guest",
    "POST",
    201,
  );
  assert.equal(interview.snapshot.candidate.name, candidate.name);
  await call("/api/interviews/" + interview.id, undefined, "owner", "GET", 404);
  if (process.env.PROFILY_TEST_LIVE === "1") {
    const answer = await call(
      "/api/chat",
      {
        profile: mode,
        revision: snapshot.revision,
        question:
          "What evidence supports PostgreSQL experience? Distinguish self-reported claims from verification.",
        history: [],
      },
      "guest",
    );
    assert.ok(
      answer.paragraphs.some((p) => p.citations.length) || answer.withheld,
    );
    checks.push(
      "Actual Gemini public chat returns cited claims or explicitly withholds unsupported output",
    );
  }
  await call("/api/interviews/" + interview.id, undefined, "guest", "DELETE");
  checks.push(
    "Guest interview uses published snapshot; creator cannot read guest session",
  );
  await call("/api/publish", undefined, "guest", "DELETE");
  assert.equal((await fetch(base + publicPath)).status, 200);
  await call("/api/publish", undefined, "owner", "DELETE");
  assert.equal((await fetch(base + publicPath)).status, 404);
  await call("/api/public/" + id, undefined, "guest", "GET", 404);
  checks.push(
    "Another browser cannot unpublish creator profile; owner unpublish revokes page and API",
  );
  await writeFile(
    ".data/live-phase-four.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        liveGemini: process.env.PROFILY_TEST_LIVE === "1",
        checks,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  if (owner)
    await call("/api/profile", undefined, "owner", "DELETE").catch(() => {});
}
