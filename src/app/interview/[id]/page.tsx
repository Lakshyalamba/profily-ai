import { InterviewLoader } from "@/components/interview-room";
export const metadata = {
  title: "Private recruiter interview",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <InterviewLoader id={(await params).id} />;
}
