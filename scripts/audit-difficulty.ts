import { writeFileSync } from "node:fs";
import legacy from "../src/data/puzzles.json";
import calibrated from "../src/data/puzzles-v2.json";
import { commonWords } from "../src/engine/dictionary";
import { describeRule, evaluateRule } from "../src/engine/rules";
import { difficultyMetrics } from "../src/engine/difficulty";
import type { Difficulty, Puzzle, Rule } from "../src/engine/types";
const masks = new Map<string, Set<string>>();
function solutions(rules: Rule[]) {
  const sets = rules
    .map((rule) => {
      const key = JSON.stringify(rule);
      if (!masks.has(key))
        masks.set(
          key,
          new Set(commonWords.filter((word) => evaluateRule(word, rule))),
        );
      return masks.get(key)!;
    })
    .sort((a, b) => a.size - b.size);
  const hits = new Set(
    [...sets[0]].filter((word) => sets.every((set) => set.has(word))),
  );
  return commonWords.filter((word) => hits.has(word));
}
const summary: Record<string, unknown> = {};
let report = `# Difficulty calibration and compatibility report\n\nThe v2 schedule begins **November 1, 2026** and contains **${calibrated.days} days / ${(calibrated.days * 3).toLocaleString("en-US")} puzzles**. The original 396-day bank is retained intact. Historical UTC dates through October 31 use their original definitions; dates from November 1 use the versioned new schedule. Practice immediately uses the new verified pool. Stored runs embed their original puzzle definitions, so partial/completed games, guesses, hints, scores and statistics survive without a schema migration. Existing settings are preserved; only new players default to the approved dark theme.\n\n## What the audit found\n\nThe original [full audit](difficulty-audit-original.md) independently scanned all 1,188 original puzzles. **137 of 396 Warm-Ups force words longer than six letters**, while 337 allow solutions outside 4–6 letters. Easy included 82 precise-position puzzles and 79 distinct-letter puzzles. Twelve Medium and 44 Hard puzzles had no top-2,000-frequency solutions. No original puzzle was impossible: the failure was calibration, not validity.\n\n## Measurable quality gates\n\nThe estimator combines rule complexity, interacting negative/position/repetition constraints, solution length, common-solution count, frequency-rank familiarity, and unusual required letters. Its score classifies Easy below 18, Medium 18–39.99, and Hard at least 40. Generation separately rejects contradictory, duplicate and materially redundant rules, recent-template repeats, and high overlap with the immediately preceding puzzle.\n\n- **Easy:** 3 simple rules, exact length 4–6, 40–250 common solutions, at least 5 among the top 2,000 and 12 among the top 4,000 common words. No precise positions, vowel counting, repetition counting, unusual required J/Q/X/Z, or interacting exclusions.\n- **Medium:** 4 rules, 4–7-letter solutions, 15–70 common solutions and at least 5 among the top 4,000 words. Moderate complexity; no precise-position/distinct-vowel/distinct-letter restrictions or multiple exclusions.\n- **Hard:** 5 rules, 4–9-letter solutions, 5–30 common solutions, at least 3 among the top 6,000 and one among the top 4,000. More interaction is allowed, with an upper cognitive-load bound.\n\nThe common vocabulary is frequency ranked, not hand-labeled by age or education. Frequency is a proxy for recognition. **No human playtest was performed, and the proposed solving times have not been validated with players.** These automated gates establish objective content properties, not guaranteed personal difficulty.\n\n## Recomputed new-schedule summary\n\n| Difficulty | Common solutions min / median / max | Solution lengths | Top-2,000 familiar solutions min | Cognitive score | Rule structures |\n|---|---|---|---:|---|---:|\n`;
for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
  const pool = calibrated.puzzles[d] as Puzzle[];
  const metrics = pool.map((p) =>
    difficultyMetrics(p.rules, solutions(p.rules)),
  );
  const counts = metrics.map((m) => m.commonCount).sort((a, b) => a - b);
  const structures = new Set(
    pool.map((p) =>
      p.rules
        .map((r) => r.type)
        .sort()
        .join(),
    ),
  ).size;
  const row = {
    common: [counts[0], counts[Math.floor(counts.length / 2)], counts.at(-1)],
    lengths: [
      Math.min(...metrics.map((m) => m.minLength)),
      Math.max(...metrics.map((m) => m.maxLength)),
    ],
    familiarMin: Math.min(...metrics.map((m) => m.familiarTop2000)),
    score: [
      Math.min(...metrics.map((m) => m.score)),
      Math.max(...metrics.map((m) => m.score)),
    ],
    structures,
  };
  summary[d] = row;
  report += `| ${d} | ${row.common.join(" / ")} | ${row.lengths.join("–")} | ${row.familiarMin} | ${row.score.join("–")} | ${structures} |\n`;
}
report +=
  "\n## Nine representative verified puzzles\n\nEvery answer below is in the accepted dictionary and passes the same authoritative evaluator used by gameplay. They are common-word solutions, not required hidden answers. Counts and classifications are recomputed.\n";
for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
  report += `\n### ${d[0].toUpperCase() + d.slice(1)}\n`;
  for (const index of [0, 121, 244]) {
    const puzzle = calibrated.puzzles[d][index] as Puzzle;
    const answers = solutions(puzzle.rules);
    report += `\n**${puzzle.id}** — ${puzzle.rules.map(describeRule).join("; ")}.\n\nExamples: **${answers
      .slice(0, 5)
      .map((w) => w.toUpperCase())
      .join(
        ", ",
      )}**. ${answers.length} common solutions; estimated score ${difficultyMetrics(puzzle.rules, answers).score}.\n`;
  }
}
report += `\n## Compatibility and maintenance\n\n- The original source bank remains unchanged (${legacy.days * 3} original puzzles). Historical mappings and identifiers remain stable. Future daily identifiers remain date based, while versioned source banks document the changed future definitions.\n- Existing saved runs are loaded from their stored rules and outcomes, never replaced with freshly scheduled puzzles. No reset, scoring-formula change, achievement change, streak-policy change, or storage-version change is required.\n- Version-1 friend URLs retain their original count-based scoring tier. New version-2 links use the improved estimator. Both URL versions remain playable.\n- A Nudge normally provides an unexposed first letter; when that would repeat a visible rule, it gives an informative verified letter position/ending instead. It remains a clue to one possible answer, uses the existing one-per-round flag and unchanged penalty, and persists deterministically.\n- Run \`npm run generate:puzzles\` to reproduce the current content without changes. \`PUZZLE_DAYS=732 npm run generate:puzzles\` appends future v2 days. Existing v1 and v2 entries are retained; never silently regenerate a released schedule.\n- \`npm run validate:puzzles\` verifies all retained and future puzzles, including recomputed accepted/common counts, rule independence, difficulty metrics and structural diversity. \`npm run audit:difficulty\` regenerates this report from actual data.\n`;
writeFileSync("docs/difficulty-report.md", report);
writeFileSync(
  "docs/difficulty-summary.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  "Recomputed all calibrated difficulty metrics and nine validated examples.",
);
