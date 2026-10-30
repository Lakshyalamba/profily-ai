"use client";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  FileUp,
  UserRound,
  Link2,
  ChartNoAxesCombined,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

const workspaceLinks = [
  { href: "/create", label: "Build your profile", icon: FileUp },
  { href: "/profile/private", label: "Your career twin", icon: UserRound },
  { href: "/publish", label: "Public sharing", icon: Link2 },
  {
    href: "/analytics",
    label: "Recruiter workspace",
    icon: ChartNoAxesCombined,
  },
];
export function ExperienceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const workspace = workspaceLinks.some((item) => item.href === path);
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className={workspace ? "workspace-frame" : "public-frame"}>
        {workspace && (
          <aside className="workspace-sidebar">
            <div className="sidebar-label">YOUR WORKSPACE</div>
            <nav aria-label="Workspace navigation">
              {workspaceLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  href={href}
                  key={href}
                  aria-current={path === href ? "page" : undefined}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-principle">
              <ShieldCheck size={22} />
              <strong>Private by default.</strong>
              <p>Your story becomes public only when you approve it.</p>
              <Link href="/profile/judge">
                Explore the example <ArrowUpRight size={13} />
              </Link>
            </div>
          </aside>
        )}
        <div
          id="page-content"
          tabIndex={-1}
          className="route-surface"
          key={path}
        >
          {children}
        </div>
      </div>
    </MotionConfig>
  );
}
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`reveal ${className}`}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
