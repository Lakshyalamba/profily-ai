import { withStorageLock } from "./storage-files";
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "./storage-files";
import path from "node:path";
import {
  activitySchema,
  type Activity,
  type Interview,
} from "@/types/interview";
import { AppError } from "./http";
const root = () =>
  path.resolve(process.env.PROFILY_DATA_DIR || ".data/profiles", "../activity");
const queues = new Map<string, Promise<unknown>>();
const empty = (): Activity => ({
  interviews: [],
  matches: [],
  updatedAt: Date.now(),
});
function file(owner: string) {
  if (!/^[a-f0-9]{64}$/.test(owner))
    throw new AppError(401, "NO_SESSION", "Open a profile first.");
  return path.join(
    root(),
    createHash("sha256").update(owner).digest("hex") + ".json",
  );
}
export async function loadActivity(owner: string): Promise<Activity> {
  try {
    const value = activitySchema.parse(
      JSON.parse(await readFile(file(owner), "utf8")),
    );
    if (Date.now() - value.updatedAt > 7 * 86400000) {
      await rm(file(owner), { force: true });
      return empty();
    }
    return value;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw e;
  }
}
export async function updateActivity(
  owner: string,
  change: (data: Activity) => Activity,
) {
  const prior = queues.get(owner) || Promise.resolve();
  const task = prior
    .catch(() => {})
    .then(() =>
      withStorageLock("activity:" + owner, async () => {
        const next = activitySchema.parse(change(await loadActivity(owner)));
        next.updatedAt = Date.now();
        await mkdir(root(), { recursive: true, mode: 0o700 });
        const target = file(owner),
          tmp = target + "." + randomUUID() + ".tmp";
        try {
          await writeFile(tmp, JSON.stringify(next), {
            mode: 0o600,
            flag: "wx",
          });
          await rename(tmp, target);
        } finally {
          await rm(tmp, { force: true });
        }
        return next;
      }),
    );
  queues.set(owner, task);
  try {
    return await task;
  } finally {
    if (queues.get(owner) === task) queues.delete(owner);
  }
}
export async function clearActivity(owner: string) {
  await updateActivity(owner, () => empty());
}
export function interviewIn(activity: Activity, id: string): Interview {
  const value = activity.interviews.find((s) => s.id === id);
  if (!value)
    throw new AppError(
      404,
      "INTERVIEW_NOT_FOUND",
      "This interview is unavailable in this browser session.",
    );
  return value;
}
