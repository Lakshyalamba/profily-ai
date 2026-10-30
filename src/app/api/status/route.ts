import { json } from "@/lib/server/http";
import { modelName } from "@/lib/server/gemini";
export function GET() {
  return json({
    geminiConfigured: !!process.env.GEMINI_API_KEY?.trim(),
    model: modelName(),
    storage:
      (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
        ? "durable-redis"
        : process.env.VERCEL
          ? "unconfigured"
          : "private-local-server",
    storageConfigured:
      !!(
        (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
        (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
      ) || !process.env.VERCEL,
  });
}
