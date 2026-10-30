"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  AudioLines,
  ChevronDown,
  FileCode2,
  ArrowUp,
  ShieldCheck,
} from "lucide-react";
import { demoAnswer } from "@/lib/ai/demo-provider";
import { evidence } from "@/data/demo";
const questions = [
  "How has Alex used PostgreSQL?",
  "What backend experience is supported?",
  "Has Alex used Kubernetes?",
];
export function ProductPreview() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const answer = demoAnswer(questions[selected]);
  const source = evidence.find((item) => item.id === answer.evidenceIds[0]);
  return (
    <div className="product-preview">
      <div className="preview-window-bar">
        <span className="window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>CAREER TWIN / PREVIEW</span>
        <ShieldCheck size={14} />
      </div>
      <div className="preview-candidate">
        <div className="avatar">
          AM
          <span />
        </div>
        <div>
          <strong>Alex Morgan</strong>
          <p>Full-stack developer</p>
        </div>
        <span className="demo-badge">FICTIONAL</span>
      </div>
      <div className="preview-skill-row">
        <span>TypeScript</span>
        <span>React</span>
        <span>PostgreSQL</span>
      </div>
      <div className="preview-chat-demo">
        <div className="preview-user-bubble">{questions[selected]}</div>
        <div className="preview-assistant-title">
          <span className="small-logo">
            <AudioLines size={15} />
          </span>
          <strong>Alex’s career twin</strong>
          <span>Example answer</span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: reduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.18 }}
            className="preview-response"
            aria-live="polite"
          >
            <p>{answer.text}</p>
          </motion.div>
        </AnimatePresence>
        {source ? (
          <div className="preview-evidence">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <FileCode2 size={14} />
              <span>{source.title}</span>
              <ChevronDown size={13} />
            </button>
            {expanded && <blockquote>{source.excerpt}</blockquote>}
          </div>
        ) : (
          <div className="preview-unknown">
            <ShieldCheck size={14} />
            Not established by the sample evidence.
          </div>
        )}
      </div>
      <div className="preview-question-picker">
        <span>TRY A DIFFERENT QUESTION</span>
        <div>
          {questions.map((q, i) => (
            <button
              key={q}
              type="button"
              aria-pressed={selected === i}
              onClick={() => {
                setSelected(i);
                setExpanded(false);
              }}
            >
              {i === 0
                ? "Database experience"
                : i === 1
                  ? "Backend projects"
                  : "Missing evidence"}
              <ArrowUpRight size={11} />
            </button>
          ))}
        </div>
      </div>
      <Link className="preview-open" href="/profile/demo">
        Open this sample profile{" "}
        <span>
          <ArrowUp size={15} />
        </span>
      </Link>
      <p className="preview-disclaimer">
        Illustrative, scripted preview · All Alex information and excerpts are
        synthetic. The judge demo uses live Gemini.
      </p>
    </div>
  );
}
