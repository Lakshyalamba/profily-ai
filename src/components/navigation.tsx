"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function TopNavigation() {
  const path = usePathname();
  return (
    <nav aria-label="Main navigation">
      {[
        ["/profile/judge", "Explore a career twin"],
        ["/match", "Job matching"],
        ["/analytics", "Workspace"],
      ].map(([href, label]) => (
        <Link
          href={href}
          key={href}
          aria-current={path === href ? "page" : undefined}
        >
          {label}
          <span className="nav-indicator" />
        </Link>
      ))}
    </nav>
  );
}
