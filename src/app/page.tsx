import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Code2,
  FileText,
  GitBranch,
  Layers3,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> A NEW WAY TO GET TO KNOW A DEVELOPER
          </div>
          <h1>
            Your experience.
            <br />A conversation.
            <br />
            <span>More possibilities.</span>
          </h1>
          <p className="hero-description">
            Go beyond the résumé. Give your work a voice with an interactive
            career twin that answers questions—and shows the evidence.
          </p>
          <div className="actions">
            <Button asChild>
              <Link href="/profile/judge">
                Try the judge demo <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/create">
                Build yours <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
          <div className="hero-note">
            <ShieldCheck size={15} /> Built around evidence. Designed for trust.
          </div>
        </div>
        <div className="hero-visual">
          <div className="preview-top">
            <span>
              <span className="status-dot" /> CAREER TWIN PREVIEW
            </span>
            <span className="tiny-label">FICTIONAL DEMO</span>
          </div>
          <div className="preview-person">
            <div className="avatar">
              AM
              <span />
            </div>
            <div>
              <h2>
                Alex Morgan{" "}
                <span className="mini-check">
                  <Check size={11} />
                </span>
              </h2>
              <p>Full-stack developer</p>
              <span className="availability">Open to internships</span>
            </div>
            <Link
              href="/profile/demo"
              aria-label="Open Alex’s sample profile"
              className="round-link"
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="preview-tags">
            <span>TypeScript</span>
            <span>React</span>
            <span>PostgreSQL</span>
            <span>+3</span>
          </div>
          <div className="preview-divider" />
          <div className="preview-question">
            What has Alex built with PostgreSQL?
          </div>
          <div className="preview-answer">
            <span className="small-logo">
              <AudioLines size={16} />
            </span>
            <div>
              <span className="assistant-label">
                ALEX’S CAREER TWIN <span>Demo</span>
              </span>
              <p>
                In Taskflow, Alex’s sample schema uses PostgreSQL to model
                users, workspaces, and tasks, with transactions for task
                creation.
              </p>
              <Link
                className="citation"
                href="/profile/demo#evidence-taskflow-db"
              >
                <FileText size={12} /> Taskflow · sample schema{" "}
                <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
          <Link className="preview-input" href="/profile/demo">
            <span>Ask about Alex’s experience…</span>
            <span className="input-send">
              <ArrowUpRight size={17} />
            </span>
          </Link>
          <div className="preview-foot">
            <ShieldCheck size={12} /> Illustrative answer · backed by sample
            evidence
          </div>
        </div>
      </section>
      <section className="container trust-strip">
        <span>LESS GUESSWORK. MORE CONTEXT.</span>
        <div>
          <FileText size={18} /> Résumé claims
        </div>
        <span className="strip-plus">+</span>
        <div>
          <GitBranch size={18} /> Project evidence
        </div>
        <span className="strip-plus">=</span>
        <div>
          <MessageSquare size={18} /> A better conversation
        </div>
      </section>
      <section className="container how-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE WORK BEHIND THE WORDS</div>
            <h2>
              A résumé tells a story.
              <br />
              <span>Let your work back it up.</span>
            </h2>
          </div>
          <p>
            A clearer picture of what you’ve built, how you think, and where you
            can make an impact.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature">
            <span className="feature-icon">
              <Layers3 />
            </span>
            <span className="step">01 / BRING YOUR EXPERIENCE</span>
            <h3>Your work, in one place.</h3>
            <p>
              The foundation for your résumé, projects, and professional story.
              Review your information before sharing it.
            </p>
            <span className="feature-caption">
              Private local drafts available
            </span>
          </article>
          <article className="feature">
            <span className="feature-icon">
              <AudioLines />
            </span>
            <span className="step">02 / START A CONVERSATION</span>
            <h3>Go beyond the bullet points.</h3>
            <p>
              Explore technical decisions and relevant experience through
              focused questions and evidence-linked answers.
            </p>
            <Link href="/profile/demo">
              Try the demo <ArrowRight size={14} />
            </Link>
          </article>
          <article className="feature">
            <span className="feature-icon">
              <ShieldCheck />
            </span>
            <span className="step">03 / FOLLOW THE EVIDENCE</span>
            <h3>Context you can inspect.</h3>
            <p>
              See where an answer comes from. Missing evidence stays
              visible—without inventing skills or experience.
            </p>
            <Link href="/match">
              Explore job matching <ArrowRight size={14} />
            </Link>
          </article>
        </div>
      </section>
      <section className="container bottom-cta">
        <div className="orb-icon">
          <Code2 size={26} />
        </div>
        <div>
          <div className="eyebrow">LET YOUR WORK SPEAK</div>
          <h2>There’s more to you than a PDF.</h2>
          <p>See what an evidence-backed career conversation can feel like.</p>
        </div>
        <Button asChild>
          <Link href="/profile/demo">
            Explore the example <ArrowUpRight size={17} />
          </Link>
        </Button>
      </section>
      <div className="container honesty">
        <Sparkles size={14} /> Phase three: voice conversations, recorded
        interviews, evidence-backed briefs, and PDF export. The example profile
        remains fictional.
      </div>
    </>
  );
}
