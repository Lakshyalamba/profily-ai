import { aiRateLimit } from "../src/lib/server/http";
import {
  withStorageLock,
  writeFile as writeRecord,
} from "../src/lib/server/storage-files";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import {
  newSession,
  loadWorkspace,
  deleteWorkspace,
} from "../src/lib/server/store";
import { judgeSnapshot } from "../src/lib/server/profiles";
import {
  publishProfile,
  ownerPublication,
  loadPublicProfile,
  mutatePublication,
  unpublishProfile,
} from "../src/lib/server/public-store";
import { startInterview, endInterview } from "../src/lib/server/interviews";
import { clearActivity } from "../src/lib/server/activity-store";
import {
  durableStorageEnabled,
  redisCommand,
  storagePrefix,
} from "../src/lib/server/redis";
import { writeFile } from "node:fs/promises";
async function main() {
  assert.ok(
    durableStorageEnabled(),
    "Configure real Redis credentials before this live check.",
  );
  const owner = newSession(),
    snapshot = judgeSnapshot();
  await loadWorkspace(owner);
  try {
    const run = promisify(execFile);
    await Promise.all(
      ["a", "b"].map((worker) =>
        run(
          process.execPath,
          [
            "--conditions=react-server",
            "--import",
            "tsx",
            "tests/helpers/durable-update.ts",
          ],
          {
            env: {
              ...process.env,
              PROFILY_TEST_OWNER: owner,
              PROFILY_TEST_WORKER: worker,
            },
            timeout: 45000,
          },
        ),
      ),
    );
    const current = await loadWorkspace(owner);
    assert.deepEqual(current.pendingSources.map((source) => source.id).sort(), [
      "worker-a",
      "worker-b",
    ]);
    const publication = await mutatePublication(owner, () =>
      publishProfile(
        owner,
        snapshot,
        snapshot.sources
          .filter((source) => source.kind === "repository")
          .map((source) => source.id),
      ),
    );
    assert.equal((await ownerPublication(owner))?.id, publication.id);
    assert.equal(
      (await loadPublicProfile(publication.id)).snapshot.candidate.name,
      snapshot.candidate.name,
    );
    const session = await startInterview(owner, snapshot, "judge");
    const ended = await endInterview(owner, session.id);
    assert.equal(ended.status, "completed");
    await mutatePublication(owner, () => unpublishProfile(owner));
    await assert.rejects(loadPublicProfile(publication.id));
    // Exercise the exact Lua-based lease/rate command support on the real provider.
    const ttl = await redisCommand([
      "TTL",
      storagePrefix() +
        "profiles/" +
        (await import("node:crypto"))
          .createHash("sha256")
          .update(owner)
          .digest("hex") +
        ".json",
    ]);
    assert.ok(typeof ttl === "number" && ttl > 0 && ttl <= 7 * 86400);
    await Promise.all(Array.from({ length: 12 }, () => aiRateLimit(owner)));
    await assert.rejects(aiRateLimit(owner), /AI request budget/);
    const leaseName = "fence-" + randomUUID();
    const leaseKey =
      storagePrefix() +
      "lock:" +
      createHash("sha256").update(leaseName).digest("hex");
    await assert.rejects(
      withStorageLock(leaseName, async () => {
        await redisCommand(["DEL", leaseKey]);
        await writeRecord(".data/profiles/fence-test.json", "must-not-persist");
      }),
      /temporarily unavailable/,
    );
    assert.equal(
      await redisCommand(["GET", storagePrefix() + "profiles/fence-test.json"]),
      null,
    );
    const report = {
      checkedAt: new Date().toISOString(),
      realRedis: true,
      distributedQuotaEnforced: true,
      lostLeaseWriteRejected: true,
      independentProcesses: 2,
      noLostUpdates: true,
      publishedSnapshotReadBack: true,
      interviewPersistence: true,
      revocation: true,
      ttlEnforced: true,
    };
    await writeFile(
      ".data/live-phase-six-durable.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await mutatePublication(owner, () => unpublishProfile(owner));
    await clearActivity(owner);
    await deleteWorkspace(owner);
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Durable verification failed",
  );
  process.exitCode = 1;
});
