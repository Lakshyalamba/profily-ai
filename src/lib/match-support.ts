import type { MatchOutput, Source } from "@/types/intelligence";
const normalize = (value: string) =>
  value.toLowerCase().replace(/\s+/g, " ").trim();
/** A reviewed technology list alone cannot establish a more specific role requirement. */
export function calibrateSkillListSupport(
  result: MatchOutput,
  sources: Source[],
): MatchOutput {
  return {
    ...result,
    requirements: result.requirements.map((requirement) => {
      const evidence = requirement.citations.map((citation) =>
        sources.find((source) => source.id === citation.sourceId),
      );
      const onlySkillList =
        evidence.length > 0 &&
        evidence.every(
          (source) =>
            source?.kind === "developer" && source.id === "reviewed-skills",
        );
      if (
        requirement.status !== "supported" ||
        !onlySkillList ||
        evidence.some((source) =>
          source!.excerpt
            .replace(/^skills:\s*/i, "")
            .split(/[,;\n]/)
            .some(
              (skill) =>
                normalize(skill) === normalize(requirement.requirement),
            ),
        )
      )
        return requirement;
      return {
        ...requirement,
        status: "partial" as const,
        explanation: `${requirement.explanation.slice(0, 1200)} The cited technology list alone does not establish the full scope of this requirement.`,
      };
    }),
  };
}
