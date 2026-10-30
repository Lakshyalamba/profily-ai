import { withStorageLock } from "./storage-files";
import "server-only";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "./storage-files";
import path from "node:path";
import { NextResponse } from "next/server";
import { type Workspace, workspaceSchema } from "@/types/intelligence";
import { AppError } from "./http";
const cookieName = "profily_session";
const root = () =>
  path.resolve(process.env.PROFILY_DATA_DIR || ".data/profiles");
const ttl = 7 * 24 * 3600 * 1000;
const queues = new Map<string, Promise<unknown>>();
export function sessionId(request: Request) {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
export function newSession() {
  return randomBytes(32).toString("hex");
}
export function setSession(
  response: NextResponse,
  id: string,
  request: Request,
) {
  response.cookies.set(cookieName, id, {
    httpOnly: true,
    sameSite: "strict",
    secure:
      !!process.env.VERCEL ||
      new URL(process.env.PROFILY_PUBLIC_BASE_URL || request.url).protocol ===
        "https:",
    path: "/",
    maxAge: ttl / 1000,
  });
  return response;
}
function file(id: string) {
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new AppError(
      401,
      "NO_SESSION",
      "Create or load your private profile first.",
    );
  return path.join(
    root(),
    createHash("sha256").update(id).digest("hex") + ".json",
  );
}
export function emptyWorkspace(): Workspace {
  return {
    pendingCandidate: null,
    pendingSources: [],
    repositories: [],
    saved: null,
    updatedAt: Date.now(),
    revision: randomUUID(),
  };
}
async function initializeWorkspace(id: string): Promise<Workspace> {
  const data = emptyWorkspace();
  await mkdir(root(), { recursive: true, mode: 0o700 });
  try {
    await writeFile(file(id), JSON.stringify(data), {
      mode: 0o600,
      flag: "wx",
    });
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      return loadWorkspace(id);
    throw error;
  }
}
export async function loadWorkspace(id: string): Promise<Workspace> {
  try {
    const data = workspaceSchema.parse(
      JSON.parse(await readFile(file(id), "utf8")),
    );
    if (Date.now() - data.updatedAt > ttl) {
      await rm(file(id), { force: true });
      return initializeWorkspace(id);
    }
    return data;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return initializeWorkspace(id);
    throw e;
  }
}
/** Serialize mutations within this single-server local store and atomically replace each file. */
export async function updateWorkspace(
  id: string,
  update: (data: Workspace) => Workspace | Promise<Workspace>,
) {
  const previous = queues.get(id) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(() =>
      withStorageLock("workspace:" + id, async () => {
        const next = workspaceSchema.parse(
          await update(await loadWorkspace(id)),
        );
        next.updatedAt = Date.now();
        next.revision = randomUUID();
        await mkdir(root(), { recursive: true, mode: 0o700 });
        const target = file(id),
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
  queues.set(id, task);
  try {
    return await task;
  } finally {
    if (queues.get(id) === task) queues.delete(id);
  }
}
export async function deleteWorkspace(id: string) {
  await updateWorkspace(id, () => emptyWorkspace());
  await rm(file(id), { force: true });
}
export function requireSession(request: Request) {
  const id = sessionId(request);
  if (!id)
    throw new AppError(
      401,
      "NO_SESSION",
      "Create and review a private profile first.",
    );
  return id;
}
