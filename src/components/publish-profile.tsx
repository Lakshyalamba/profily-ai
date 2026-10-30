"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { workspaceSchema, type Snapshot } from "@/types/intelligence";
import { api, errorMessage } from "@/lib/client-api";
import { ConfirmAction } from "./confirm-action";
import { Button } from "./ui/button";
import { SourceList } from "./source-list";
type Publication = {
  path: string;
  expiresAt: number;
  revision: string;
  sourceRevision?: string;
  sourceIds: string[];
} | null;
export function PublishProfile() {
  const [profile, setProfile] = useState<Snapshot | null>(null),
    [publication, setPublication] = useState<Publication>(null),
    [selected, setSelected] = useState<string[]>([]),
    [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const workspace = workspaceSchema.parse(await api("/api/profile"));
        const existing = (await api("/api/publish")) as Publication;
        if (active) {
          setProfile(workspace.saved);
          setPublication(existing);
          setSelected(
            (existing?.sourceIds || []).filter((id) =>
              workspace.saved?.sources.some(
                (source) => source.id === id && source.kind === "repository",
              ),
            ),
          );
        }
      } catch (e) {
        if (active) setError(errorMessage(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function update(remove = false) {
    if ((!profile && !remove) || busy) return;
    setBusy(true);
    setCopied(false);
    setError("");
    try {
      const result = await api("/api/publish", {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(remove
          ? {}
          : {
              body: JSON.stringify({
                consent,
                revision: profile?.revision,
                sourceIds: selected,
              }),
            }),
      });
      setPublication(remove ? null : (result as Publication));
      setConsent(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container inner-page">
      <div className="eyebrow">SHARE WITH INTENTION</div>
      <h1>Your profile. Your public link.</h1>
      <p className="page-description">
        Publish a separate snapshot of approved details and selected repository
        evidence. Raw resume pages stay private. Anyone with the link can read
        and ask questions; it is not access controlled.
      </p>
      {loading ? (
        <p role="status">Loading saved profile…</p>
      ) : profile ? (
        <section className="form-card">
          <h2>Review everything you will publish</h2>
          {publication && (
            <p className="notice">
              {!publication.sourceRevision
                ? "This publication predates version tracking. Review before replacing it."
                : publication.sourceRevision === profile.revision
                  ? "Your published details match this saved version."
                  : "Your saved details differ from the published version. Review below before replacing it."}{" "}
              Previously published repository selections are restored where the
              source is still available.
            </p>
          )}
          <h3>{profile.candidate.name}</h3>
          <p>{profile.candidate.headline}</p>
          <p>{profile.candidate.education}</p>
          <p>{profile.candidate.skills}</p>
          <p>{profile.candidate.experience}</p>
          {profile.candidate.projects.map((project) => (
            <article key={project.id}>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <p>{project.stack.join(", ")}</p>
            </article>
          ))}
          <p className="notice">
            All details above and their developer-claim evidence will be public.
            Remove personal contact details in the editor before publishing.
            Repository excerpts below are optional; inspect each before
            selecting it.
          </p>
          {profile.sources
            .filter((s) => s.kind === "repository")
            .map((source) => (
              <div key={source.id}>
                <label className="consent-row">
                  <input
                    type="checkbox"
                    checked={selected.includes(source.id)}
                    disabled={busy}
                    onChange={(e) =>
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, source.id]
                          : current.filter((id) => id !== source.id),
                      )
                    }
                  />
                  Publish {source.title}
                </label>
                <SourceList sources={[source]} />
              </div>
            ))}
          <label className="consent-row">
            <input
              type="checkbox"
              checked={consent}
              disabled={busy}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I reviewed these details and selected excerpts and approve making
            them publicly accessible. I authorize sending this public evidence
            to Gemini when visitors ask questions.
          </label>
          <Button disabled={!consent || busy} onClick={() => update()}>
            {busy
              ? "Updating…"
              : publication
                ? "Replace published snapshot"
                : "Create public link"}
          </Button>{" "}
          <Link href="/create">Edit private profile ↗</Link>
          <p className="muted small">
            Management belongs to this browser cookie. Without account recovery,
            clearing the cookie loses management access. Links expire after
            seven days; publishing again renews them. Keep this browser until
            you unpublish.
          </p>
        </section>
      ) : (
        <p className="notice">
          Save a reviewed profile first.{" "}
          <Link href="/create">Open editor ↗</Link>
        </p>
      )}
      {publication && (
        <section className="form-card publication-actions">
          <h2>Your published snapshot</h2>
          {!profile && (
            <p className="notice">
              Your private profile is no longer available, but this published
              snapshot can still be revoked.
            </p>
          )}
          <p className="publish-link">
            <a href={publication.path}>
              {typeof window !== "undefined" ? window.location.origin : ""}
              {publication.path}
            </a>
          </p>
          <p>
            Expires {new Date(publication.expiresAt).toLocaleString()}. Private
            edits do not change this snapshot. Unpublishing does not recall
            saved transcripts or PDFs.
          </p>
          <div className="actions">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    window.location.origin + publication.path,
                  );
                  setCopied(true);
                  setError("");
                } catch {
                  setError(
                    "Clipboard access is unavailable. Select and copy the visible link instead.",
                  );
                }
              }}
            >
              {copied ? "Link copied" : "Copy public link"}
            </Button>
            <ConfirmAction
              title="Unpublish this profile?"
              description="The public link will stop working. Saved recruiter snapshots and downloaded reports will remain with their owners."
              confirmLabel="Unpublish link"
              variant="outline"
              disabled={busy}
              onConfirm={() => update(true)}
            >
              Unpublish link
            </ConfirmAction>
          </div>
          {copied && (
            <p role="status" className="muted small">
              Public profile link copied.
            </p>
          )}
        </section>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
