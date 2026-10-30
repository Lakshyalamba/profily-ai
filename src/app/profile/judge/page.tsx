import Link from "next/link";
import { ProfileView } from "@/components/profile-view";
import { judgeSnapshot } from "@/lib/server/profiles";
export const metadata = {
  title: "Judge demo · Fictional candidate, real repository evidence",
};
export default function JudgeProfile() {
  return (
    <>
      <section className="container judge-intro">
        <div className="eyebrow">PUBLIC HACKATHON WALKTHROUGH · NO SIGN-IN</div>
        <h1>Meet the work. Inspect the evidence.</h1>
        <p>
          Jordan and the sample resume are fictional. The Express repository
          evidence was retrieved from GitHub at the pinned commit. It does not
          establish Jordan’s authorship or contribution.
        </p>
        <div className="actions">
          <a
            className="citation"
            href="/samples/fictional-judge-resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download fictional sample resume ↗
          </a>
          <Link className="citation" href="/create">
            Try the import and review workflow ↗
          </Link>
          <Link className="citation" href="/profile/demo">
            Original synthetic example ↗
          </Link>
        </div>
        <p className="muted small">
          Try: “What supports PostgreSQL experience?” · “Did this developer
          author Express?” · “Is Kubernetes experience established?” Voice uses
          your browser’s speech services; text always remains available.
        </p>
      </section>
      <ProfileView profile={judgeSnapshot()} mode="judge" />
    </>
  );
}
