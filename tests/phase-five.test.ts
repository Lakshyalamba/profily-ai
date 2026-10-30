import { focusAnswer } from "../src/lib/ai/answer-style";
import { GET as profileGET } from "../src/app/api/profile/route";
import { GET as analyticsGET } from "../src/app/api/analytics/route";
import { GET as publicGET } from "../src/app/api/public/[id]/route";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { DELETE as publicationDELETE } from "../src/app/api/publish/route";
import { POST as resumePOST } from "../src/app/api/resume/route";
import { collectRepository } from "../src/lib/server/github";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  reconcileEvidenceSelection,
  savedEvidenceSelection,
} from "../src/lib/evidence-selection";
import {
  emptyWorkspace,
  newSession,
  loadWorkspace,
  updateWorkspace,
} from "../src/lib/server/store";
import { demoSnapshot } from "../src/lib/server/profiles";
import { publishProfile } from "../src/lib/server/public-store";
import { GET as publicationGET } from "../src/app/api/publish/route";
import {
  POST as repositoryPOST,
  DELETE as repositoryDELETE,
} from "../src/app/api/repositories/route";
import { fetchWithRetry } from "../src/lib/server/fetch-retry";
import { VoiceController } from "../src/lib/voice/controller";
import { api } from "../src/lib/client-api";
import { interviewFollowUps, compileBrief } from "../src/lib/interview-metrics";
import type { Interview } from "../src/types/interview";
const source = {
  id: "sample",
  group: "resume-a",
  kind: "resume" as const,
  title: "Sample resume",
  excerpt: "Synthetic test evidence only.",
};
async function withStore(work: () => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "profily-phase-five-")),
    previous = process.env.PROFILY_DATA_DIR;
  process.env.PROFILY_DATA_DIR = join(directory, "profiles");
  try {
    await work();
  } finally {
    if (previous === undefined) delete process.env.PROFILY_DATA_DIR;
    else process.env.PROFILY_DATA_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
}
test("importing another repository preserves deliberate source exclusions", () => {
  const previous = {
    ...emptyWorkspace(),
    pendingSources: [source, { ...source, id: "second", group: "repo-b" }],
  };
  const next = {
    ...previous,
    pendingSources: [
      ...previous.pendingSources,
      { ...source, id: "third", group: "repo-c" },
    ],
  };
  assert.deepEqual(reconcileEvidenceSelection(previous, next, ["repo-b"]), [
    "repo-b",
    "repo-c",
  ]);
  assert.deepEqual(
    reconcileEvidenceSelection(next, { ...next, pendingSources: [source] }, [
      "repo-c",
    ]),
    [],
  );
});
test("loading saved details does not select replaced or unavailable resume evidence", () => {
  const snapshot = { ...demoSnapshot(), sources: [source] };
  const workspace = {
    ...emptyWorkspace(),
    saved: snapshot,
    pendingSources: [{ ...source, group: "new-resume" }],
  };
  assert.deepEqual(savedEvidenceSelection(workspace), {
    selected: [],
    replaced: 1,
  });
});
test("republishing restores selected source IDs and identifies the saved source revision without exposing owner", async () =>
  withStore(async () => {
    const owner = newSession(),
      snapshot = demoSnapshot();
    snapshot.sources = [{ ...source, kind: "repository", id: "repo-evidence" }];
    const record = await publishProfile(owner, snapshot, ["repo-evidence"]);
    assert.equal(record.sourceRevision, snapshot.revision);
    const response = await publicationGET(
      new Request("http://localhost/api/publish", {
        headers: { cookie: `profily_session=${owner}` },
      }),
    );
    const view = await response.json();
    assert.deepEqual(view.sourceIds, ["repo-evidence"]);
    assert.equal(view.sourceRevision, snapshot.revision);
    assert.equal(view.owner, undefined);
  }));
test("removing draft repository rejects stale edits and preserves saved profile until reviewed save", async () =>
  withStore(async () => {
    const owner = newSession(),
      id = "repo-" + "a".repeat(16);
    const snapshot = demoSnapshot();
    snapshot.sources = [{ ...source, kind: "repository", group: id }];
    const saved = await updateWorkspace(owner, (current) => ({
      ...current,
      saved: snapshot,
      pendingSources: snapshot.sources,
      repositories: [
        {
          id,
          url: "https://github.com/example/fixture",
          name: "example/fixture",
          commit: "a".repeat(40),
          fetchedAt: new Date().toISOString(),
          analysis: null,
          sources: snapshot.sources,
          warnings: [],
        },
      ],
    }));
    const request = (revision: string) =>
      new Request("http://localhost/api/repositories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `profily_session=${owner}`,
        },
        body: JSON.stringify({ id, revision }),
      });
    assert.equal((await repositoryDELETE(request("stale"))).status, 409);
    const response = await repositoryDELETE(request(saved.revision));
    assert.equal(response.status, 200);
    const current = await loadWorkspace(owner);
    assert.equal(current.repositories.length, 0);
    assert.equal(current.pendingSources.length, 0);
    assert.deepEqual(current.saved, snapshot);
  }));
