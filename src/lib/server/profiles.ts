import judgeProfile from "@/data/judge-profile.json";
import { snapshotSchema } from "@/types/intelligence";
import "server-only";
import { loadPublicProfile } from "./public-store";
import { candidate, projects, evidence } from "@/data/demo";
import type {
  Snapshot,
  Workspace,
  Candidate,
  Source,
} from "@/types/intelligence";
import { loadWorkspace, requireSession } from "./store";
import { AppError } from "./http";
export function demoSnapshot(): Snapshot {
  return {
    candidate: {
      name: candidate.name,
      headline: candidate.headline,
      skills: candidate.skills.join(", "),
      experience: candidate.experience,
      education: candidate.education,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        stack: p.stack,
      })),
    },
    sources: evidence.map((e) => ({ ...e, group: "demo" })),
    repositories: [],
    revision: "synthetic-demo-v1",
    savedAt: "2026-10-30T00:00:00.000Z",
  };
}
export function judgeSnapshot(): Snapshot {
  return snapshotSchema.parse(judgeProfile);
}
export async function profileFor(
  request: Request,
  mode: string,
  revision?: string,
) {
  if (mode === "demo" || mode === "judge") {
    const snapshot = mode === "judge" ? judgeSnapshot() : demoSnapshot();
    if (revision && snapshot.revision !== revision)
      throw new AppError(
        409,
        "PROFILE_CHANGED",
        "This example was updated. Reload before continuing.",
      );
    return snapshot;
  }
  if (mode.startsWith("public-")) {
    const published = await loadPublicProfile(mode.slice(7));
    if (revision && published.snapshot.revision !== revision)
      throw new AppError(
        409,
        "PROFILE_CHANGED",
        "This public profile changed. Reload before continuing.",
      );
    return published.snapshot;
  }
  const saved = (await loadWorkspace(requireSession(request))).saved;
  if (!saved)
    throw new AppError(
      409,
      "NO_PROFILE",
      "Save a reviewed private profile before starting a conversation or job analysis.",
    );
  if (revision && saved.revision !== revision)
    throw new AppError(
      409,
      "PROFILE_CHANGED",
      "Your saved profile changed. Reload to start a new conversation using the latest evidence.",
    );
  return saved;
}
export function buildSnapshot(
  workspace: Workspace,
  candidate: Candidate,
  groups: string[],
  revision: string,
): Snapshot {
  const available = new Set(workspace.pendingSources.map((s) => s.group));
  if (groups.some((g) => !available.has(g)))
    throw new AppError(
      409,
      "SOURCES_CHANGED",
      "The evidence selection changed. Reload and review again.",
    );
  const sources: Source[] = workspace.pendingSources.filter((s) =>
    groups.includes(s.group),
  );
  for (const [field, value] of Object.entries(candidate)) {
    if (field === "projects") continue;
    const text = String(value);
    if (!text || text === "[]") continue;
    sources.push({
      id: "reviewed-" + field,
      group: "reviewed",
      kind: "developer",
      title: "Reviewed developer claim · " + field,
      excerpt: `${field}: ${text}`.slice(0, 16000),
    });
  }
  candidate.projects.forEach((project, i) =>
    sources.push({
      id: `reviewed-project-${i + 1}`,
      group: "reviewed",
      kind: "developer",
      title: "Reviewed project claim · " + project.name,
      excerpt: JSON.stringify(project),
    }),
  );
  return {
    candidate,
    sources,
    repositories: workspace.repositories.filter((r) => groups.includes(r.id)),
    revision,
    savedAt: new Date().toISOString(),
  };
}
