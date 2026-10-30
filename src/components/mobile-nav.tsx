"use client";
import Link from "next/link";
import { useRef } from "react";

export function MobileNav() {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="mobile-nav"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>Menu</summary>
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a") && menu.current)
            menu.current.open = false;
        }}
      >
        <Link href="/profile/judge">Judge demo</Link>
        <Link href="/match">Job match</Link>
        <Link href="/analytics">Recruiter workspace</Link>
        <Link href="/publish">Manage public link</Link>
      </div>
    </details>
  );
}
