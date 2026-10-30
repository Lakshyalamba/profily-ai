"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container recovery-page">
      <div className="eyebrow">LET’S TRY THAT AGAIN</div>
      <h1>This page could not be loaded.</h1>
      <p className="page-description">
        Please retry. If the issue continues, return home and reopen your
        workspace. This screen does not expose server diagnostics.
      </p>
      <div className="actions">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
