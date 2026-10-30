import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="container recovery-page">
      <div className="eyebrow">LINK UNAVAILABLE</div>
      <h1>This page is no longer available.</h1>
      <p className="page-description">
        A published profile may have expired or been unpublished. Check the
        address or explore the clearly labeled fictional example.
      </p>
      <div className="actions">
        <Button asChild>
          <Link href="/profile/demo">Explore example profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  );
}