test("transient gateway failures retry once under one deadline; quota errors never retry", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const signals: unknown[] = [];
  globalThis.fetch = (async (_url, init) => {
    calls++;
    signals.push(init?.signal);
    return new Response("{}", { status: calls === 1 ? 503 : 200 });
  }) as typeof fetch;
  try {
    assert.equal(
      (
        await fetchWithRetry("https://provider.invalid", {
          method: "POST",
          body: "{}",
        })
      ).status,
      200,
    );
    assert.equal(calls, 2);
    assert.equal(signals[0], signals[1]);
    calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("{}", { status: 429 });
    }) as typeof fetch;
    assert.equal(
      (await fetchWithRetry("https://provider.invalid", {})).status,
      429,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("voice constructor, playback and cancellation exceptions preserve text fallback", async () => {
  const voice = new VoiceController(
    () => ({
      recognition: () => {
        throw new Error("vendor failure");
      },
      speak: () => {
        throw new Error("playback failure");
      },
      cancel: () => {
        throw new Error("cancel failure");
      },
    }),
    async () => "Text answer",
  );
  voice.mount();
  assert.doesNotThrow(() => voice.start());
  assert.equal(voice.snapshot().phase, "idle");
  assert.match(voice.snapshot().error, /typing/);
  assert.doesNotThrow(() => voice.say("Answer"));
  assert.match(voice.snapshot().error, /text/);
  await voice.ask("Question", "text");
  assert.equal(voice.snapshot().phase, "idle");
  voice.dispose();
});
test("proxy HTML and malformed JSON become useful client errors, never raw page contents", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response("<html>private upstream diagnostic</html>", {
        status: 502,
      })) as typeof fetch;
    await assert.rejects(
      api("/api/chat"),
      /temporarily unavailable \(HTTP 502\)/,
    );
    globalThis.fetch = (async () =>
      new Response("{bad", {
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    await assert.rejects(api("/api/chat"), /could not be read/);
  } finally {
    globalThis.fetch = original;
  }
});
test("follow-up recommendations derive only from actual unresolved recorded questions", () => {
  const session: Interview = {
    id: "00000000-0000-4000-8000-000000000001",
    profileMode: "demo",
    snapshot: demoSnapshot(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "active",
    consent: "transcript-v1",
    pending: null,
    brief: null,
    turns: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        question: "Has this developer operated Kubernetes?",
        answer: {
          paragraphs: [],
          unknowns: [
            "No Kubernetes evidence was supplied.",
            "Production deployment is unverified.",
          ],
        },
        inputMode: "text",
        createdAt: new Date().toISOString(),
      },
    ],
  };
  session.brief = compileBrief(session);
  const result = interviewFollowUps(session);
  assert.equal(result.length, 1);
  assert.ok(result[0].text.includes(session.turns[0].question));
  assert.ok(result[0].text.includes("No Kubernetes evidence was supplied."));
  assert.deepEqual(interviewFollowUps({ ...session, turns: [] }), []);
});

test("a slow repository import cannot overwrite a newer draft revision", async () =>
  withStore(async () => {
    const original = globalThis.fetch,
      key = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const owner = newSession();
    await loadWorkspace(owner);
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (!url.includes("/commits/") && !url.includes("/git/trees/")) {
        entered();
        await gate;
      }
      return new Response(
        JSON.stringify(
          url.includes("/commits/")
            ? { sha: "a".repeat(40) }
            : url.includes("/git/trees/")
              ? { truncated: false, tree: [] }
              : {
                  private: false,
                  description: "Test repository",
                  default_branch: "main",
                  full_name: "example/concurrency",
                },
        ),
      );
    }) as typeof fetch;
    try {
      const pending = repositoryPOST(
        new Request("http://localhost/api/repositories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `profily_session=${owner}`,
          },
          body: JSON.stringify({
            url: "https://github.com/example/concurrency",
            consent: true,
          }),
        }),
      );
      await started;
      const newer = await updateWorkspace(owner, (current) => ({
        ...current,
        saved: demoSnapshot(),
      }));
      release();
      assert.equal((await pending).status, 409);
      const actual = await loadWorkspace(owner);
      assert.equal(actual.revision, newer.revision);
      assert.equal(actual.repositories.length, 0);
      assert.ok(actual.saved);
    } finally {
      release();
      globalThis.fetch = original;
      if (key === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = key;
    }
  }));

