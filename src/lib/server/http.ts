import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public detail?: string,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  const known = error instanceof AppError;
  return NextResponse.json(
    {
      error: known
        ? error.message
        : error instanceof z.ZodError
          ? "The submitted data is invalid. Check the fields and try again."
          : "The operation could not be completed. Please retry.",
      code: known
        ? error.code
        : error instanceof z.ZodError
          ? "INVALID_INPUT"
          : "INTERNAL_ERROR",
    },
    {
      status: known ? error.status : error instanceof z.ZodError ? 400 : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next's internal request URL may use localhost while the browser uses 127.0.0.1.
  // The HTTP Host header identifies the actual destination; never trust forwarded hosts.
  const expected = new URL(process.env.PROFILY_PUBLIC_BASE_URL || request.url);
  if (process.env.VERCEL && !process.env.PROFILY_PUBLIC_BASE_URL)
    expected.protocol = "https:";
  const host = request.headers.get("host");
  if (host && !process.env.PROFILY_PUBLIC_BASE_URL) expected.host = host;
  if (
    (origin && origin !== expected.origin) ||
    (!origin && request.headers.get("sec-fetch-site") === "cross-site")
  ) {
    throw new AppError(
      403,
      "ORIGIN_REJECTED",
      "Cross-origin requests are not allowed.",
    );
  }
}
export async function boundedBytes(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(
          413,
          "TOO_LARGE",
          "The input exceeds the size limit.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    output.set(c, offset);
    offset += c.length;
  }
  return output;
}
export async function readJson(request: Request, limit = 32000) {
  const body = await boundedBytes(request.body, limit);
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Send a valid JSON request.");
  }
}
const windows = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 20, ms = 60000) {
  const now = Date.now();
  for (const [k, v] of windows) if (v.until < now) windows.delete(k);
  const item = windows.get(key) ?? { count: 0, until: now + ms };
  if (item.count >= limit || windows.size > 1500)
    throw new AppError(
      429,
      "RATE_LIMIT",
      "Too many requests. Please wait a minute and try again.",
    );
  item.count++;
  windows.set(key, item);
}
export async function aiRateLimit(session: string) {
  const { durableStorageEnabled, redisCommand, storagePrefix } =
    await import("./redis");
  if (durableStorageEnabled()) {
    const { createHash } = await import("node:crypto");
    const prefix = storagePrefix() + "quota:";
    const accepted = await redisCommand([
      "EVAL",
      "local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if a>=12 or b>=120 then return 0 end; if redis.call('INCR',KEYS[1])==1 then redis.call('PEXPIRE',KEYS[1],60000) end; if redis.call('INCR',KEYS[2])==1 then redis.call('PEXPIRE',KEYS[2],3600000) end; return 1",
      2,
      prefix + createHash("sha256").update(session).digest("hex"),
      prefix + "global",
    ]);
    if (accepted !== 1)
      throw new AppError(
        429,
        "RATE_LIMIT",
        "The AI request budget was reached. Please wait and try again.",
      );
    return;
  }
  rateLimit("ai:" + session, 12);
  rateLimit("ai-global", 120, 3600000);
}
