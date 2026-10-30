import { calibrateSkillListSupport } from "../src/lib/match-support";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  publicationSnapshot,
  publishProfile,
  loadPublicProfile,
  ownerPublication,
  unpublishProfile,
  mutatePublication,
} from "../src/lib/server/public-store";
import { relevantSources } from "../src/lib/server/retrieval";
import { collectRepository } from "../src/lib/server/github";
import { sameOrigin } from "../src/lib/server/http";
import { demoSnapshot } from "../src/lib/server/profiles";
import type { Source } from "../src/types/intelligence";
const source: Source = {
  id: "repo",
  group: "repo",
  kind: "repository",
  title: "server.ts",
  excerpt: "Observed source code, not proof of personal authorship.",
};
test("publication excludes raw resumes, unselected repository content and derived analyses", () => {
  const saved = demoSnapshot();
  saved.sources = [
    source,
    {
      ...source,
      id: "private-resume",
      kind: "resume",
      excerpt: "SECRET CONTACT",
    },
    {
      ...source,
      id: "claim",
      kind: "developer",
      excerpt: "Reviewed professional claim",
    },
  ];
  assert.deepEqual(
    publicationSnapshot(saved, []).sources.map((s) => s.id),
    ["claim"],
  );
  const published = publicationSnapshot(saved, ["repo"]);
  assert.deepEqual(
    published.sources.map((s) => s.id),
    ["repo", "claim"],
  );
  assert.equal(published.repositories.length, 0);
  assert.ok(!JSON.stringify(published).includes("SECRET CONTACT"));
  assert.throws(() => publicationSnapshot(saved, ["private-resume"]));
});
test("public snapshots persist independently, require correct owner, and unpublish", async () => {
  const dir = await mkdtemp(join(tmpdir(), "profily-public-"));
  const old = process.env.PROFILY_DATA_DIR;
  process.env.PROFILY_DATA_DIR = join(dir, "profiles");
  try {
    const owner = "a".repeat(64),
      saved = demoSnapshot();
    const result = await mutatePublication(owner, () =>
      publishProfile(owner, saved, []),
    );
    saved.candidate.name = "Changed privately";
    assert.notEqual(
      (await loadPublicProfile(result.id)).snapshot.candidate.name,
      saved.candidate.name,
    );
    assert.equal((await ownerPublication(owner))?.id, result.id);
    assert.equal(await ownerPublication("b".repeat(64)), null);
    await assert.rejects(loadPublicProfile("../profiles"));
    await mutatePublication(owner, () => unpublishProfile(owner));
    await assert.rejects(loadPublicProfile(result.id));
  } finally {
    if (old === undefined) delete process.env.PROFILY_DATA_DIR;
    else process.env.PROFILY_DATA_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
test("retrieval ranks relevant late-file evidence, bounds input, and preserves original contiguous quotes", () => {
  const sources = Array.from({ length: 40 }, (_, i) => ({
    ...source,
    id: `repo-${i}`,
    excerpt: "Unrelated configuration. ".repeat(600),
  }));
  sources.push({
    ...source,
    id: "authentication",
    excerpt:
      "Unrelated lines. ".repeat(600) +
      "PostgreSQL authentication with password hashing and session cookies.",
  });
  const selected = relevantSources(sources, "PostgreSQL authentication", 12000);
  assert.equal(selected[0].id, "authentication");
  assert.ok(selected[0].excerpt.includes("password hashing"));
  assert.ok(selected.reduce((n, s) => n + s.excerpt.length, 0) <= 12000);
  for (const item of selected)
    assert.ok(
      sources.find((s) => s.id === item.id)!.excerpt.includes(item.excerpt),
    );
});
test("canonical HTTPS origin works behind a proxy and rejects foreign origins", () => {
  const old = process.env.PROFILY_PUBLIC_BASE_URL;
  process.env.PROFILY_PUBLIC_BASE_URL = "https://profile.example";
  try {
    sameOrigin(
      new Request("http://localhost:3000/api/chat", {
        headers: { origin: "https://profile.example", host: "localhost:3000" },
      }),
    );
    assert.throws(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/chat", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    );
  } finally {
    if (old === undefined) delete process.env.PROFILY_PUBLIC_BASE_URL;
    else process.env.PROFILY_PUBLIC_BASE_URL = old;
  }
});
test("empty GitHub repositories produce an actionable error instead of a generic upstream failure", async () => {
  const original = globalThis.fetch;
  const dir = await mkdtemp(join(tmpdir(), "profily-empty-")),
    old = process.env.PROFILY_DATA_DIR;
  process.env.PROFILY_DATA_DIR = join(dir, "profiles");
  globalThis.fetch = (async (input) =>
    new Response(
      JSON.stringify(
        String(input).includes("/commits/")
          ? { message: "Git Repository is empty." }
          : {
              private: false,
              description: null,
              default_branch: "main",
              full_name: "example/empty",
            },
      ),
      { status: String(input).includes("/commits/") ? 409 : 200 },
    )) as typeof fetch;
  try {
    await assert.rejects(
      collectRepository("https://github.com/example/empty"),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes("no accessible commit"),
    );
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.PROFILY_DATA_DIR;
    else process.env.PROFILY_DATA_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});
test("non-Node repository manifests are retrieved, missing README and binary skips are disclosed", async () => {
  const original = globalThis.fetch,
    old = process.env.PROFILY_DATA_DIR;
  const dir = await mkdtemp(join(tmpdir(), "profily-layout-"));
  process.env.PROFILY_DATA_DIR = join(dir, "profiles");
  const sha = "a".repeat(40),
    binarySha = "b".repeat(40);
  globalThis.fetch = (async (input) => {
    const url = String(input);
    const body = url.includes("/commits/")
      ? { sha }
      : url.includes("/git/trees/")
        ? {
            truncated: false,
            tree: [
              {
                path: "pyproject.toml",
                mode: "100644",
                type: "blob",
                sha,
                size: 40,
              },
              {
                path: "src/main.py",
                mode: "100644",
                type: "blob",
                sha: binarySha,
                size: 20,
              },
            ],
          }
        : url.includes("/git/blobs/")
          ? {
              encoding: "base64",
              size: 40,
              content: Buffer.from(
                url.endsWith(binarySha)
                  ? "binary\0content"
                  : '[project]\ndependencies = ["fastapi"]\n',
              ).toString("base64"),
            }
          : {
              private: false,
              description: "Example Python API",
              default_branch: "main",
              full_name: "example/python",
            };
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
  try {
    const result = await collectRepository("https://github.com/example/python");
    assert.ok(result.sources.some((s) => s.path === "pyproject.toml"));
    assert.ok(!result.sources.some((s) => s.path === "src/main.py"));
    assert.ok(
      result.warnings.some((w) => w.includes("No eligible root README")),
    );
    assert.ok(result.warnings.some((w) => w.includes("Skipped binary")));
  } finally {
    globalThis.fetch = original;
    if (old === undefined) delete process.env.PROFILY_DATA_DIR;
    else process.env.PROFILY_DATA_DIR = old;
    await rm(dir, { recursive: true, force: true });
  }
});

test("a skill-list mention cannot fully support a more specific job requirement", () => {
  const sources = [
    {
      ...source,
      id: "reviewed-skills",
      kind: "developer" as const,
      excerpt: "skills: TypeScript, PostgreSQL",
    },
  ];
  const item = {
    requirement: "PostgreSQL data modeling",
    requirementQuote: "PostgreSQL data modeling",
    status: "supported" as const,
    explanation: "The developer lists PostgreSQL.",
    citations: [
      { sourceId: "reviewed-skills", quote: "skills: TypeScript, PostgreSQL" },
    ],
  };
  const output = calibrateSkillListSupport(
    {
      requirements: [
        item,
        { ...item, requirement: "TypeScript", requirementQuote: "TypeScript" },
      ],
      limitations: [],
    },
    sources,
  );
  assert.equal(output.requirements[0].status, "partial");
  assert.ok(
    output.requirements[0].explanation.includes(
      "does not establish the full scope",
    ),
  );
  assert.equal(output.requirements[1].status, "supported");
});
