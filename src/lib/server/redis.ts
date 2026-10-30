import "server-only";
import { AppError, boundedBytes } from "./http";
export function durableStorageEnabled() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) return true;
  if (url || token || process.env.VERCEL)
    throw new AppError(
      503,
      "STORAGE_CONFIG",
      "Durable storage is not configured. Connect Redis and configure its server-only REST URL and token.",
    );
  return false;
}
export function storagePrefix() {
  const prefix = process.env.PROFILY_STORAGE_PREFIX || "profily:v1";
  if (!/^[a-zA-Z0-9:_-]{1,100}$/.test(prefix))
    throw new AppError(
      503,
      "STORAGE_CONFIG",
      "The storage namespace configuration is invalid.",
    );
  return `${prefix}:{records}:`;
}
export async function redisCommand(
  command: (string | number)[],
): Promise<unknown> {
  const endpoint =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
  let url: URL;
  try {
    url = new URL(endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["", "/"].includes(url.pathname)
    )
      throw new Error();
  } catch {
    throw new AppError(
      503,
      "STORAGE_CONFIG",
      "Configure a valid HTTPS Redis REST endpoint without credentials in its URL.",
    );
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error();
    }
    const data = JSON.parse(
      new TextDecoder().decode(await boundedBytes(response.body, 8000000)),
    );
    if (
      !data ||
      typeof data !== "object" ||
      "error" in data ||
      !("result" in data)
    )
      throw new Error();
    return data.result;
  } catch {
    throw new AppError(
      503,
      "STORAGE_UNAVAILABLE",
      "The durable storage service is temporarily unavailable. Please retry; no local fallback was used.",
    );
  }
}
