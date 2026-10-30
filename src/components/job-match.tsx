"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  MinusCircle,
  FileText,
  Loader2,
} from "lucide-react";
import {
  matchOutputSchema,
  snapshotSchema,
  workspaceSchema,
  type MatchOutput,
  type Snapshot,
} from "@/types/intelligence";
import { api, errorMessage } from "@/lib/client-api";
import { Button } from "./ui/button";
import { CitationLinks } from "./source-list";
export function JobMatch({
  demo,
  judge,
  initialMode = "demo",
}: {
  demo: Snapshot;
  judge?: Snapshot;
  initialMode?: string;
}) {
  const [saveResult, setSaveResult] = useState(false);
  const [text, setText] = useState(""),
    [result, setResult] = useState<MatchOutput | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [mode, setMode] = useState<string>(initialMode),
    [privateProfile, setPrivateProfile] = useState<Snapshot | null>(null);
  useEffect(() => {
    let active = true;
    api(
      initialMode.startsWith("public-")
        ? `/api/public/${initialMode.slice(7)}`
        : "/api/profile",
    )
      .then((value) => {
        if (active) {
          setPrivateProfile(
            initialMode.startsWith("public-")
              ? snapshotSchema.parse(value)
              : workspaceSchema.parse(value).saved,
          );
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [initialMode]);
  const profile =
    mode === "judge" ? judge : mode !== "demo" ? privateProfile : demo;
  async function analyze() {
    if (loading) return;
    if (!profile) {
      setError(
        "Save your reviewed private profile first, or choose the fictional demo.",
      );
      return;
    }
    if (text.trim().length < 20) {
      setError("Paste a job description of at least 20 characters.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      setResult(
        matchOutputSchema.parse(
          await api(
            "/api/match",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                description: text,
                profile: mode,
                revision: profile.revision,
                saveResult,
                requestId: saveResult ? crypto.randomUUID() : undefined,
              }),
            },
            290000,
          ),
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="match-layout">
      <section className="form-card">
        <div className="section-title">
          <h2>The opportunity</h2>
          <span>GEMINI · EVIDENCE-BASED</span>
        </div>
        <div className="field">
          <label htmlFor="match-profile">Candidate profile</label>
          <select
            id="match-profile"
            value={mode}
            disabled={loading}
            onChange={(e) => {
              setMode(e.target.value as string);
              setResult(null);
              setError("");
            }}
          >
            <option value="demo">Alex Morgan · fictional demo</option>
            {judge && (
              <option value="judge">
                Jordan Ellis · fictional resume, real repository evidence
              </option>
            )}
            <option
              value={
                initialMode.startsWith("public-") ? initialMode : "private"
              }
            >
              {privateProfile
                ? privateProfile.candidate.name +
                  (initialMode.startsWith("public-")
                    ? " · published profile"
                    : " · private profile")
                : "Private profile · create and save first"}
            </option>
          </select>
        </div>
        <label htmlFor="job-description" className="field-label">
          Job description
        </label>
        <textarea
          id="job-description"
          className="job-textarea"
          maxLength={15000}
          placeholder="Paste the role, responsibilities, and technical requirements…"
          value={text}
          disabled={loading}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
        />
        <label className="consent-row">
          <input
            type="checkbox"
            checked={saveResult}
            onChange={(e) => setSaveResult(e.target.checked)}
            disabled={loading}
          />
          Save this job description, result, and cited evidence privately in my
          recruiter dashboard (up to 30 reports).
        </label>
        <div className="match-actions">
          <button
            className="text-button"
            disabled={loading}
            onClick={() => {
              setText(
                "We are looking for a frontend intern with React and TypeScript experience, PostgreSQL data modeling, backend API authentication, and AWS deployment experience.",
              );
              setResult(null);
            }}
          >
            Use example description
          </button>
          <Button disabled={loading || !profile} onClick={analyze}>
            {loading ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <ArrowRight size={15} />
            )}{" "}
            {loading ? "Checking evidence…" : "Compare requirements"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted small">
          Only checked comparisons are saved. Comparing sends this description,
          the selected profile, and its source excerpts to Gemini. Missing means
          “not established by evidence.” This report is not a hiring
          recommendation.
        </p>
      </section>
      <section className="match-results" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="empty-state">
            <Loader2 size={30} className="spin" />
            <h2>Connecting requirements to evidence.</h2>
            <p>
              Extracting requirements and checking the source references. This
              may take a moment.
            </p>
          </div>
        ) : !result ? (
          <div className="empty-state">
            <FileText size={30} />
            <h2>Evidence over percentages.</h2>
            <p>
              Compare a job description with{" "}
              {profile?.candidate.name ?? "your reviewed profile"}’s experience.
              Unknown requirements remain unknown.
            </p>
          </div>
        ) : (
          <>
            <div className="section-title">
              <h2>Requirement comparison</h2>
              <span>
                {mode === "judge"
                  ? "FICTIONAL RESUME · REAL REPOSITORY EVIDENCE"
                  : mode === "demo"
                    ? "SYNTHETIC EVIDENCE"
                    : mode.startsWith("public-")
                      ? "PUBLISHED PROFILE"
                      : "PRIVATE PROFILE"}
              </span>
            </div>
            {result.requirements.map((r, i) => (
              <article className="match-result" key={i}>
                <span
                  className={`result-status status-${r.status === "supported" ? "supported" : r.status === "partial" ? "partially" : "not"}`}
                >
                  {r.status === "supported" ? (
                    <CheckCircle2 size={15} />
                  ) : r.status === "partial" ? (
                    <MinusCircle size={15} />
                  ) : (
                    <CircleHelp size={15} />
                  )}{" "}
                  {r.status === "supported"
                    ? "Supported"
                    : r.status === "partial"
                      ? "Partially supported"
                      : "Not established"}
                </span>
                <h3>{r.requirement}</h3>
                <details className="quote-detail">
                  <summary className="citation">
                    Job description excerpt
                  </summary>
                  <blockquote>{r.requirementQuote}</blockquote>
                </details>
                <p>{r.explanation}</p>
                <CitationLinks
                  citations={r.citations}
                  sources={profile?.sources ?? []}
                  profilePath={
                    mode.startsWith("public-")
                      ? `/p/${mode.slice(7)}`
                      : `/profile/${mode}`
                  }
                />
              </article>
            ))}
            <div className="resume-block">
              <h3>Assessment limits</h3>
              {result.limitations.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
