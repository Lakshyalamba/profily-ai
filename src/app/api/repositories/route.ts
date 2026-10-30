import { z } from "zod";
import {
  failure,
  json,
  readJson,
  sameOrigin,
  aiRateLimit,
  AppError,
} from "@/lib/server/http";
import {
  requireSession,
  updateWorkspace,
  loadWorkspace,
} from "@/lib/server/store";
import {
  collectRepository,
  analyzeRepository,
  parseRepositoryUrl,
} from "@/lib/server/github";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const id = requireSession(request);
    await aiRateLimit(id);
    const input = z
      .object({ url: z.string().max(300), consent: z.literal(true) })
      .parse(await readJson(request, 2000));
    const canonical = parseRepositoryUrl(input.url).url;
    const current = await loadWorkspace(id);
    if (
      current.repositories.length >= 4 &&
      !current.repositories.some(
        (r) => r.url.toLowerCase() === canonical.toLowerCase(),
      )
    )
      throw new AppError(
        400,
        "REPOSITORY_LIMIT",
        "At most four repositories can be included. Remove a repository from the draft before importing another.",
      );
    let repository = await collectRepository(input.url);
    try {
      repository = await analyzeRepository(repository);
    } catch (e) {
      if (e instanceof AppError) repository.warnings.push(e.message);
      else throw e;
    }
    const workspace = await updateWorkspace(id, (data) => {
      if (data.revision !== current.revision)
        throw new AppError(
          409,
          "DRAFT_CHANGED",
          "Your draft changed while the repository was being analyzed. Reload and retry the import.",
        );
      const rest = data.repositories.filter((r) => r.id !== repository.id);
      if (rest.length >= 4)
        throw new AppError(
          400,
          "REPOSITORY_LIMIT",
          "At most four repositories can be included.",
        );
      return {
        ...data,
        repositories: [...rest, repository],
        pendingSources: [
          ...data.pendingSources.filter((s) => s.group !== repository.id),
          ...repository.sources,
        ],
      };
    });
    return json(workspace);
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const owner = requireSession(request);
    const input = z
      .object({
        id: z.string().regex(/^repo-[a-f0-9]{16}$/),
        revision: z.string().max(100),
      })
      .parse(await readJson(request, 2000));
    const workspace = await updateWorkspace(owner, (current) => {
      if (current.revision !== input.revision)
        throw new AppError(
          409,
          "DRAFT_CHANGED",
          "Your draft changed. Reload before removing a repository.",
        );
      return {
        ...current,
        repositories: current.repositories.filter(
          (repo) => repo.id !== input.id,
        ),
        pendingSources: current.pendingSources.filter(
          (source) => source.group !== input.id,
        ),
      };
    });
    return json(workspace);
  } catch (error) {
    return failure(error);
  }
}
