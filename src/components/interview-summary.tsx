"use client";
import { interviewFollowUps } from "@/lib/interview-metrics";
import { useState } from "react";
import { Download, Loader2, CheckCircle2, CircleHelp } from "lucide-react";
import type { Interview } from "@/types/interview";
import { Button } from "./ui/button";
import { CitationLinks } from "./source-list";
import { errorMessage } from "@/lib/client-api";
export function InterviewSummary({ session }: { session: Interview }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const brief = session.brief;
  if (!brief) return null;
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/interviews/${session.id}/pdf`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        const body = response.headers
          .get("content-type")
          ?.includes("application/json")
          ? await response.json()
          : null;
        throw new Error(
          body?.error || "PDF export is temporarily unavailable. Please retry.",
        );
      }
      if (!response.headers.get("content-type")?.includes("application/pdf"))
        throw new Error("The server did not return a PDF.");
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `profily-interview-${session.id}.pdf`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="interview-brief">
      <div className="section-title">
        <div>
          <div className="eyebrow">COMPILED FROM RECORDED ANSWERS</div>
          <h2>Your interview brief.</h2>
        </div>
        <Button disabled={busy} onClick={download}>
          {busy ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Download size={15} />
          )}{" "}
          {busy ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </div>
      <p className="muted">
        {brief.questions.length} recorded questions ·{" "}
        {session.snapshot.candidate.name} ·{" "}
        {session.profileMode === "judge"
          ? "Fictional resume · real repository evidence"
          : session.profileMode === "demo"
            ? "Fictional evidence"
            : session.profileMode.startsWith("public-")
              ? "Reviewed published evidence"
              : "Reviewed private evidence"}
        . This brief excerpts up to 12 unique factual answers and 60 unique
        uncertainty statements; the complete transcript is available below. It
        is not an independent assessment or a hiring recommendation.
      </p>
      <div className="brief-overview">
        <div>
          <span>Questions recorded</span>
          <strong>{brief.questions.length}</strong>
        </div>
        <div>
          <span>Preserved sources</span>
          <strong>{session.snapshot.sources.length}</strong>
        </div>
        <div>
          <span>Unverified notes</span>
          <strong>{brief.unverified.length}</strong>
        </div>
      </div>
      <div className="brief-topics">
        {brief.topics.map((t) => (
          <span key={t.name}>{t.name}</span>
        ))}
      </div>
      <div className="brief-section">
        <h3>Questions asked</h3>
        {brief.questions.length ? (
          <ol>
            {brief.questions.map((q) => (
              <li key={q.turnId}>{q.text}</li>
            ))}
          </ol>
        ) : (
          <p>No questions were recorded. No assessment can be drawn.</p>
        )}
      </div>
      <div className="brief-section">
        <h3>
          <CheckCircle2 size={17} /> Evidence-supported experience discussed
        </h3>
        {brief.supportedExperience.length ? (
          brief.supportedExperience.map((fact, i) => (
            <article className="brief-fact" key={i}>
              <p>{fact.text}</p>
              <CitationLinks
                citations={fact.citations}
                sources={session.snapshot.sources}
              />
            </article>
          ))
        ) : (
          <p>No factual answer with supporting citations was recorded.</p>
        )}
      </div>
      <div className="brief-section">
        <h3>Technical skills mentioned</h3>
        <div className="preview-tags">
          {brief.skills.map((skill) => (
            <span key={skill.name}>
              {skill.name} · {skill.turnCount}{" "}
              {skill.turnCount === 1 ? "turn" : "turns"}
            </span>
          ))}
        </div>
        <p className="muted small">
          Counts include questions about unsupported skills. A mention does not
          establish proficiency.
        </p>
      </div>
      <div className="brief-section">
        <h3>
          <CircleHelp size={17} /> Areas to verify with the candidate
        </h3>
        {brief.unverified.length ? (
          brief.unverified.map((item, i) => (
            <p className="unknown-answer" key={i}>
              {item.text}
            </p>
          ))
        ) : (
          <p>
            No explicit uncertainty was recorded. This does not mean every claim
            was independently verified.
          </p>
        )}
      </div>
      {interviewFollowUps(session).length > 0 && (
        <div className="brief-section">
          <h3>Suggested follow-up checklist</h3>
          <p className="muted small">
            Based on the first five unresolved recorded questions, not a new
            assessment.
          </p>
          <ol>
            {interviewFollowUps(session).map((item) => (
              <li key={item.turnId}>{item.text}</li>
            ))}
          </ol>
        </div>
      )}
      <p className="muted small">
        Next step: inspect the cited material and ask the candidate to explain
        their personal contribution and any unresolved technical decisions.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
