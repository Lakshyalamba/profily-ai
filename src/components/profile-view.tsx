import {
  AudioLines,
  ArrowUpRight,
  Layers3,
  FileText,
  ShieldCheck,
  BriefcaseBusiness,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import type { Snapshot } from "@/types/intelligence";
import { EvidenceNavigation } from "./evidence-navigation";
import { ChatPanel } from "./chat-panel";
import { Button } from "./ui/button";
import { SourceList, CitationLinks } from "./source-list";
export function ProfileView({
  profile,
  mode,
}: {
  profile: Snapshot;
  mode: string;
}) {
  const candidate = profile.candidate,
    synthetic = mode === "demo" || mode === "judge";
  const initials = candidate.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");
  return (
    <div className="container profile-page">
      <EvidenceNavigation />
      <div className="page-topline">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>
          {synthetic
            ? "Example career twin"
            : mode.startsWith("public-")
              ? "Published career twin"
              : "Private career twin"}
        </span>
        <span className="synthetic-pill">
          {synthetic
            ? mode === "judge"
              ? "Fictional candidate · real GitHub evidence"
              : "All candidate information is synthetic"
            : mode.startsWith("public-")
              ? "Published with developer approval"
              : "Private · visible only to this browser session"}
        </span>
        {mode === "private" && (
          <>
            <Link href="/create">Edit profile ↗</Link>
            <Link href="/publish">Publish / manage link ↗</Link>
          </>
        )}
      </div>
      <section className="profile-intro">
        <div className="profile-person-row">
          <div className="avatar avatar-large">{initials}</div>
        </div>
        <h1>{candidate.name}</h1>
        <h2>{candidate.headline}</h2>
        <p className="location">
          {synthetic
            ? mode === "judge"
              ? "Fictional sample candidate · not a real application"
              : "Bengaluru, India · Fictional candidate"
            : "Reviewed profile · employment and authorship are not independently verified"}
        </p>
        {mode === "demo" && (
          <p>
            I build accessible interfaces and dependable APIs. I’m looking for
            an internship where I can turn complex problems into useful,
            well-crafted software.
          </p>
        )}
        <div className="preview-tags">
          {candidate.skills
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, i) => (
              <span key={i}>{s}</span>
            ))}
        </div>
        <p className="evidence-note">
          <ShieldCheck size={14} />
          {synthetic
            ? "Sample skills · not independently verified"
            : "Developer-provided skills · inspect supporting evidence below"}
        </p>
        <div className="profile-hero-aside">
          <span className="tiny-label">INTERACTIVE CAREER PROFILE</span>
          <span className="profile-voice-mark">
            <AudioLines size={30} />
          </span>
          <h3>
            Ask. Inspect.
            <br />
            Follow up.
          </h3>
          <p>A conversation about the work, with the sources in view.</p>
          <Button asChild size="sm">
            <Link href={`/interview?profile=${mode}`}>
              Start an interview <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
        <div className="profile-counts">
          {mode === "demo" && (
            <span className="availability">Open to internships</span>
          )}
          <span>
            <Layers3 size={15} />
            {candidate.projects.length}{" "}
            {candidate.projects.length === 1 ? "project" : "projects"}
          </span>
          <a href="#evidence">
            <FileText size={15} />
            {profile.sources.length} evidence{" "}
            {profile.sources.length === 1 ? "source" : "sources"}{" "}
            <ArrowUpRight size={13} />
          </a>
          <a className="profile-ask-link" href="#career-conversation">
            Ask the career twin <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
      <div className="profile-layout">
        <div className="profile-content">
          <section className="profile-section">
            <div className="section-title">
              <h2>Selected work</h2>
              <span>
                {candidate.projects.length}{" "}
                {candidate.projects.length === 1 ? "PROJECT" : "PROJECTS"}
              </span>
            </div>
            {candidate.projects.length === 0 && (
              <p className="muted">
                No reviewed project descriptions have been provided.
              </p>
            )}
            {candidate.projects.map((project, i) => (
              <article key={project.id} className="project-card">
                <div className={`project-art art-${i % 3}`}>
                  <span className="project-art-index">
                    PROJECT / {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="project-art-icon">
                    <Layers3 size={34} />
                  </span>
                  <span className="project-art-tech">
                    {project.stack[0] || "Project"}
                  </span>
                  <span className="art-code">
                    {synthetic ? "sample.project()" : "reviewed.project()"}
                  </span>
                </div>
                <div className="project-body">
                  <span className="step">
                    {synthetic
                      ? "SYNTHETIC PROJECT"
                      : "REVIEWED DEVELOPER CLAIM"}
                  </span>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <div className="preview-tags">
                    {project.stack.filter(Boolean).map((s, n) => (
                      <span key={n}>{s}</span>
                    ))}
                  </div>
                  <a className="project-evidence" href="#evidence">
                    <FileText size={13} /> Inspect {synthetic ? "sample " : ""}
                    evidence <ArrowUpRight size={13} />
                  </a>
                </div>
              </article>
            ))}
          </section>
          {profile.repositories.length > 0 && (
            <section className="profile-section">
              <div className="section-title">
                <h2>Repository observations</h2>
                <span>PINNED PUBLIC SOURCES</span>
              </div>
              <p className="muted small">
                These observations describe repository contents, not the
                candidate’s personal contributions.
              </p>
              {profile.repositories.map((repo) => (
                <details className="evidence-detail" key={repo.id}>
                  <summary>
                    {repo.name} · {repo.commit.slice(0, 8)}
                  </summary>
                  <div className="source-content">
                    {repo.analysis ? (
                      <>
                        {[
                          repo.analysis.purpose,
                          ...repo.analysis.technologies,
                          ...repo.analysis.features,
                          ...repo.analysis.architecture,
                        ].map((s, i) => (
                          <div key={i}>
                            <p>{s.text}</p>
                            <CitationLinks
                              citations={s.citations}
                              sources={profile.sources}
                            />
                          </div>
                        ))}
                        {repo.analysis.limitations.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                      </>
                    ) : (
                      <p>
                        Public evidence retrieved; AI summary unavailable.
                        Inspect source excerpts below.
                      </p>
                    )}
                    {repo.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          )}
          <section className="profile-section">
            <div className="section-title">
              <h2>Experience & education</h2>
              <span>{synthetic ? "SAMPLE RESUME" : "REVIEWED CLAIMS"}</span>
            </div>
            <div className="resume-block">
              <div className="timeline-row">
                <BriefcaseBusiness size={19} />
                <div>
                  <h3>Professional experience</h3>
                  <p>
                    {candidate.experience || "No work experience provided."}
                  </p>
                </div>
              </div>
              <div className="timeline-row">
                <GraduationCap size={19} />
                <div>
                  <h3>Education</h3>
                  <p>{candidate.education || "No education provided."}</p>
                </div>
              </div>
              <a className="citation" href="#evidence">
                Inspect source claims ↗
              </a>
            </div>
          </section>
          <section className="profile-section" id="evidence">
            <div className="section-title">
              <h2>The evidence library</h2>
              <span>{profile.sources.length} SOURCES</span>
            </div>
            <p className="muted">
              {synthetic
                ? mode === "judge"
                  ? "The sample resume is fictional. Repository excerpts were retrieved from the real Express project at the shown commit; they establish repository observations, never personal authorship."
                  : "Every excerpt below was authored for the fictional demonstration."
                : "Resume and developer claims are self-reported. Repository excerpts show observed code at a specific commit; they do not establish personal authorship."}
            </p>
            <SourceList sources={profile.sources} />
          </section>
        </div>
        <aside className="conversation-column">
          <ChatPanel profile={profile} mode={mode} />
          <div className="match-nudge">
            <AudioLines size={20} />
            <div>
              <h3>Start a deeper conversation.</h3>
              <p>
                Voice or text. Follow-up questions. A saved interview brief with
                evidence and PDF export.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/interview?profile=${mode}`}>
                  Open recruiter interview <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="match-nudge">
            <ShieldCheck size={19} />
            <div>
              <h3>Have a role in mind?</h3>
              <p>Compare requirements against this profile’s evidence.</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/match?profile=${mode}`}>
                  Compare a job description <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
