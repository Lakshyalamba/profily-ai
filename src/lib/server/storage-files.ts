import "server-only";
import * as fs from "node:fs/promises";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { durableStorageEnabled, redisCommand, storagePrefix } from "./redis";
import { AppError } from "./http";
const scope = new AsyncLocalStorage<{ key: string; token: string }>();
function key(file: string) {
  const parent = path.resolve(
    process.env.PROFILY_DATA_DIR || ".data/profiles",
    "..",
  );
  const relative = path.relative(parent, file).split(path.sep).join("/");
  if (relative.startsWith("../") || path.isAbsolute(relative))
    throw new AppError(500, "STORAGE_PATH", "The storage path is invalid.");
  return storagePrefix() + relative;
}
function errno(code: string) {
  return Object.assign(new Error(code), { code });
}
async function mutate(command: (string | number)[]) {
  const lock = scope.getStore();
  if (!lock) return redisCommand(command);
  const result = await redisCommand([
    "EVAL",
    "if redis.call('GET',KEYS[1]) ~= ARGV[1] then return {err='LEASE_LOST'} end; return redis.call(unpack(ARGV,2))",
    1,
    lock.key,
    lock.token,
    ...command,
  ]);
  return result;
}
/** Distributed short-write lease. AI and repository retrieval happen outside this scope. */
export async function withStorageLock<T>(
  name: string,
  work: () => Promise<T>,
): Promise<T> {
  if (!durableStorageEnabled()) return work();
  const lockKey =
    storagePrefix() + "lock:" + createHash("sha256").update(name).digest("hex");
  if (scope.getStore()?.key === lockKey) return work();
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    if (
      (await redisCommand(["SET", lockKey, token, "NX", "PX", 60000])) === "OK"
    ) {
      acquired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  if (!acquired)
    throw new AppError(
      409,
      "STORAGE_BUSY",
      "This workspace is being updated in another request. Please retry.",
    );
  const renew = setInterval(() => {
    void redisCommand([
      "EVAL",
      "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE',KEYS[1],60000) end; return 0",
      1,
      lockKey,
      token,
    ]).catch(() => {});
  }, 20000);
  try {
    return await scope.run({ key: lockKey, token }, work);
  } finally {
    clearInterval(renew);
    await redisCommand([
      "EVAL",
      "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end; return 0",
      1,
      lockKey,
      token,
    ]).catch(() => {});
  }
}
export async function mkdir(
  directory: string,
  options: { recursive: boolean; mode?: number },
) {
  if (!durableStorageEnabled()) await fs.mkdir(directory, options);
}
export async function readFile(
  file: string,
  encoding: "utf8",
): Promise<string> {
  if (!durableStorageEnabled()) return fs.readFile(file, encoding);
  const result = await redisCommand(["GET", key(file)]);
  if (result === null) throw errno("ENOENT");
  if (typeof result !== "string")
    throw new AppError(
      503,
      "STORAGE_INVALID",
      "The saved record could not be read.",
    );
  return result;
}
export async function writeFile(
  file: string,
  content: string,
  options: { mode?: number; flag?: string } = {},
) {
  if (!durableStorageEnabled()) return fs.writeFile(file, content, options);
  if (Buffer.byteLength(content, "utf8") > 3000000)
    throw new AppError(
      413,
      "STORAGE_CAPACITY",
      "This workspace reached its storage limit. Delete older interviews or job reports before saving more.",
    );
  const ttl = file.endsWith(".tmp")
    ? 60
    : file.includes("repository-cache")
      ? 1800
      : 7 * 86400;
  const result = await mutate([
    "SET",
    key(file),
    content,
    "EX",
    ttl,
    ...(options.flag === "wx" ? ["NX"] : []),
  ]);
  if (result === null) throw errno("EEXIST");
}
export async function rename(from: string, to: string) {
  if (!durableStorageEnabled()) return fs.rename(from, to);
  const lock = scope.getStore();
  await redisCommand([
    "EVAL",
    "if ARGV[1] ~= '' and redis.call('GET',KEYS[3]) ~= ARGV[1] then return {err='LEASE_LOST'} end; redis.call('RENAME',KEYS[1],KEYS[2]); redis.call('EXPIRE',KEYS[2],ARGV[2]); return 'OK'",
    3,
    key(from),
    key(to),
    lock?.key || key(from),
    lock?.token || "",
    to.includes("repository-cache") ? 1800 : 7 * 86400,
  ]);
}
export async function rm(file: string, options: { force: boolean }) {
  if (!durableStorageEnabled()) return fs.rm(file, options);
  const removed = await mutate(["DEL", key(file)]);
  if (!removed && !options.force) throw errno("ENOENT");
}
