"use client";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { GroundedAnswer, Source } from "@/types/intelligence";
import { CitationLinks } from "./source-list";
export type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
  answer?: GroundedAnswer;
  demoEvidence?: string[];
  inputMode?: "text" | "voice";
};
export function ConversationMessages({
  messages,
  sources,
  loading = false,
  welcome,
}: {
  messages: ConversationMessage[];
  sources: Source[];
  loading?: boolean;
  welcome?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, loading]);
  return (
    <div ref={ref} className="messages" aria-live="polite" aria-busy={loading}>
      {messages.length === 0
        ? welcome
        : messages.map((m, i) => (
            <div className={`message ${m.role}`} key={i}>
              <span className="message-role">
                {m.role === "user"
                  ? `YOU${m.inputMode === "voice" ? " · VOICE" : ""}`
                  : m.answer?.withheld
                    ? "CAREER TWIN · ANSWER WITHHELD"
                    : m.demoEvidence
                      ? "CAREER TWIN · SCRIPTED"
                      : "CAREER TWIN · GEMINI"}
              </span>
              {m.answer ? (
                <>
                  {m.answer.paragraphs.map((p, n) => (
                    <div key={n}>
                      <p>{p.text}</p>
                      <CitationLinks
                        citations={p.citations}
                        sources={sources}
                      />
                    </div>
                  ))}
                  {m.answer.unknowns.map((text, n) => (
                    <p className="unknown-answer" key={n}>
                      {text}
                    </p>
                  ))}
                </>
              ) : (
                <p>{m.text}</p>
              )}
              {m.demoEvidence?.map((id) => (
                <a className="citation" key={id} href={`#evidence-${id}`}>
                  {sources.find((s) => s.id === id)?.title} ↗
                </a>
              ))}
            </div>
          ))}
      {loading && (
        <p className="loading">
          <Loader2 className="spin" size={16} />
          Checking the profile evidence…
        </p>
      )}
    </div>
  );
}
