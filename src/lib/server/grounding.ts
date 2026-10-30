import "server-only";
import type { Citation, Source } from "@/types/intelligence";
import { AppError } from "./http";
export function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim();
}
/** Membership plus verbatim quote validation. This does not prove semantic entailment. */
export function validateCitations(citations: Citation[], sources: Source[]) {
  for (const c of citations) {
    const source = sources.find((s) => s.id === c.sourceId);
    if (!source || !normalize(source.excerpt).includes(normalize(c.quote)))
      throw new AppError(
        502,
        "UNGROUNDED_OUTPUT",
        "The AI returned a source reference that could not be verified. Nothing was saved. Please retry.",
      );
  }
}

/** Predefined spans let the model select evidence without rewriting quotes. */
export function quoteOptions(source: Source) {
  const text = normalize(source.excerpt),
    options: { id: string; text: string }[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + 360, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(" ", end);
      if (space > start + 180) end = space;
    }
    const value = text.slice(start, end).trim();
    if (value.length >= 5)
      options.push({ id: "q" + (options.length + 1), text: value });
    if (end >= text.length) break;
    start = Math.max(start + 1, end - 40);
    const next = text.indexOf(" ", start);
    if (next >= 0 && next < end) start = next + 1;
  }
  return options;
}
export function resolveQuotes(value: unknown, sources: Source[]): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveQuotes(v, sources));
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    if ("sourceId" in object && "quoteId" in object) {
      const source = sources.find((s) => s.id === object.sourceId);
      const option =
        source && quoteOptions(source).find((q) => q.id === object.quoteId);
      if (!source || !option)
        throw new AppError(
          502,
          "UNGROUNDED_OUTPUT",
          "The AI selected an evidence span that does not exist. Please retry.",
        );
      return { sourceId: source.id, quote: option.text };
    }
    return Object.fromEntries(
      Object.entries(object).map(([key, item]) => [
        key,
        resolveQuotes(item, sources),
      ]),
    );
  }
  return value;
}
