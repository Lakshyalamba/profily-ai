import { demoSnapshot, judgeSnapshot } from "@/lib/server/profiles";
import { InterviewStart } from "@/components/interview-start";
export const metadata = { title: "Start a recruiter interview" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const requested = (await searchParams).profile;
  const mode =
    requested === "judge" ||
    requested === "private" ||
    /^public-[a-f0-9]{32}$/.test(requested || "")
      ? requested!
      : "demo";
  return (
    <InterviewStart
      key={mode}
      demo={mode === "judge" ? judgeSnapshot() : demoSnapshot()}
      mode={mode}
    />
  );
}
