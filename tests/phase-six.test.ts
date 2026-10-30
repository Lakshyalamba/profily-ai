import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeSnapshot, profileFor } from "../src/lib/server/profiles";
import { durableStorageEnabled, redisCommand } from "../src/lib/server/redis";
import { readFile, writeFile } from "../src/lib/server/storage-files";
import { sameOrigin } from "../src/lib/server/http";
import { setSession } from "../src/lib/server/store";
import { NextResponse } from "next/server";
const names = [
  "VERCEL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
];
async function environment(work: () => Promise<void>) {
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]]),
  );
  names.forEach((name) => delete process.env[name]);
  try {
    await work();
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}
test("judge walkthrough combines an explicitly fictional resume with actual pinned public repository evidence", async () => {
  const snapshot = judgeSnapshot();
  assert.match(snapshot.candidate.name, /Fictional demo/);
  assert.ok(
    snapshot.sources.some(
      (source) =>
        source.kind === "sample-resume" &&
        source.excerpt.includes("FICTIONAL PERSON"),
    ),
  );
  assert.ok(snapshot.repositories[0].analysis);
  assert.match(snapshot.repositories[0].commit, /^[a-f0-9]{40}$/);
  assert.ok(
    snapshot.sources
      .filter((source) => source.kind === "repository")
      .every((source) => source.commit === snapshot.repositories[0].commit),
  );
  assert.equal(
    (await profileFor(new Request("http://localhost/api/chat"), "judge"))
      .candidate.name,
    snapshot.candidate.name,
  );
  await assert.rejects(
    profileFor(
      new Request("http://localhost/api/chat"),
      "judge",
      "stale-revision",
    ),
    /example was updated/,
  );
});
test("Vercel refuses unsafe ephemeral-filesystem fallback when durable storage is missing", async () =>
  environment(async () => {
    process.env.VERCEL = "1";
    assert.throws(durableStorageEnabled, /Durable storage is not configured/);
    await assert.rejects(
      readFile("/tmp/profily-must-not-create.json", "utf8"),
      /Durable storage is not configured/,
    );
  }));
test("Redis credentials stay in HTTPS headers, redirects fail closed and upstream diagnostics remain private", async () =>
  environment(async () => {
    const original = globalThis.fetch;
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic-secret";
    globalThis.fetch = (async (url, init) => {
      assert.equal(String(url), "https://redis.example/");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer synthetic-secret",
      );
      return new Response(JSON.stringify({ result: null }));
    }) as typeof fetch;
    try {
      assert.equal(await redisCommand(["GET", "fixture"]), null);
      globalThis.fetch = (async () =>
        new Response(JSON.stringify({ error: "PRIVATE DIAGNOSTIC" }), {
          status: 401,
        })) as typeof fetch;
      await assert.rejects(
        redisCommand(["GET", "fixture"]),
        (error) =>
          error instanceof Error &&
          !error.message.includes("PRIVATE") &&
          /temporarily unavailable/.test(error.message),
      );
      process.env.UPSTASH_REDIS_REST_URL = "http://redis.example?token=unsafe";
      await assert.rejects(redisCommand(["GET", "fixture"]), /valid HTTPS/);
    } finally {
      globalThis.fetch = original;
    }
  }));
test("remote record capacity fails before an oversized write reaches the provider", async () =>
  environment(async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic-secret";
    await assert.rejects(
      writeFile(".data/profiles/fixture.json", "x".repeat(3000001)),
      /storage limit/,
    );
  }));
test("Vercel proxy origins validate against HTTPS and session cookies are secure", async () =>
  environment(async () => {
    process.env.VERCEL = "1";
    sameOrigin(
      new Request("http://profily.example/api/chat", {
        headers: { host: "profily.example", origin: "https://profily.example" },
      }),
    );
    assert.throws(() =>
      sameOrigin(
        new Request("http://profily.example/api/chat", {
          headers: {
            host: "profily.example",
            origin: "https://foreign.example",
          },
        }),
      ),
    );
    const response = setSession(
      NextResponse.json({ ok: true }),
      "a".repeat(64),
      new Request("http://profily.example/api/profile"),
    );
    assert.match(response.headers.get("set-cookie") || "", /Secure/);
  }));
