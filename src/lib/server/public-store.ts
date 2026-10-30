import { withStorageLock } from "./storage-files";
import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "./storage-files";
import path from "node:path";
import { z } from "zod";
import { snapshotSchema, type Snapshot } from "@/types/intelligence";
import { AppError } from "./http";
const root = () =>
  path.resolve(
    process.env.PROFILY_DATA_DIR || ".data/profiles",
    "../public-profiles",
  );
const recordSchema = z.object({
  owner: z.string().regex(/^[a-f0-9]{64}$/),
  id: z.string().regex(/^[a-f0-9]{32}$/),
  expiresAt: z.number(),
  sourceRevision: z.string().optional(),
  snapshot: snapshotSchema,
});
const hash = (owner: string) =>
  createHash("sha256").update(owner).digest("hex");
const file = (id: string) => {
  if (!/^[a-f0-9]{32}$/.test(id))
    throw new AppError(404, "NOT_FOUND", "Published profile not found.");
  return path.join(root(), id + ".json");
};
export async function loadPublicProfile(id: string) {
  try {
    const record = recordSchema.parse(
      JSON.parse(await readFile(file(id), "utf8")),
    );
    if (record.expiresAt <= Date.now())
      throw new AppError(404, "EXPIRED", "This published link has expired.");
    return record;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      throw new AppError(404, "NOT_FOUND", "Published profile not found.");
    throw error;
  }
}
export async function ownerPublication(owner: string) {
  try {
    const id = await readFile(
      path.join(root(), hash(owner) + ".owner"),
      "utf8",
    );
    const record = await loadPublicProfile(id);
    if (record.owner !== hash(owner))
      throw new AppError(
        403,
        "OWNER",
        "Publication ownership could not be verified.",
      );
    return record;
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error instanceof AppError && error.status === 404)
    )
      return null;
    throw error;
  }
}
/** Raw resume pages never cross the publication boundary. Repository excerpts require explicit selection. */
export function publicationSnapshot(
  saved: Snapshot,
  sourceIds: string[],
): Snapshot {
  const allowed = saved.sources.filter(
    (s) =>
      s.kind === "developer" ||
      (s.kind === "repository" && sourceIds.includes(s.id)),
  );
  if (
    sourceIds.some(
      (id) =>
        !saved.sources.some((s) => s.id === id && s.kind === "repository"),
    )
  )
    throw new AppError(
      400,
      "SOURCE_SELECTION",
      "Select only available repository excerpts.",
    );
  // Repository analysis may cite an excluded source, so publish the selected evidence directly.
  return snapshotSchema.parse({
    ...saved,
    sources: allowed,
    repositories: [],
    revision: randomUUID(),
    savedAt: new Date().toISOString(),
  });
}
const queues = new Map<string, Promise<unknown>>();
export async function mutatePublication<T>(
  owner: string,
  work: () => Promise<T>,
): Promise<T> {
  const previous = queues.get(owner) || Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(() => withStorageLock("publication:" + owner, work));
  queues.set(owner, task);
  try {
    return await task;
  } finally {
    if (queues.get(owner) === task) queues.delete(owner);
  }
}
export async function publishProfile(
  owner: string,
  saved: Snapshot,
  sources: string[],
) {
  const existing = await ownerPublication(owner);
  const id = existing?.id || randomBytes(16).toString("hex");
  const record = {
    owner: hash(owner),
    sourceRevision: saved.revision,
    id,
    expiresAt: Date.now() + 7 * 86400000,
    snapshot: publicationSnapshot(saved, sources),
  };
  await mkdir(root(), { recursive: true, mode: 0o700 });
  const temp = file(id) + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
    await rename(temp, file(id));
  } finally {
    await rm(temp, { force: true });
  }
  await writeFile(path.join(root(), hash(owner) + ".owner"), id, {
    mode: 0o600,
  });
  return record;
}
export async function unpublishProfile(owner: string) {
  const record = await ownerPublication(owner);
  if (record) await rm(file(record.id), { force: true });
  await rm(path.join(root(), hash(owner) + ".owner"), { force: true });
}
