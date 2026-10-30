"use client";
import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  ArrowUpRight,
  UserRound,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Link2,
} from "lucide-react";
export function MobileNav() {
  const menu = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
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
      <summary>
        <Menu size={17} />
        <span>Menu</span>
      </summary>
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a") && menu.current)
            menu.current.open = false;
        }}
      >
        <span className="sidebar-label">DISCOVER PROFILY</span>
        {[
          {
            href: "/profile/judge",
            label: "Explore a career twin",
            detail: "A fictional profile. Real repository evidence.",
            icon: UserRound,
          },
          {
            href: "/match",
            label: "Job matching",
            detail: "Compare requirements with evidence.",
            icon: BriefcaseBusiness,
          },
          {
            href: "/analytics",
            label: "Recruiter workspace",
            detail: "Your recorded conversations and reports.",
            icon: ChartNoAxesCombined,
          },
          {
            href: "/profile/private",
            label: "Your career twin",
            detail: "Open your reviewed private profile.",
            icon: UserRound,
          },
          {
            href: "/publish",
            label: "Manage public link",
            detail: "Review, publish or revoke your snapshot.",
            icon: Link2,
          },
        ].map(({ href, label, detail, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={19} />
            <span>
              {label}
              <small>{detail}</small>
            </span>
            <ArrowUpRight size={15} />
          </Link>
        ))}
      </div>
    </details>
  );
}
