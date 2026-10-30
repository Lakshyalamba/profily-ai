// Generates only explicitly fictional candidate data and public, pinned GitHub evidence.
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { parseResume } from "../src/lib/server/resume";
import { collectRepository, analyzeRepository } from "../src/lib/server/github";
import { candidateSchema, snapshotSchema } from "../src/types/intelligence";
async function main() {
  const resume = await parseResume(
    new Uint8Array(await readFile("tests/fixtures/sample-resume.pdf")),
    "fictional-judge-resume.pdf",
  );
  const repository = await analyzeRepository(
    await collectRepository("https://github.com/expressjs/express"),
  );
  const candidate = candidateSchema.parse({
    ...resume.candidate,
    name: "Jordan Ellis · Fictional demo",
    headline: "Fictional full-stack developer · evidence walkthrough",
  });
  const snapshot = snapshotSchema.parse({
    candidate,
    sources: [
      ...resume.sources.map((source) => ({
        ...source,
        kind: "sample-resume",
        title: "Fictional sample resume · page " + source.page,
      })),
      ...repository.sources,
    ],
    repositories: [repository],
    revision: "judge-demo-" + repository.commit.slice(0, 12),
    savedAt: new Date().toISOString(),
  });
  await mkdir("src/data", { recursive: true });
  await writeFile(
    "src/data/judge-profile.json",
    JSON.stringify(snapshot, null, 2),
  );
  await mkdir("public/samples", { recursive: true });
  await copyFile(
    "tests/fixtures/sample-resume.pdf",
    "public/samples/fictional-judge-resume.pdf",
  );
  console.log(
    JSON.stringify({
      fictionalCandidate: true,
      repository: repository.url,
      commit: repository.commit,
      sources: snapshot.sources.length,
      realRepositoryAnalysis: !!repository.analysis,
    }),
  );
}
void main().catch((error) => {
  console.error(
    "Judge profile preparation failed:",
    error instanceof Error ? error.message : "Unexpected error",
  );
  process.exitCode = 1;
});
