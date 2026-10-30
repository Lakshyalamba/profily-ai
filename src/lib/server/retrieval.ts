import type { Source } from "@/types/intelligence";
/** Deterministic retrieval preserves contiguous original text so citations remain verifiable. */
export function relevantSources(
  sources: Source[],
  query: string,
  budget = 40000,
): Source[] {
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9+#.]{3,}/g) || []),
  ].filter(
    (t) =>
      ![
        "the",
        "this",
        "that",
        "with",
        "have",
        "does",
        "candidate",
        "about",
        "what",
        "their",
        "from",
        "experience",
        "project",
      ].includes(t),
  );
  const score = (text: string) =>
    terms.reduce(
      (sum, term) => sum + (text.toLowerCase().includes(term) ? 1 : 0),
      0,
    );
  const ranked = sources
    .map((source, index) => {
      let start = 0,
        best = -1;
      // Overlapping windows retain context even when relevant code occurs late in a file.
      for (let offset = 0; offset < source.excerpt.length; offset += 3000) {
        const value = score(source.excerpt.slice(offset, offset + 6000));
        if (value > best) {
          best = value;
          start = offset;
        }
      }
      return {
        source,
        index,
        start,
        rank:
          score(source.title) * 2 +
          Math.max(best, 0) +
          (source.kind === "developer" ? 2 : 0),
      };
    })
    .sort((a, b) => b.rank - a.rank || a.index - b.index);
  const selected: Source[] = [];
  let remaining = budget;
  for (const { source, start } of ranked) {
    if (selected.length >= 24 || remaining < 100) break;
    const excerpt = source.excerpt.slice(
      start,
      start + Math.min(6000, remaining),
    );
    if (!excerpt) continue;
    selected.push({ ...source, excerpt });
    remaining -= excerpt.length;
  }
  return selected;
}
