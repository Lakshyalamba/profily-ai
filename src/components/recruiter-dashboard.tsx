"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  FileText,
  MessageSquare,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import type { Analytics } from "@/lib/interview-metrics";
import { api, errorMessage } from "@/lib/client-api";
import { ConfirmAction } from "./confirm-action";
import { Button } from "./ui/button";
import { EvidenceNavigation } from "./evidence-navigation";
import { SourceList, CitationLinks } from "./source-list";
export function RecruiterDashboard() {
  const [data, setData] = useState<Analytics | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await api<Analytics>("/api/analytics"));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);
  useEffect(() => {
    let active = true;
    api<Analytics>("/api/analytics")
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function remove(kind: "interviews" | "matches", id: string) {
    setBusy(id);
    try {
      await api(`/api/${kind}/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  if (!data)
    return (
      <div className="container inner-page">
        <h1>Recruiter workspace.</h1>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="loading">
            <Loader2 className="spin" size={18} />
            Loading recorded activity…
          </p>
        )}
        <Button variant="outline" onClick={load}>
          Retry
        </Button>
      </div>
    );
  const max = Math.max(1, ...data.days.map((d) => d.turnCount));
  return (
    <div className="container inner-page dashboard">
      <EvidenceNavigation />
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">RECRUITER WORKSPACE</div>
          <h1>
            Better context.
            <br />A clearer next conversation.
          </h1>
          <p className="page-description">
            Your saved interviews and job comparisons, in one place. Every
            metric below is calculated from this browser session’s actual
            recorded data.
          </p>
        </div>
        <div className="actions">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/interview?profile=demo">
              Start an interview <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="metric-grid">
        {[
          {
            label: "Recorded interviews",
            value: data.sessionCount,
            icon: MessageSquare,
            note: `${data.completedCount} completed`,
          },
          {
            label: "Recorded questions",
            value: data.turnCount,
            icon: AudioLines,
            note: `${data.voiceTurns} voice · ${data.textTurns} text`,
          },
          {
            label: "Saved job comparisons",
            value: data.savedMatches,
            icon: FileText,
            note: "Only explicitly saved reports",
          },
        ].map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <metric.icon size={17} />
            </div>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-charts">
        <section className="form-card">
          <div className="section-title">
            <h2>Conversation activity</h2>
            <span>LAST 7 DAYS · UTC</span>
          </div>
          <div
            className="activity-chart"
            aria-label="Recorded questions by day"
          >
            {data.days.map((day) => (
              <div key={day.date} className="activity-column">
                <span>{day.turnCount}</span>
                <div className="activity-track">
                  <div
                    className="activity-bar"
                    style={{
                      height: day.turnCount
                        ? `${(day.turnCount / max) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
                <small>{day.date.slice(5)}</small>
              </div>
            ))}
          </div>
          <p className="muted small">
            Successful recorded questions only. Casual unsaved chats are not
            tracked.
          </p>
        </section>
        <section className="form-card">
          <div className="section-title">
            <h2>Frequently discussed skills</h2>
            <span>TURN MENTIONS</span>
          </div>
          {data.skills.length ? (
            <div className="skill-metrics">
              {data.skills.slice(0, 10).map((s) => (
                <div key={s.name}>
                  <span>{s.name}</span>
                  <strong>{s.turnCount}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <AudioLines size={25} />
              <p>No skill mentions recorded yet.</p>
            </div>
          )}
          <p className="muted small">
            One count per recorded turn mentioning a skill. Unsupported
            questions count as discussion, not verified ability.
          </p>
        </section>
      </div>
      <section className="dashboard-section">
        <div className="section-title">
          <h2>Interview sessions</h2>
          <span>{data.sessions.length} SAVED</span>
        </div>
        {!data.sessions.length ? (
          <div className="empty-state">
            <MessageSquare size={30} />
            <h2>Your first conversation starts here.</h2>
            <p>
              Start an interview and consent to save its transcript. Nothing is
              pre-populated.
            </p>
            <Button asChild variant="outline">
              <Link href="/interview?profile=demo">
                Explore a fictional candidate
              </Link>
            </Button>
          </div>
        ) : (
          <div className="session-list">
            {data.sessions.map((s) => (
              <article className="session-row" key={s.id}>
                <div>
                  <Link href={`/interview/${s.id}`}>
                    <h3>
                      {s.candidateName}
                      <ArrowUpRight size={14} />
                    </h3>
                  </Link>
                  <p>
                    {new Date(s.startedAt).toLocaleString()} · {s.turnCount}{" "}
                    questions ·{" "}
                    {s.profileMode === "judge"
                      ? "Fictional candidate · real repository evidence"
                      : s.profileMode === "demo"
                        ? "Fictional profile"
                        : s.profileMode.startsWith("public-")
                          ? "Published profile"
                          : "Private profile"}
                  </p>
                </div>
                <span className="demo-badge">
                  {s.status === "completed" ? "BRIEF READY" : "ACTIVE"}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/interview/${s.id}`}>
                    {s.status === "completed" ? "View brief" : "Continue"}
                  </Link>
                </Button>
                <ConfirmAction
                  title="Delete this interview?"
                  description="This removes the saved transcript, evidence snapshot and brief from this browser’s workspace. Downloaded PDFs are not removed."
                  size="icon"
                  variant="ghost"
                  disabled={!!busy}
                  onConfirm={() => remove("interviews", s.id)}
                  aria-label={`Delete interview with ${s.candidateName}`}
                >
                  <Trash2 size={14} />
                </ConfirmAction>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-title">
          <h2>Saved job comparisons</h2>
          <span>{data.savedMatches} REPORTS</span>
        </div>
        <div className="comparison-totals">
          <span>
            Supported requirements <b>{data.requirementCounts.supported}</b>
          </span>
          <span>
            Partially supported <b>{data.requirementCounts.partial}</b>
          </span>
          <span>
            Not established <b>{data.requirementCounts.not_established}</b>
          </span>
        </div>
        {!data.matches.length ? (
          <div className="dashboard-empty form-card">
            <FileText size={27} />
            <p>
              No saved comparisons. Run a job match and choose to save its
              result.
            </p>
            <Link className="citation" href="/match">
              Open job matching ↗
            </Link>
          </div>
        ) : (
          data.matches.map((match) => (
            <details className="evidence-detail saved-match" key={match.id}>
              <summary>
                <span>
                  {match.candidateName}
                  <small>
                    {new Date(match.createdAt).toLocaleString()} ·{" "}
                    {match.profileMode === "judge"
                      ? "Fictional resume · real repository evidence"
                      : match.profileMode === "demo"
                        ? "Fictional evidence"
                        : match.profileMode.startsWith("public-")
                          ? "Published evidence"
                          : "Private evidence"}{" "}
                    · {match.result.requirements.length} requirements
                  </small>
                </span>
              </summary>
              <div className="source-content">
                <h3>Original job description</h3>
                <p>{match.description}</p>
                {match.result.requirements.map((r, i) => (
                  <article className="match-result" key={i}>
                    <span
                      className={`result-status status-${r.status === "supported" ? "supported" : r.status === "partial" ? "partially" : "not"}`}
                    >
                      {r.status === "not_established"
                        ? "Not established"
                        : r.status === "partial"
                          ? "Partially supported"
                          : "Supported"}
                    </span>
                    <h3>{r.requirement}</h3>
                    <p>{r.explanation}</p>
                    <CitationLinks
                      citations={r.citations}
                      sources={match.sources}
                      anchorPrefix={match.id + "-"}
                    />
                  </article>
                ))}
                <details className="evidence-detail">
                  <summary>Preserved evidence for this comparison</summary>
                  <div className="source-content">
                    <SourceList
                      sources={match.sources}
                      idPrefix={match.id + "-"}
                    />
                  </div>
                </details>
                {match.result.limitations.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
                <ConfirmAction
                  title="Delete this comparison?"
                  description="This removes the saved job description, result and preserved evidence from your workspace."
                  variant="ghost"
                  size="sm"
                  disabled={!!busy}
                  onConfirm={() => remove("matches", match.id)}
                >
                  <Trash2 size={13} />
                  Delete this saved comparison
                </ConfirmAction>
              </div>
            </details>
          ))
        )}
      </section>
      <p className="honesty">
        Private session-scoped records · No candidate rankings or fabricated
        activity · Data expires after seven days without a write
      </p>
    </div>
  );
}
