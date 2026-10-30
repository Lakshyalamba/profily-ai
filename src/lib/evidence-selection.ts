import type { Workspace } from "@/types/intelligence";
/** Retain deliberate exclusions; select only newly imported source groups by default. */
export function reconcileEvidenceSelection(
  previous: Workspace | null,
  next: Workspace,
  selected: string[],
) {
  const available = new Set(next.pendingSources.map((s) => s.group));
  const old = new Set(previous?.pendingSources.map((s) => s.group) || []);
  return [
    ...new Set([
      ...selected.filter((group) => available.has(group)),
      ...[...available].filter((group) => !old.has(group)),
    ]),
  ];
}
export function savedEvidenceSelection(workspace: Workspace) {
  const available = new Set(workspace.pendingSources.map((s) => s.group));
  const saved = [
    ...new Set(
      workspace.saved?.sources
        .filter((s) => s.kind !== "developer")
        .map((s) => s.group) || [],
    ),
  ];
  return {
    selected: saved.filter((group) => available.has(group)),
    replaced: saved.filter((group) => !available.has(group)).length,
  };
}
