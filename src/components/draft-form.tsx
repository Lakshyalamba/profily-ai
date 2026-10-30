"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LockKeyhole,
  Check,
  ArrowRight,
  Trash2,
  Loader2,
  FileUp,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import {
  candidateSchema,
  workspaceSchema,
  type Candidate,
  type Workspace,
} from "@/types/intelligence";
import {
  reconcileEvidenceSelection,
  savedEvidenceSelection,
} from "@/lib/evidence-selection";
import { draftSchema } from "@/types/profile";
import { api, errorMessage } from "@/lib/client-api";
import { ConfirmAction } from "./confirm-action";
import { Button } from "./ui/button";
import { SourceList, CitationLinks } from "./source-list";
const empty: Candidate = {
  name: "",
  headline: "",
  skills: "",
  education: "",
  experience: "",
  projects: [],
};
export function DraftForm() {
  const [draft, setDraft] = useState<Candidate>(empty),
    [workspace, setWorkspace] = useState<Workspace | null>(null),
    [review, setReview] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [consent, setConsent] = useState(false),
    [url, setUrl] = useState(""),
    [groups, setGroups] = useState<string[]>([]),
    [ready, setReady] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    api<unknown>("/api/profile")
      .then((value) => {
        if (active) {
          const loaded = workspaceSchema.parse(value);
          setWorkspace(loaded);
          if (loaded.saved) {
            setDraft(loaded.saved.candidate);
            setGroups(savedEvidenceSelection(loaded).selected);
            setNotice(
              "Your saved details are loaded. Review evidence selections before saving changes.",
            );
          }
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  function accept(value: Workspace) {
    setWorkspace(value);
    setGroups((current) =>
      reconcileEvidenceSelection(workspace, value, current),
    );
  }
  async function run(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  async function parse() {
    await run("Reading resume", async () => {
      const selected = file.current?.files?.[0];
      if (!selected) throw new Error("Select a PDF resume first.");
      if (!consent)
        throw new Error("Confirm AI processing below before importing.");
      if (selected.size > 4 * 1024 * 1024)
        throw new Error("Use a PDF no larger than 4 MB.");
      const form = new FormData();
      form.set("resume", selected);
      form.set("consent", "true");
      const result = workspaceSchema.parse(
        await api("/api/resume", { method: "POST", body: form }, 290000),
      );
      accept(result);
      if (result.pendingCandidate) {
        const { name, headline, education, skills, experience, projects } =
          result.pendingCandidate;
        setDraft({ name, headline, education, skills, experience, projects });
      }
      setReview(false);
      setNotice(
        "Resume extracted. Review and correct every field before saving. Existing form fields were replaced; repository evidence was retained.",
      );
    });
  }
  async function repository() {
    await run("Inspecting repository", async () => {
      if (!consent)
        throw new Error("Confirm AI processing below before importing.");
      const result = workspaceSchema.parse(
        await api(
          "/api/repositories",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, consent: true }),
          },
          290000,
        ),
      );
      accept(result);
      setNotice(
        "Repository evidence retrieved. Inspect the analysis and source coverage below, then review before saving.",
      );
    });
  }
  async function load() {
    await run("Loading profile", async () => {
      const value = workspaceSchema.parse(await api("/api/profile"));
      accept(value);
      if (value.saved) {
        setDraft(value.saved.candidate);
        const selection = savedEvidenceSelection(value);
        setGroups(selection.selected);
        setNotice(
          selection.replaced
            ? "Saved details loaded. Some original evidence was replaced by a newer import and is not selected. Inspect the current sources before saving."
            : "Reviewed private profile loaded.",
        );
      } else if (value.pendingCandidate) {
        const c = value.pendingCandidate;
        setDraft({
          name: c.name,
          headline: c.headline,
          skills: c.skills,
          education: c.education,
          experience: c.experience,
          projects: c.projects,
        });
        setNotice("Pending resume extraction loaded for review.");
      } else {
        const raw = localStorage.getItem("profily-draft-v1");
        if (raw) {
          const old = draftSchema.parse(JSON.parse(raw));
          setDraft({
            ...empty,
            name: old.name,
            headline: old.headline,
            skills: old.skills,
            education: old.education,
            experience: old.experience,
          });
          setUrl(old.repositories.split(/\s+/)[0] ?? "");
          setNotice(
            "Phase one browser draft loaded. Import repositories explicitly and review before saving to the private server.",
          );
        } else
          setNotice(
            "No saved profile yet. Add a resume or enter details manually.",
          );
      }
      setReview(false);
    });
  }
  async function save() {
    await run("Saving reviewed profile", async () => {
      const candidate = candidateSchema.parse(draft);
      const value = workspaceSchema.parse(
        await api("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate,
            sourceGroups: groups,
            reviewed: true,
            revision: workspace?.revision,
          }),
        }),
      );
      setWorkspace(value);
      setNotice(
        "Reviewed profile saved privately on this server. You can now open your career twin.",
      );
    });
  }
  return (
    <div className="draft-layout">
      <section className="form-card">
        <div className="form-top">
          <span className="step">
            {review ? "02 / REVIEW" : "01 / YOUR DETAILS"}
          </span>
          <Button
            disabled={!!busy || !ready}
            variant="ghost"
            size="sm"
            onClick={load}
          >
            Load saved profile
          </Button>
        </div>
        <ol
          className="creation-progress"
          aria-label="Profile creation progress"
        >
          <li
            aria-current={!review ? "step" : undefined}
            className={!review ? "current" : "complete"}
          >
            <span>{review ? <Check size={13} /> : "01"}</span>
            <div>
              Bring your evidence<small>Import & edit</small>
            </div>
          </li>
          <li
            aria-current={review ? "step" : undefined}
            className={review ? "current" : ""}
          >
            <span>02</span>
            <div>
              Review your story<small>Check the sources</small>
            </div>
          </li>
          <li className={workspace?.saved ? "complete" : ""}>
            <span>{workspace?.saved ? <Check size={13} /> : "03"}</span>
            <div>
              Private profile
              <small>
                {workspace?.saved
                  ? "Saved version available"
                  : "Save when ready"}
              </small>
            </div>
          </li>
        </ol>
        {!review ? (
          <>
            <div className="ingestion-panel">
              <h2>Bring your evidence</h2>
              <p className="muted small">
                PDFs: text-based, up to 4 MB and 10 pages. Repository inspection
                reads bounded public files at a pinned commit.
              </p>
              <label className="consent-row">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={!!busy}
                />{" "}
                I authorize sending extracted resume text and selected public
                repository files to Gemini for processing. Pending extracts are
                stored privately on this server.
              </label>
              <div className="field upload-well">
                <span className="upload-symbol">
                  <FileUp size={25} />
                </span>
                <strong>A little context goes a long way.</strong>
                <p>
                  Choose your text-based résumé. Review everything before it
                  becomes your profile.
                </p>
                <label htmlFor="resume">Resume PDF</label>
                <input
                  id="resume"
                  ref={file}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={!!busy}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={parse}
                disabled={!!busy || !ready || !consent}
              >
                <FileUp size={15} /> Extract resume
              </Button>
              <div className="field repository-input">
                <label htmlFor="repository-url">Public GitHub repository</label>
                <input
                  type="url"
                  id="repository-url"
                  placeholder="https://github.com/owner/repository"
                  value={url}
                  maxLength={300}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={!!busy}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={repository}
                disabled={!!busy || !ready || !url || !consent}
              >
                <GitBranch size={15} /> Analyze repository
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const result = candidateSchema.safeParse(draft);
                if (result.success) {
                  setReview(true);
                  setError("");
                } else
                  setError(
                    "Add your name and check field lengths before continuing.",
                  );
              }}
            >
              {Object.entries({
                name: "Full name",
                headline: "Professional headline",
                skills: "Technical skills",
                education: "Education",
                experience: "Work experience",
              }).map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>
                    {label}
                    {key === "name" ? " *" : ""}
                  </label>
                  {["education", "experience"].includes(key) ? (
                    <textarea
                      id={key}
                      rows={3}
                      maxLength={key === "experience" ? 6000 : 4000}
                      value={draft[key as "education" | "experience"]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                      disabled={!!busy}
                    />
                  ) : (
                    <input
                      id={key}
                      required={key === "name"}
                      maxLength={
                        key === "name" ? 100 : key === "headline" ? 160 : 2000
                      }
                      value={draft[key as "name" | "headline" | "skills"]}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                      disabled={!!busy}
                    />
                  )}
                </div>
              ))}
              <div className="section-title">
                <h2>Projects & your contribution</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!!busy || draft.projects.length >= 12}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      projects: [
                        ...draft.projects,
                        {
                          id: crypto.randomUUID(),
                          name: "",
                          description: "",
                          stack: [],
                        },
                      ],
                    })
                  }
                >
                  Add project
                </Button>
              </div>
              <p className="muted small">
                Describe what you personally built. Repository analysis alone
                does not establish your contribution.
              </p>
              {draft.projects.map((p, i) => (
                <div className="project-editor" key={p.id}>
                  <div className="field">
                    <label htmlFor={`project-name-${i}`}>Project name</label>
                    <input
                      id={`project-name-${i}`}
                      value={p.name}
                      maxLength={120}
                      required
                      disabled={!!busy}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          projects: draft.projects.map((item, n) =>
                            n === i ? { ...item, name: e.target.value } : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`project-description-${i}`}>
                      Description and personal contribution (developer claim)
                    </label>
                    <textarea
                      id={`project-description-${i}`}
                      value={p.description}
                      maxLength={1800}
                      disabled={!!busy}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          projects: draft.projects.map((item, n) =>
                            n === i
                              ? { ...item, description: e.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`project-stack-${i}`}>
                      Technologies (comma-separated)
                    </label>
                    <input
                      id={`project-stack-${i}`}
                      value={p.stack.join(", ")}
                      maxLength={1000}
                      disabled={!!busy}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          projects: draft.projects.map((item, n) =>
                            n === i
                              ? {
                                  ...item,
                                  stack: e.target.value
                                    .split(",")
                                    .map((s) => s.trim()),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="delete-draft"
                    disabled={!!busy}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        projects: draft.projects.filter((_, n) => n !== i),
                      })
                    }
                  >
                    Remove project
                  </button>
                </div>
              ))}
              <Button type="submit" disabled={!!busy || !ready}>
                Review information <ArrowRight size={16} />
              </Button>
            </form>
          </>
        ) : (
          <div className="draft-review">
            <div className="review-banner">
              <ShieldCheck size={24} />
              <div>
                <h2>One last look. Entirely your story.</h2>
                <p>
                  Check the details and sources below. Saving keeps this profile
                  private.
                </p>
              </div>
            </div>
            <h2>{draft.name}</h2>
            <p>{draft.headline || "No headline added"}</p>
            {["skills", "education", "experience"].map((key) => (
              <div key={key}>
                <h3>{key}</h3>
                <p>
                  {draft[key as "skills" | "education" | "experience"] ||
                    "Not provided"}
                </p>
              </div>
            ))}
            {draft.projects.map((p) => (
              <div key={p.id}>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <p>{p.stack.join(", ")}</p>
              </div>
            ))}
            <div>
              <h3>Evidence to include</h3>
              <p className="muted small">
                Original resume text may include contact details and earlier
                claims. Inspect it below; deselect it to exclude it from the
                career twin and job matching. You can correct extracted fields
                above.
              </p>
              {[
                ...new Set(workspace?.pendingSources.map((s) => s.group) ?? []),
              ].map((group) => (
                <label className="consent-row" key={group}>
                  <input
                    type="checkbox"
                    checked={groups.includes(group)}
                    onChange={(e) =>
                      setGroups(
                        e.target.checked
                          ? [...groups, group]
                          : groups.filter((g) => g !== group),
                      )
                    }
                  />
                  {
                    workspace?.pendingSources
                      .find((s) => s.group === group)
                      ?.title.split(" · ")[0]
                  }
                </label>
              ))}
            </div>
            <div className="actions">
              <Button disabled={!!busy} onClick={save}>
                <Check size={16} /> Save reviewed private profile
              </Button>
              <Button
                disabled={!!busy}
                variant="outline"
                onClick={() => setReview(false)}
              >
                Edit details
              </Button>
            </div>
          </div>
        )}
        {busy && (
          <p className="loading" role="status">
            <Loader2 className="spin" size={16} />
            {busy}…
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {workspace?.saved && (
          <div className="actions">
            <Button asChild variant="outline">
              <Link href="/profile/private">
                Open private career twin <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/publish">Review & publish a public link</Link>
            </Button>
          </div>
        )}
        {workspace?.pendingCandidate && (
          <details className="evidence-detail">
            <summary>Resume extraction references & warnings</summary>
            <div className="source-content">
              {workspace.pendingCandidate.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              {workspace.pendingCandidate.references.map((r, i) => (
                <div key={i}>
                  <h3>{r.field}</h3>
                  <CitationLinks
                    citations={r.citations}
                    sources={workspace.pendingSources}
                  />
                </div>
              ))}
            </div>
          </details>
        )}
        {workspace?.repositories.map((repo) => (
          <details className="evidence-detail" key={repo.id}>
            <summary>
              {repo.name} ·{" "}
              {repo.analysis
                ? "AI analysis with evidence"
                : "Evidence retrieved; AI analysis unavailable"}
            </summary>
            <div className="source-content">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() =>
                  run("Removing repository", async () => {
                    const value = workspaceSchema.parse(
                      await api("/api/repositories", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: repo.id,
                          revision: workspace?.revision,
                        }),
                      }),
                    );
                    accept(value);
                    setReview(false);
                    setNotice(
                      "Repository removed from the draft. Review and save to update the private profile; published snapshots are unchanged.",
                    );
                  })
                }
              >
                Remove from draft
              </Button>
              <p>
                Commit {repo.commit} · Retrieved{" "}
                {new Date(repo.fetchedAt).toLocaleString()}
              </p>
              {repo.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
              {repo.analysis &&
                [
                  repo.analysis.purpose,
                  ...repo.analysis.technologies,
                  ...repo.analysis.features,
                  ...repo.analysis.architecture,
                ].map((s, i) => (
                  <div key={i}>
                    <p>{s.text}</p>
                    <CitationLinks
                      citations={s.citations}
                      sources={repo.sources}
                    />
                  </div>
                ))}
              {repo.analysis?.limitations.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          </details>
        ))}
        {!!workspace?.pendingSources.length && (
          <details className="evidence-detail">
            <summary>Inspect original evidence before saving</summary>
            <div className="source-content">
              <SourceList sources={workspace.pendingSources} />
            </div>
          </details>
        )}
        <ConfirmAction
          title="Delete your workspace?"
          description="Your private profile, recorded activity, public link and local draft will be removed. This cannot be undone. Download any reports you want to keep first."
          variant="ghost"
          disabled={!!busy || !ready}
          className="delete-draft"
          onConfirm={() =>
            run("Deleting workspace", async () => {
              await api("/api/profile", { method: "DELETE" });
              localStorage.removeItem("profily-draft-v1");
              setDraft(empty);
              setReview(false);
              setGroups([]);
              setWorkspace(workspaceSchema.parse(await api("/api/profile")));
              setNotice(
                "Private workspace, recruiter activity, published link and local draft deleted.",
              );
            })
          }
        >
          <Trash2 size={13} /> Delete workspace, activity & public link
        </ConfirmAction>
      </section>
      <aside className="draft-sidebar">
        <LockKeyhole size={26} />
        <h2>Your story stays yours.</h2>
        <p>
          Imports are processed on this server and by Gemini after you authorize
          them. Imports are never automatically published. Raw PDF files are
          discarded after text extraction.
        </p>
        <p>
          Review extracted details, repository coverage, and source text before
          saving. Editing a field creates a reviewed developer claim; it does
          not rewrite the original evidence.
        </p>
        <div className="sidebar-divider" />
        <h3>Private until you approve sharing.</h3>
        <p>
          Profiles expire seven days after the last import or save. Access is
          tied to this browser’s session cookie. There is no account recovery;
          keep the cookie to manage your workspace and public link.
        </p>
        <span className="demo-badge">PRIVATE UNTIL YOU CHOOSE TO PUBLISH</span>
      </aside>
    </div>
  );
}
