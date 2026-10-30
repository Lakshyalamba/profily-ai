import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  FileText,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Layers3,
  Mic,
  Code2,
  Braces,
  ScanLine,
  Check,
  CircleHelp,
  Quote,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductPreview } from "@/components/product-preview";
import { Reveal } from "@/components/design-motion";
export default function Home() {
  return (
    <>
      <section className="landing-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="container hero">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span />
              YOUR NEXT INTRODUCTION, REIMAGINED <ArrowUpRight size={12} />
            </div>
            <h1>
              Your work.
              <br />A voice of
              <br />
              <span>its own.</span>
            </h1>
            <p className="hero-description">
              You’re more than a list of skills. Turn your résumé and projects
              into a career twin that answers questions—and brings the evidence.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/profile/judge">
                  Meet a career twin <ArrowUpRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/create">
                  Build your profile <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <div className="hero-assurances">
              <span>
                <ShieldCheck size={15} />
                Evidence-first answers
              </span>
              <span>
                <Mic size={15} />
                Voice or text
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="preview-orbit" aria-hidden="true" />
            <ProductPreview />
            <div className="hero-floating-note">
              <span className="note-icon">
                <ScanLine size={18} />
              </span>
              <div>
                <strong>Every claim has context.</strong>
                <small>Resume claims ≠ repository observations</small>
              </div>
            </div>
          </div>
        </div>
        <div className="container connected-strip">
          <span>
            YOUR EVIDENCE.
            <br />
            <strong>ONE CONNECTED STORY.</strong>
          </span>
          <div>
            <FileText size={20} />
            Résumé
          </div>
          <i />
          <div>
            <GitBranch size={21} />
            GitHub
          </div>
          <i />
          <div>
            <Sparkles size={20} />
            Gemini
          </div>
          <i />
          <div>
            <AudioLines size={22} />
            Your voice
          </div>
        </div>
      </section>
      <section className="container story-section" id="why-profily">
        <Reveal>
          <div className="section-heading">
            <div>
              <div className="eyebrow">BEYOND THE BULLET POINTS</div>
              <h2>
                A résumé opens the door.
                <br />
                <span>Context starts the conversation.</span>
              </h2>
            </div>
            <p>
              A technology name tells you very little. Understand what was
              built, how it works, and what the available evidence actually
              supports.
            </p>
          </div>
        </Reveal>
        <div className="story-comparison">
          <Reveal className="static-resume">
            <span className="tiny-label">
              <FileText size={14} />
              THE TRADITIONAL RÉSUMÉ
            </span>
            <h3>
              Skills. Projects.
              <br />
              Still, so many questions.
            </h3>
            <div className="resume-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="flat-skills">
              <span>React</span>
              <span>Node.js</span>
              <span>PostgreSQL</span>
            </div>
            <p>
              What did they personally build?
              <br />
              Where is the supporting context?
            </p>
          </Reveal>
          <Reveal className="context-story" delay={0.08}>
            <span className="tiny-label">
              <AudioLines size={16} />
              THE PROFILY CONVERSATION
            </span>
            <Quote size={30} className="story-quote" />
            <h3>
              “How was the database
              <br />
              used in this project?”
            </h3>
            <p>
              Ask a specific question. Inspect a source-linked answer. Follow up
              on what matters. If the evidence is missing, that stays visible.
            </p>
            <Link href="/profile/judge">
              Explore the conversation <ArrowUpRight size={16} />
            </Link>
            <div className="context-source">
              <FileCheck2 size={18} />
              <span>Resume claims + repository excerpts</span>
              <ShieldCheck size={16} />
            </div>
          </Reveal>
        </div>
      </section>
      <section className="workflow-section" id="how-it-works">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <div className="eyebrow">
                  FROM YOUR WORK TO YOUR NEXT OPPORTUNITY
                </div>
                <h2>
                  A thoughtful introduction.
                  <br />
                  <span>In three simple steps.</span>
                </h2>
              </div>
              <Link className="text-link" href="/create">
                Start building <ArrowUpRight size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="workflow-grid">
            {[
              {
                number: "01",
                icon: FileText,
                title: "Bring the substance.",
                body: "Upload a text-based PDF and connect selected public repositories. Keep your work together, with its original context.",
                label: "RÉSUMÉ + PUBLIC REPOSITORIES",
              },
              {
                number: "02",
                icon: ScanLine,
                title: "Make it yours.",
                body: "Review extracted details, edit your story, and choose the evidence to include. Nothing is silently published.",
                label: "REVIEWED BY YOU",
              },
              {
                number: "03",
                icon: AudioLines,
                title: "Let the conversation begin.",
                body: "Share an approved profile. Recruiters can ask, listen, inspect sources, and leave with an evidence-backed interview brief.",
                label: "SHARE WITH INTENTION",
              },
            ].map(({ number, icon: Icon, title, body, label }, i) => (
              <Reveal className="workflow-step" key={number} delay={i * 0.06}>
                <div className="workflow-number">
                  {number}
                  <Icon size={23} />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="tiny-label">{label}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="container capabilities-section">
        <Reveal>
          <div className="section-heading">
            <div>
              <div className="eyebrow">AN INTRODUCTION THAT GOES FURTHER</div>
              <h2>
                Built for better questions.
                <br />
                <span>Designed for honest answers.</span>
              </h2>
            </div>
            <p>
              One connected experience for your projects, conversations,
              evidence and next steps.
            </p>
          </div>
        </Reveal>
        <div className="capability-grid">
          <Reveal className="capability-voice">
            <span className="tiny-label">
              <Mic size={15} />A MORE NATURAL INTERVIEW
            </span>
            <div className="marketing-orb" aria-hidden="true">
              <div>
                <AudioLines size={44} />
              </div>
              <span />
              <span />
            </div>
            <div>
              <h3>
                A voice behind
                <br />
                the work.
              </h3>
              <p>
                Speak a question, hear the answer, or switch to text. Keep the
                conversation moving with follow-ups, mute and playback controls.
              </p>
              <Link href="/interview?profile=judge">
                Open an interview <ArrowUpRight size={16} />
              </Link>
              <small>
                Turn-based browser speech services. Availability varies by
                browser.
              </small>
            </div>
          </Reveal>
          <Reveal className="capability-evidence" delay={0.05}>
            <span className="feature-icon">
              <Braces size={24} />
            </span>
            <h3>
              Follow the source.
              <br />
              Not an assumption.
            </h3>
            <p>
              Inspect original excerpts and pinned repository references. Code
              in a repository establishes observations—not personal authorship.
            </p>
            <div className="file-breadcrumb">
              <GitBranch size={15} />
              <span>Repository</span>
              <ArrowRight size={12} />
              <span>Source</span>
              <ArrowRight size={12} />
              <ShieldCheck size={15} />
            </div>
            <Link href="/profile/judge#evidence">
              Inspect the evidence <ArrowUpRight size={15} />
            </Link>
          </Reveal>
          <Reveal className="capability-match" delay={0.1}>
            <span className="feature-icon">
              <Layers3 size={24} />
            </span>
            <h3>
              A role. A profile.
              <br />A clearer picture.
            </h3>
            <p>
              Compare requirements with supplied evidence, with transparent
              explanations and no invented compatibility score.
            </p>
            <div className="status-example">
              <span>
                <Check size={13} />
                Supported
              </span>
              <span>
                <CircleHelp size={13} />
                Not established
              </span>
            </div>
            <Link href="/match?profile=judge">
              Explore job matching <ArrowUpRight size={15} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="container closing-section">
        <Reveal className="closing-panel">
          <span className="closing-mark" aria-hidden="true">
            <Code2 size={36} />
          </span>
          <div className="eyebrow">LET YOUR WORK SPEAK</div>
          <h2>
            Make your next introduction
            <br />
            <span>worth a conversation.</span>
          </h2>
          <p>
            Start with a fictional career twin. See the real difference evidence
            makes.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/profile/judge">
                Explore the judge demo <ArrowUpRight size={17} />
              </Link>
            </Button>
            <Link className="text-link" href="/create">
              Create your own <ArrowRight size={16} />
            </Link>
          </div>
          <div className="closing-disclosure">
            <ShieldCheck size={14} />
            Fictional candidate. Clearly labeled sources. No sign-in to explore.
          </div>
        </Reveal>
      </section>
    </>
  );
}
