import { PrivateProfile } from "@/components/private-profile";
export const metadata = {
  title: "Your private career twin",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <PrivateProfile />;
}
