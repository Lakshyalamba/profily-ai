import Link from "next/link";
import { MobileNav } from "./mobile-nav";
import { TopNavigation } from "./navigation";
import { ArrowUpRight, AudioLines, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Profily AI home">
      <span className="brand-icon">
        <AudioLines size={21} />
      </span>
      <span className="brand-word">
        profily<span className="brand-ai">AI</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />
        <TopNavigation />
        <div className="nav-actions">
          <MobileNav />
          <Button asChild size="sm">
            <Link href="/create">
              <span className="desktop-create-label">Create your profile</span>
              <span className="mobile-create-label">Create profile</span>
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Brand />
          <p>
            More than a résumé.
            <br />A conversation with your work.
          </p>
          <span className="footer-principle">
            <ShieldCheck size={14} />
            Built around evidence.
          </span>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/profile/judge">
            Judge walkthrough <ArrowUpRight size={13} />
          </Link>
          <Link href="/match?profile=judge">Job matching</Link>
          <Link href="/interview?profile=judge">Voice interviews</Link>
        </div>
        <div>
          <h2>Your workspace</h2>
          <Link href="/create">Create a profile</Link>
          <Link href="/profile/private">Private career twin</Link>
          <Link href="/publish">Public sharing</Link>
          <Link href="/analytics">Recruiter activity</Link>
        </div>
        <div className="footer-note">
          <span className="tiny-label">CONTEXT, NOT ASSUMPTIONS</span>
          <p>
            Resume claims and repository observations stay distinct. Missing
            evidence stays visible.
          </p>
          <a
            href="https://github.com/Lakshyalamba/profily-ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            View the project <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>Profily AI · An evidence-first career profile.</span>
        <span>Voice-enabled. Human-reviewed.</span>
      </div>
    </footer>
  );
}
