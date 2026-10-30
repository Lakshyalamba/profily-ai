"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import {
  type Snapshot,
  workspaceSchema,
  snapshotSchema,
} from "@/types/intelligence";
import { interviewSchema } from "@/types/interview";
import { api, errorMessage } from "@/lib/client-api";
import { Button } from "./ui/button";
export function InterviewStart({
  demo,
  mode,
}: {
  demo: Snapshot;
  mode: string;
}) {
  const [profile, setProfile] = useState<Snapshot | null>(
      mode === "demo" || mode === "judge" ? demo : null,
    ),
    [loading, setLoading] = useState(mode !== "demo" && mode !== "judge"),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (mode === "demo" || mode === "judge") return;
    let active = true;
    api(
      mode.startsWith("public-")
        ? `/api/public/${mode.slice(7)}`
        : "/api/profile",
    )
      .then((value) => {
        if (active)
          setProfile(
            mode.startsWith("public-")
              ? snapshotSchema.parse(value)
              : workspaceSchema.parse(value).saved,
          );
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);
  async function start() {
    if (!profile || !consent || busy) return;
    setBusy(true);
    setError("");
    try {
      const session = interviewSchema.parse(
        await api("/api/interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: mode,
            revision: profile.revision,
            consent: true,
          }),
        }),
      );
      router.push(`/interview/${session.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }
  return (
    <div className="container inner-page interview-start">
      <div className="eyebrow">A MORE THOUGHTFUL INTERVIEW</div>
      <h1>
        Ask naturally.
        <br />
        Leave with the evidence.
      </h1>
      <p className="page-description">
        Explore technical experience by voice or text. Follow the sources, ask
        follow-ups, and finish with a professional interview brief.
      </p>
      <div className="interview-start-grid">
        <section className="form-card">
          <div className="welcome-icon">
            <Mic size={27} />
          </div>
          <h2>{profile?.candidate.name || "Your private career twin"}</h2>
          <p>
            {mode === "judge"
              ? "Fictional candidate · sample resume and pinned public GitHub evidence"
              : mode === "demo"
                ? "Fictional candidate · synthetic evidence"
                : "Reviewed profile · evidence preserved for this session"}
          </p>
          {loading ? (
            <p className="loading">
              <Loader2 className="spin" size={17} />
              Loading profile…
            </p>
          ) : !profile ? (
            <p className="notice">
              Create and save a private profile first.{" "}
              <Link href="/create">Open profile editor ↗</Link>
            </p>
          ) : (
            <>
              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I agree to save this interview’s text questions, AI answers,
                evidence snapshot, and summary privately on this server.
                Recognized speech is submitted as text. I authorize sending
                these questions and evidence to Gemini.
              </label>
              <Button onClick={start} disabled={!consent || busy}>
                {busy ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}{" "}
                {busy ? "Starting session…" : "Start interview session"}
              </Button>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>
        <aside className="draft-sidebar">
          <ShieldCheck size={27} />
          <h2>
            Clear boundaries.
            <br />
            Better conversations.
          </h2>
          <p>
            Microphone access starts only when you choose Start voice. Profily
            stores no audio. Browser speech services may process audio or spoken
            answer text remotely.
          </p>
          <p>
            Answers use the profile’s evidence, not assumptions about the
            candidate. Repository contents never establish personal authorship.
          </p>
          <p>
            Up to 30 questions per session. End the interview to automatically
            compile a brief and download a PDF. Your dashboard shows only
            recorded activity.
          </p>
          <p>
            Records are private to this browser session, expire after seven days
            without a write, and can be deleted. Keep this browser’s cookie to
            retain access; there is no account recovery.
          </p>
          <Link className="citation" href="/analytics">
            Open recruiter dashboard ↗
          </Link>
        </aside>
      </div>
    </div>
  );
}
