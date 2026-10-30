import { ProfileView } from "@/components/profile-view";
import { demoSnapshot } from "@/lib/server/profiles";
export const metadata = { title: "Alex Morgan · Fictional career twin" };
export default function Profile() {
  return <ProfileView profile={demoSnapshot()} mode="demo" />;
}
