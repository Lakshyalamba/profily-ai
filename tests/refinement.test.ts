import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { POST as compareJob } from "../src/app/api/match/route";
import { GET as analytics } from "../src/app/api/analytics/route";
import { demoSnapshot } from "../src/lib/server/profiles";
import {
  publishProfile,
  ownerPublication,
} from "../src/lib/server/public-store";
import { sessionId } from "../src/lib/server/store";

test("a first-time public-profile guest can consent to save a job comparison without accessing creator data", async () => {
  const directory = await mkdtemp(join(tmpdir(), "profily-refinement-"));
  const oldDirectory = process.env.PROFILY_DATA_DIR;
  const oldKey = process.env.GEMINI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.PROFILY_DATA_DIR = join(directory, "profiles");
  process.env.GEMINI_API_KEY = "test-only";
  let calls = 0;
  try {
    const publication = await publishProfile(
      "a".repeat(64),
      demoSnapshot(),
      [],
    );
    globalThis.fetch = async () => {
      const output =
        calls++ % 2 === 0
          ? {
              requirements: [
                {
                  requirement: "Kubernetes operations",
                  requirementQuote: "Kubernetes operations",
                  status: "not_established",
                  explanation:
                    "The supplied evidence does not establish this experience.",
                  citations: [],
                },
              ],
              limitations: ["No independent candidate verification."],
            }
          : { grounded: true, reason: "Missing evidence is disclosed." };
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(output) }] },
            },
          ],
        }),
      );
    };
    const request = new Request("http://localhost/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: `public-${publication.id}`,
        revision: publication.snapshot.revision,
        description: "Requirements: Kubernetes operations.",
        saveResult: true,
        requestId: randomUUID(),
      }),
    });
    const response = await compareJob(request);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).recorded, true);
    const setCookie = response.headers.get("set-cookie") || "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=strict/i);
    const guestRequest = new Request("http://localhost/api/analytics", {
      headers: { cookie: setCookie.split(";")[0] },
    });
    assert.equal(
      (await (await analytics(guestRequest)).json()).savedMatches,
      1,
    );
    assert.equal(
      (
        await (
          await analytics(new Request("http://localhost/api/analytics"))
        ).json()
      ).savedMatches,
      0,
    );
    assert.equal(await ownerPublication(sessionId(guestRequest)!), null);
    assert.equal(calls, 2);
    const privateAttempt = await compareJob(
      new Request("http://localhost/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: "private",
          description: "Requirements: Kubernetes operations.",
          saveResult: true,
        }),
      }),
    );
    assert.equal(privateAttempt.status, 401);
    assert.equal(
      calls,
      2,
      "Unauthorized private evidence must never reach Gemini",
    );
    const unsaved = await compareJob(
      new Request("http://localhost/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: `public-${publication.id}`,
          description: "Requirements: Kubernetes operations.",
        }),
      }),
    );
    assert.equal(unsaved.status, 200);
    assert.equal((await unsaved.json()).recorded, false);
    const unsavedCookie = unsaved.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (
        await (
          await analytics(
            new Request("http://localhost/api/analytics", {
              headers: { cookie: unsavedCookie },
            }),
          )
        ).json()
      ).savedMatches,
      0,
    );
    assert.equal(calls, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldDirectory === undefined) delete process.env.PROFILY_DATA_DIR;
    else process.env.PROFILY_DATA_DIR = oldDirectory;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
    await rm(directory, { recursive: true, force: true });
  }
});
