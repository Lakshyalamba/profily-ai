import type { GroundedAnswer } from "@/types/intelligence";
/** Keep factual replies focused; hypothetical interview prompts belong only in requested question suggestions. */
export function focusAnswer(
  answer: GroundedAnswer,
  request: string,
): GroundedAnswer {
  const requestsQuestions =
    /\b(?:suggest|propose|generate|recommend|draft|give|provide|list)\b[\s\S]{0,70}\b(?:questions?|follow-ups?)\b|\b(?:what|which)\b[\s\S]{0,60}\b(?:questions?|would you ask)\b|\bhow\b[\s\S]{0,40}\binterview\b/i.test(
      request,
    );
  const explicitlyDeclines =
    /\b(?:do not|don't|no)\s+(?:suggest|ask|generate|more|interview)\s+(?:interview\s+)?questions?\b/i.test(
      request,
    );
  const paragraphs =
    requestsQuestions && !explicitlyDeclines
      ? answer.paragraphs
      : answer.paragraphs.filter((paragraph) => paragraph.kind !== "question");
  return {
    ...answer,
    paragraphs,
    unknowns:
      !paragraphs.length && !answer.unknowns.length
        ? [
            "The supplied evidence did not yield a supported answer to this question. Ask about a documented project or provide supporting information.",
          ]
        : answer.unknowns,
  };
}
