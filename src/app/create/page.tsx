import { DraftForm } from "@/components/draft-form";
export const metadata = { title: "Create a private profile draft" };
export default function Create() {
  return (
    <div className="container inner-page">
      <div className="eyebrow">YOUR NEXT CHAPTER</div>
      <h1>Start with your story.</h1>
      <p className="page-description">
        Upload a resume, inspect public projects, and review your experience
        before saving a private career twin.
      </p>
      <DraftForm />
    </div>
  );
}
