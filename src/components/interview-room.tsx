"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Loader2, Square, RefreshCw, AudioLines } from "lucide-react";
import { interviewSchema, type Interview } from "@/types/interview";
import { api, errorMessage } from "@/lib/client-api";
import { answerText } from "@/lib/interview-metrics";
import { useVoice } from "@/hooks/use-voice";
import { Button } from "./ui/button";
import { VoiceControls } from "./voice-controls";
import {
  ConversationMessages,
  type ConversationMessage,
} from "./conversation-messages";
import { SourceList } from "./source-list";
import { EvidenceNavigation } from "./evidence-navigation";
import { InterviewSummary } from "./interview-summary";
export function InterviewLoader({ id }: { id: string }) {
  const [session, setSession] = useState<Interview | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api(`/api/interviews/${id}`)
      .then((value) => {
        if (active) setSession(interviewSchema.parse(value));
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (!session)
    return (
      <div className="container inner-page">
        {error ? (
          <>
            <h1>Interview unavailable.</h1>
            <p className="error" role="alert">
              {error}
            </p>
            <Link className="citation" href="/analytics">
              Back to dashboard ↗
            </Link>
          </>
        ) : (
          <p className="loading">
            <Loader2 className="spin" size={18} />
            Loading your private session…
          </p>
        )}
      </div>
    );
  return <InterviewRoom initial={session} />;
}
function InterviewRoom({ initial }: { initial: Interview }) {
  const [session, setSession] = useState(initial),
    [input, setInput] = useState(""),
    [pending, setPending] = useState<{ question: string; id: string } | null>(
      null,
    ),
    [ending, setEnding] = useState(false),
    [error, setError] = useState("");
  const retry = useRef<{ question: string; id: string } | null>(null);
  const voice = useVoice(async (question, inputMode) => {
    if (session.status !== "active")
      throw new Error(
        "This interview is complete. Start another session to continue.",
      );
    const requestId =
      retry.current?.question === question
        ? retry.current.id
        : crypto.randomUUID();
    retry.current = { question, id: requestId };
    setPending({ question, id: requestId });
    setInput("");
    setError("");
    try {
      const value = interviewSchema.parse(
        await api(
          `/api/interviews/${session.id}/turn`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, requestId, inputMode }),
          },
          290000,
        ),
      );
      setSession(value);
      retry.current = null;
      const turn = value.turns.find((t) => t.id === requestId);
      return turn ? answerText(turn) : "";
    } catch (e) {
      setInput(question);
      throw new Error(errorMessage(e));
    } finally {
      setPending(null);
    }
  });
  const busy = voice.state.phase === "processing";
  useEffect(() => {
    if (!session.pending) return;
    const timer = setInterval(() => {
      api(`/api/interviews/${session.id}`)
        .then((value) => setSession(interviewSchema.parse(value)))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [session.id, session.pending]);
  async function refresh() {
    setError("");
    try {
      setSession(
        interviewSchema.parse(await api(`/api/interviews/${session.id}`)),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function end() {
    if (busy || ending) return;
    voice.controller.stop();
    setEnding(true);
    setError("");
    try {
      setSession(
        interviewSchema.parse(
          await api(`/api/interviews/${session.id}/end`, { method: "POST" }),
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setEnding(false);
    }
  }
  const messages: ConversationMessage[] = session.turns.flatMap((t) => [
    { role: "user", text: t.question, inputMode: t.inputMode },
    { role: "assistant", text: answerText(t), answer: t.answer },
  ]);
  if (pending && !session.turns.some((t) => t.id === pending.id))
    messages.push({ role: "user", text: pending.question });
  const last = session.turns.at(-1),
    active = session.status === "active";
  return (
    <div className="container inner-page interview-page">
      <EvidenceNavigation />
      <div className="interview-top">
        <div>
          <div className="eyebrow">
            {active ? "INTERVIEW IN PROGRESS" : "INTERVIEW COMPLETE"}
          </div>
          <h1>{session.snapshot.candidate.name}</h1>
          <p>
            {session.profileMode === "judge"
              ? "Fictional candidate · real public repository evidence"
              : session.profileMode === "demo"
                ? "Fictional candidate · synthetic evidence"
                : session.profileMode.startsWith("public-")
                  ? "Published profile · frozen evidence snapshot"
                  : "Private profile · frozen evidence snapshot"}{" "}
            · {session.turns.length}/30 recorded questions
          </p>
        </div>
        <div className="actions">
          <Button asChild variant="outline" size="sm">
            <Link href="/analytics">Recruiter dashboard</Link>
          </Button>
          {active && (
            <Button disabled={busy || ending || !!pending} onClick={end}>
              {ending ? (
                <Loader2 className="spin" size={15} />
              ) : (
                <Square size={14} />
              )}{" "}
              {ending ? "Compiling brief…" : "End & create brief"}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {active ? (
        <div className="interview-room-grid">
          <section className="chat-panel">
            <div className="chat-header">
              <span className="small-logo">
                <AudioLines size={19} />
              </span>
              <div>
                <h2>Recruiter interview</h2>
                <p>Follow-ups use this recorded session’s context.</p>
              </div>
              <span className="demo-badge">TEXT TRANSCRIPT SAVED</span>
            </div>
            <VoiceControls
              state={voice.state}
              controller={voice.controller}
              textInputId="interview-question"
              lastAnswer={last ? answerText(last) : ""}
              disabled={ending}
            />
            <ConversationMessages
              messages={messages}
              sources={session.snapshot.sources}
              loading={busy}
              welcome={
                <div className="chat-welcome">
                  <h3 className="interview-suggestions-title">
                    Suggested interview questions
                  </h3>
                  <div className="suggestions">
                    {[
                      "Which project demonstrates backend experience?",
                      "How was PostgreSQL used?",
                      "Which requirements need further evidence?",
                    ].map((q, index) => (
                      <button
                        aria-label={q}
                        key={q}
                        onClick={() => voice.controller.ask(q)}
                      >
                        {
                          ["Backend experience", "PostgreSQL", "Evidence gaps"][
                            index
                          ]
                        }
                        <ArrowUp size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              }
            />
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void voice.controller.ask(input);
              }}
            >
              <label className="sr-only" htmlFor="interview-question">
                Interview question
              </label>
              <input
                id="interview-question"
                placeholder="Ask a question or a follow-up…"
                maxLength={2000}
                disabled={busy || ending || session.turns.length >= 30}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button
                size="icon"
                disabled={
                  busy || ending || !input.trim() || session.turns.length >= 30
                }
                aria-label="Send interview question"
              >
                <ArrowUp size={17} />
              </Button>
            </form>
            <p className="processing-note">
              Completed questions and checked answers are saved privately.
              Failed requests are not counted. No audio is recorded. Voice and
              text share the same evidence and history.
            </p>
            {session.pending && !busy && (
              <p className="notice">
                A previous question may still be processing.{" "}
                <button className="text-button" onClick={refresh}>
                  <RefreshCw size={12} /> Refresh session
                </button>
              </p>
            )}
          </section>
          <aside className="draft-sidebar">
            <h2>Interview with context.</h2>
            <p>
              Ask what was built, how it works, and what the candidate
              personally contributed. Source claims remain distinct from
              independent proof.
            </p>
            <h3>Useful follow-ups</h3>
            <p>
              “What supports that?”
              <br />
              “Which project shows this?”
              <br />
              “What would you verify in a technical interview?”
            </p>
            <h3>When you’re finished</h3>
            <p>
              End the session to compile the actual questions, discussed skills,
              supporting source references, and unresolved areas. There is no
              candidate score.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={busy}
            >
              Reload saved session
            </Button>
          </aside>
        </div>
      ) : (
        <>
          <InterviewSummary session={session} />
          <details className="evidence-detail transcript-detail">
            <summary>
              Review complete saved transcript · {session.turns.length}{" "}
              questions
            </summary>
            <ConversationMessages
              messages={messages}
              sources={session.snapshot.sources}
            />
          </details>
          <div className="actions">
            <Button asChild variant="outline">
              <Link href={`/interview?profile=${session.profileMode}`}>
                Start another interview
              </Link>
            </Button>
          </div>
        </>
      )}
      <section className="profile-section interview-evidence" id="evidence">
        <div className="section-title">
          <h2>Evidence preserved for this interview</h2>
          <span>{session.snapshot.sources.length} SOURCES</span>
        </div>
        <p className="muted small">
          This snapshot is retained with the transcript so later profile edits
          do not change the recorded source context.
        </p>
        <SourceList sources={session.snapshot.sources} />
      </section>
    </div>
  );
}
