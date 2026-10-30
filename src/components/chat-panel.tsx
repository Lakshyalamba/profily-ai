"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUp,
  AudioLines,
  Mic,
  Square,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { groundedAnswerSchema, type Snapshot } from "@/types/intelligence";
import { api, errorMessage } from "@/lib/client-api";
import { demoAnswer } from "@/lib/ai/demo-provider";
import { useVoice } from "@/hooks/use-voice";
import { Button } from "./ui/button";
import { VoiceControls } from "./voice-controls";
import {
  ConversationMessages,
  type ConversationMessage,
} from "./conversation-messages";
export function ChatPanel({
  profile,
  mode = "demo",
}: {
  profile: Snapshot;
  mode?: string;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]),
    [input, setInput] = useState(""),
    [scripted, setScripted] = useState(false);
  const voice = useVoice(async (question, inputMode) => {
    const next: ConversationMessage[] = [
      ...messages,
      { role: "user", text: question, inputMode },
    ];
    setMessages(next);
    setInput("");
    try {
      if (scripted && mode === "demo") {
        const answer = demoAnswer(question);
        setMessages([
          ...next,
          {
            role: "assistant",
            text: answer.text,
            demoEvidence: answer.evidenceIds,
          },
        ]);
        return answer.text;
      }
      const answer = groundedAnswerSchema.parse(
        await api(
          "/api/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question,
              profile: mode,
              revision: profile.revision,
              history: messages
                .slice(-20)
                .map((m) => ({ role: m.role, text: m.text.slice(0, 8000) })),
            }),
          },
          290000,
        ),
      );
      const text = [
        ...answer.paragraphs.map((p) => p.text),
        ...answer.unknowns,
      ].join("\n\n");
      setMessages([...next, { role: "assistant", text, answer }]);
      return text;
    } catch (e) {
      setMessages(messages);
      setInput(question);
      throw new Error(errorMessage(e));
    }
  });
  const busy = voice.state.phase === "processing",
    lastAnswer = messages.findLast((m) => m.role === "assistant")?.text || "";
  return (
    <section
      id="career-conversation"
      className="chat-panel"
      aria-label="Career conversation"
    >
      <div className="chat-header">
        <span className="small-logo">
          <AudioLines size={19} />
        </span>
        <div>
          <h2>Meet {profile.candidate.name.split(" ")[0]}’s career twin</h2>
          <p>Ask a question. Get the context.</p>
        </div>
        <span className="demo-badge">{scripted ? "SCRIPTED" : "GEMINI"}</span>
      </div>
      <div className="chat-disclosure">
        {mode === "judge"
          ? "Fictional resume · real repository evidence"
          : mode === "demo"
            ? "Fictional profile"
            : mode.startsWith("public-")
              ? "Published reviewed profile"
              : "Private reviewed profile"}{" "}
        · {scripted ? "Scripted responses" : "AI answers with source checks"}
      </div>
      <VoiceControls
        state={voice.state}
        controller={voice.controller}
        textInputId="question"
        lastAnswer={lastAnswer}
      />
      {mode === "demo" && (
        <label className="demo-toggle">
          <input
            type="checkbox"
            checked={scripted}
            disabled={busy}
            onChange={(e) => {
              voice.controller.stop();
              setScripted(e.target.checked);
              setMessages([]);
              voice.controller.clearError();
            }}
          />
          Use phase one scripted demo (no live AI)
        </label>
      )}
      <ConversationMessages
        messages={messages}
        sources={profile.sources}
        loading={busy}
        welcome={
          <div className="chat-welcome">
            <div className="welcome-icon">
              <AudioLines size={30} />
            </div>
            <h3>A little more than a résumé.</h3>
            <p>
              Explore projects, technical decisions, and the evidence behind
              them.
            </p>
            <div className="suggestions">
              {[
                "What backend experience is supported?",
                "Explain a project and its technical decisions.",
                "Which skills need more evidence?",
              ].map((q) => (
                <button
                  disabled={busy}
                  key={q}
                  onClick={() => voice.controller.ask(q)}
                >
                  {q}
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
        <label className="sr-only" htmlFor="question">
          Ask about the candidate
        </label>
        <input
          id="question"
          maxLength={2000}
          placeholder="Ask about their experience…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={busy && !voice.state.active}
          onClick={
            voice.state.active ? voice.controller.stop : voice.controller.start
          }
          aria-label={
            voice.state.active
              ? "Stop voice conversation"
              : "Start voice conversation"
          }
        >
          {voice.state.active ? <Square size={17} /> : <Mic size={18} />}
        </Button>
        <Button
          size="icon"
          disabled={busy || !input.trim()}
          aria-label="Send question"
        >
          <ArrowUp size={18} />
        </Button>
      </form>
      <div className="chat-bottom">
        <span>Casual chats stay in this tab.</span>
        {messages.length > 0 && (
          <button
            disabled={busy}
            onClick={() => {
              voice.controller.stop();
              setMessages([]);
              voice.controller.clearError();
            }}
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>
      <div className="interview-nudge">
        <span>Want a saved interview brief?</span>
        <Link href={`/interview?profile=${mode}`}>
          Start recruiter interview <ArrowUpRight size={13} />
        </Link>
      </div>
      {!scripted && (
        <p className="processing-note">
          Asking sends this profile, source excerpts, and recent conversation
          context to Gemini. Starting voice automatically submits completed
          speech. Start an interview and consent to save a transcript.
        </p>
      )}
    </section>
  );
}
