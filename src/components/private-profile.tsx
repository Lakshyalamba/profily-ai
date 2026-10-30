"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserRound } from "lucide-react";
import { workspaceSchema, type Snapshot } from "@/types/intelligence";
import { api, errorMessage } from "@/lib/client-api";
import { ProfileView } from "./profile-view";
export function PrivateProfile() {
  const [profile, setProfile] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/api/profile")
      .then((raw) => {
        const value = workspaceSchema.parse(raw);
        if (active) setProfile(value.saved);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  if (loading)
    return (
      <div className="container inner-page">
        <p className="loading">
          <Loader2 size={18} className="spin" />
          Loading your private profile…
        </p>
      </div>
    );
  if (!profile)
    return (
      <div className="container inner-page">
        <div className="eyebrow">YOUR CAREER TWIN</div>
        <div className="empty-state private-empty">
          <UserRound size={30} />
          <h1>
            {error ? "Couldn’t load your profile." : "Your story starts here."}
          </h1>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <p className="page-description">
            Create, review, and save a private profile to start evidence-backed
            conversations.
          </p>
          <Link className="button button-primary" href="/create">
            Create or load profile
          </Link>
        </div>
      </div>
    );
  return <ProfileView profile={profile} mode="private" />;
}
