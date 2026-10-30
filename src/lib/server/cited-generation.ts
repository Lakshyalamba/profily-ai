import "server-only";
import { z } from "zod";
import type { Source } from "@/types/intelligence";
import { generate } from "./gemini";
import { quoteOptions, resolveQuotes } from "./grounding";
import { AppError } from "./http";
/** The model returns span IDs. Actual quotes are recovered from server-owned source text. */
export async function generateCited<T>(
  schema: z.ZodType<T>,
  task: string,
  payload: Record<string, unknown>,
  sources: Source[],
): Promise<T> {
  const shape = z.toJSONSchema(schema, {
    target: "draft-7",
    unrepresentable: "any",
  });
  function replace(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      const properties = object.properties as
        Record<string, unknown> | undefined;
      if (properties?.sourceId && properties?.quote) {
        const { quote: _quote, ...rest } = properties;
        void _quote;
        return {
          ...object,
          properties: { ...rest, quoteId: { type: "string", maxLength: 30 } },
          required: ["sourceId", "quoteId"],
        };
      }
      return Object.fromEntries(
        Object.entries(object).map(([key, item]) => [key, replace(item)]),
      );
    }
    return value;
  }
  const internal = z.fromJSONSchema(
    replace(shape) as Parameters<typeof z.fromJSONSchema>[0],
  );
  const indexed = sources.map(({ excerpt: _excerpt, ...source }) => {
    void _excerpt;
    return {
      ...source,
      quoteOptions: quoteOptions(sources.find((s) => s.id === source.id)!),
    };
  });
  const output = await generate(
    internal,
    task +
      "\nCITATION FORMAT: For every citation select sourceId and quoteId from that source’s quoteOptions. Do not write quote text yourself. Quote text will be recovered verbatim on the server. Select the span that actually supports the entire associated claim. Do not combine unrelated spans to infer authorship or achievements.",
    { ...payload, sources: indexed },
  );
  const result = schema.safeParse(resolveQuotes(output, sources));
  if (!result.success)
    throw new AppError(
      502,
      "AI_INVALID_OUTPUT",
      "The structured result exceeded the allowed field limits. Nothing was saved; please retry.",
    );
  return result.data;
}
