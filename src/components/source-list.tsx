import { FileText, ArrowUpRight } from "lucide-react";
import type { Source, Citation } from "@/types/intelligence";
export function sourceLabel(source: Source) {
  return source.kind === "repository"
    ? "Retrieved repository evidence"
    : source.kind === "resume"
      ? "Resume claim · not independently verified"
      : source.kind === "developer"
        ? "Reviewed developer claim"
        : source.kind === "sample-repository"
          ? "Synthetic repository excerpt"
          : "Synthetic resume claim";
}
export function SourceList({
  sources,
  idPrefix = "",
}: {
  sources: Source[];
  idPrefix?: string;
}) {
  return (
    <>
      {sources.map((source) => (
        <details
          key={source.id}
          id={`${idPrefix}evidence-${source.id}`}
          className="evidence-detail"
        >
          <summary>
            <FileText size={16} />
            <span>
              {source.title}
              <small>
                {sourceLabel(source)}
                {source.commit ? ` · ${source.commit.slice(0, 8)}` : ""}
              </small>
            </span>
          </summary>
          <div className="source-content">
            <p>{source.excerpt}</p>
            {source.url && (
              <a
                className="citation"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open pinned GitHub source <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        </details>
      ))}
    </>
  );
}
export function CitationLinks({
  citations,
  sources,
  profilePath = "",
  anchorPrefix = "",
}: {
  citations: Citation[];
  sources: Source[];
  profilePath?: string;
  anchorPrefix?: string;
}) {
  return (
    <>
      {citations.map((c, i) => (
        <details className="quote-detail" key={c.sourceId + "-" + i}>
          <summary className="citation">
            {sources.find((s) => s.id === c.sourceId)?.title ?? "Source"} ↗
          </summary>
          <blockquote>{c.quote}</blockquote>
          <a
            className="citation"
            href={`${profilePath}#${anchorPrefix}evidence-${c.sourceId}`}
          >
            Inspect full excerpt ↗
          </a>
        </details>
      ))}
    </>
  );
}
