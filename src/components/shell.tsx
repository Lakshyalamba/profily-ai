import Link from "next/link";
import { MobileNav } from "./mobile-nav";
import { ArrowUpRight, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Profily AI home">
      <span className="brand-icon">
        <AudioLines size={20} />
      </span>
      profily<span className="brand-ai">AI</span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="container nav">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/profile/judge">Judge demo</Link>
          <Link href="/match">Job match</Link>
          <Link href="/analytics">Recruiter workspace</Link>
        </nav>
        <MobileNav />
        <Button asChild size="sm">
          <Link href="/create">
            <span className="desktop-create-label">Create your profile</span>
            <span className="mobile-create-label">Create profile</span>{" "}
            <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="container footer">
      <Brand />
      <Link href="/analytics">Recruiter workspace ↗</Link>
      <span>Phase 06 · Hackathon edition</span>
    </footer>
  );
}
