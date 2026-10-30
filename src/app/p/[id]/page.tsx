import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile-view";
import { loadPublicProfile } from "@/lib/server/public-store";
import { AppError } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Published career twin",
  robots: { index: false, follow: false },
};
export default async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let publication;
  try {
    publication = await loadPublicProfile(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  return <ProfileView profile={publication.snapshot} mode={`public-${id}`} />;
}
