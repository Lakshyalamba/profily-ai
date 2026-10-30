import type { MatchOutput } from "@/types/intelligence";
export function RequirementBreakdown({
  requirements,
}: {
  requirements: MatchOutput["requirements"];
}) {
  const groups = [
    { status: "supported", label: "Supported", style: "supported" },
    { status: "partial", label: "Partial", style: "partially" },
    { status: "not_established", label: "Not established", style: "not" },
  ].map((group) => ({
    ...group,
    count: requirements.filter((item) => item.status === group.status).length,
  }));
  return (
    <div className="requirement-breakdown">
      <div className="breakdown-title">
        <span>REQUIREMENT EVIDENCE</span>
        <small>{requirements.length} assessed · no fit score</small>
      </div>
      <div className="breakdown-track" aria-hidden="true">
        {groups
          .filter((g) => g.count)
          .map((group) => (
            <span
              className={`segment-${group.style}`}
              style={{ flex: group.count }}
              key={group.status}
            />
          ))}
      </div>
      <div className="breakdown-legend">
        {groups.map((group) => (
          <span key={group.status}>
            <i className={`segment-${group.style}`} />
            {group.label}
            <strong>{group.count}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
