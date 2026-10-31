import type { Rule } from "../engine/types";
import { describeRule } from "../engine/rules";
export default function RuleList({
  rules,
  passes,
  className = "",
  compact = false,
  descriptions,
}: {
  rules: Rule[];
  passes?: boolean[];
  className?: string;
  compact?: boolean;
  descriptions?: string[];
}) {
  return (
    <ol
      className={`rule-list ${compact ? "compact" : ""} ${className}`}
      aria-label="Puzzle rules"
    >
      {rules.map((r, i) => (
        <li key={i} className={passes ? (passes[i] ? "pass" : "fail") : ""}>
          <span className="rule-number">{String(i + 1).padStart(2, "0")}</span>
          <span className="rule-description">
            {descriptions?.[i] ?? describeRule(r)}
          </span>
          {passes && (
            <span className="rule-state">
              <span aria-hidden="true">{passes[i] ? "✓" : "×"}</span>
              <span className="sr-only">
                {passes[i] ? "Satisfied" : "Not satisfied"}
              </span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
