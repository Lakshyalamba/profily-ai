import { JobMatch } from "@/components/job-match";
import { demoSnapshot, judgeSnapshot } from "@/lib/server/profiles";
export const metadata = { title: "Evidence-backed job comparison" };
export default async function Match({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const requested = (await searchParams).profile;
  const selected =
    requested === "judge" ||
    requested === "private" ||
    /^public-[a-f0-9]{32}$/.test(requested || "")
      ? requested!
      : "demo";
  return (
    <div className="container inner-page">
      <div className="eyebrow">A MORE INFORMED NEXT STEP</div>
      <h1>A role. A profile. The evidence.</h1>
      <p className="page-description">
        Explore where a job’s requirements connect to a developer’s reviewed
        experience—and where questions remain.
      </p>
      <JobMatch
        demo={demoSnapshot()}
        judge={judgeSnapshot()}
        initialMode={selected}
      />
    </div>
  );
}