test("an owner can revoke publication after the private workspace expires", async () =>
  withStore(async () => {
    const owner = newSession(),
      snapshot = demoSnapshot();
    const workspace = await updateWorkspace(owner, (current) => ({
      ...current,
      saved: snapshot,
    }));
    const publication = await publishProfile(owner, snapshot, []);
    const file = join(
      process.env.PROFILY_DATA_DIR!,
      createHash("sha256").update(owner).digest("hex") + ".json",
    );
    await writeFile(
      file,
      JSON.stringify({ ...workspace, updatedAt: Date.now() - 8 * 86400000 }),
    );
    assert.equal((await loadWorkspace(owner)).saved, null);
    const request = new Request("http://localhost/api/publish", {
      method: "DELETE",
      headers: { cookie: `profily_session=${owner}` },
    });
    assert.equal((await publicationDELETE(request)).status, 200);
    assert.equal(
      await (
        await publicationGET(
          new Request("http://localhost/api/publish", {
            headers: { cookie: `profily_session=${owner}` },
          }),
        )
      ).json(),
      null,
    );
    assert.ok(publication.id);
  }));
test("GitHub token stays in a fixed-host header and cannot enable private repository analysis", async () =>
  withStore(async () => {
    const original = globalThis.fetch,
      previous = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = "synthetic-test-token";
    let status = 401,
      calls = 0;
    globalThis.fetch = (async (url, init) => {
      calls++;
      assert.equal(new URL(String(url)).origin, "https://api.github.com");
      assert.ok(!String(url).includes("synthetic-test-token"));
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer synthetic-test-token",
      );
      return new Response(
        JSON.stringify({
          private: true,
          description: null,
          default_branch: "main",
          full_name: "example/private",
        }),
        { status },
      );
    }) as typeof fetch;
    try {
      await assert.rejects(
        collectRepository("https://github.com/example/private"),
        /GITHUB_TOKEN was rejected/,
      );
      status = 200;
      await assert.rejects(
        collectRepository("https://github.com/example/private"),
        /Only public repositories/,
      );
      assert.equal(calls, 2);
    } finally {
      globalThis.fetch = original;
      if (previous === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = previous;
    }
  }));
test("malformed resume uploads return a readable 400 without invoking AI", async () =>
  withStore(async () => {
    const previous = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "synthetic-not-sent";
    const owner = newSession();
    try {
      const result = await resumePOST(
        new Request("http://localhost/api/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `profily_session=${owner}`,
          },
          body: "invalid upload",
        }),
      );
      assert.equal(result.status, 400);
      assert.equal((await result.json()).code, "INVALID_UPLOAD");
      assert.equal((await loadWorkspace(owner)).pendingCandidate, null);
    } finally {
      if (previous === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previous;
    }
  }));

test("cross-site reads cannot replace a private owner cookie; public evidence remains readable", async () =>
  withStore(async () => {
    const headers = { "sec-fetch-site": "cross-site" };
    for (const handler of [profileGET, analyticsGET]) {
      const response = await handler(
        new Request("http://localhost/api/profile", { headers }),
      );
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("set-cookie"), null);
    }
    const record = await publishProfile(newSession(), demoSnapshot(), []);
    const response = await publicGET(
      new Request("http://localhost/api/public/" + record.id, { headers }),
      { params: Promise.resolve({ id: record.id }) },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal((await response.json()).candidate.name, "Alex Morgan");
  }));

test("ordinary factual answers exclude unsolicited questions while explicit question requests remain supported", () => {
  const answer = {
    paragraphs: [
      {
        kind: "question" as const,
        text: "How would you design this API?",
        citations: [],
      },
    ],
    unknowns: ["No production Kubernetes evidence was provided."],
  };
  assert.equal(
    focusAnswer(answer, "Is Kubernetes experience established?").paragraphs
      .length,
    0,
  );
  assert.equal(
    focusAnswer(answer, "What would you ask in an interview?").paragraphs
      .length,
    1,
  );
  assert.equal(
    focusAnswer(
      answer,
      "Do not suggest interview questions; explain the project.",
    ).paragraphs.length,
    0,
  );
  const fallback = focusAnswer(
    { ...answer, unknowns: [] },
    "What is verified?",
  );
  assert.equal(fallback.paragraphs.length, 0);
  assert.equal(fallback.unknowns.length, 1);
});
