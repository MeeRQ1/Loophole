import legacy from "../src/data/puzzles.json";
import calibrated from "../src/data/puzzles-v2.json";
import { acceptedWords, commonWords, isWord } from "../src/engine/dictionary";
import { evaluateRule, validRule } from "../src/engine/rules";
import {
  difficultyMetrics,
  puzzleSignature,
  qualityIssues,
} from "../src/engine/difficulty";
import type { Puzzle, Rule } from "../src/engine/types";
const cache = new Map<string, Set<string>>();
function words(rule: Rule): Set<string> {
  const key = JSON.stringify(rule);
  if (!cache.has(key))
    cache.set(
      key,
      new Set(commonWords.filter((word) => evaluateRule(word, rule))),
    );
  return cache.get(key)!;
}
const acceptedCache = new Map<string, string[]>();
function acceptedCount(rules: Rule[]): number {
  const ordered = [...rules].sort((a, b) => words(a).size - words(b).size);
  const key = JSON.stringify(ordered[0]);
  if (!acceptedCache.has(key))
    acceptedCache.set(
      key,
      acceptedWords.filter((word) => evaluateRule(word, ordered[0])),
    );
  return acceptedCache
    .get(key)!
    .filter((word) =>
      ordered.slice(1).every((rule) => evaluateRule(word, rule)),
    ).length;
}
export function validateBank(): number {
  const seen = new Set<string>();
  let checked = 0;
  if (legacy.start !== "2026-10-01" || legacy.days < 396)
    throw Error("Original immutable schedule is missing.");
  if (
    calibrated.start !== "2026-11-01" ||
    calibrated.version !== 2 ||
    calibrated.modelVersion !== 2 ||
    calibrated.days < 366
  )
    throw Error("Rebalanced schedule needs a complete future year.");
  for (const bank of [legacy, calibrated]) {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const puzzles = bank.puzzles[difficulty] as (Puzzle & {
        acceptedCount: number;
        metrics?: ReturnType<typeof difficultyMetrics>;
      })[];
      if (puzzles.length !== bank.days) throw Error("Incomplete schedule");
      const [count, min, max] =
        difficulty === "easy"
          ? [3, 40, 250]
          : difficulty === "medium"
            ? [4, 15, 70]
            : [5, 5, 30];
      for (const puzzle of puzzles) {
        if (
          puzzle.difficulty !== difficulty ||
          puzzle.rules.length !== count ||
          !puzzle.rules.every(validRule)
        )
          throw Error(`${puzzle.id}: invalid rules`);
        // v1 had synonyms in its representation; retain its original equality contract for compatibility.
        const signature =
          bank.version === 1
            ? puzzle.rules
                .map((rule) => JSON.stringify(rule))
                .sort()
                .join("|")
            : puzzleSignature(puzzle.rules);
        if (seen.has(signature)) throw Error(`${puzzle.id}: duplicate puzzle`);
        seen.add(signature);
        const sets = puzzle.rules.map(words).sort((a, b) => a.size - b.size);
        const solutions = [...sets[0]].filter((word) =>
          sets.every((set) => set.has(word)),
        );
        if (
          solutions.length !== puzzle.commonCount ||
          solutions.length < min ||
          solutions.length > max
        )
          throw Error(`${puzzle.id}: invalid common count`);
        if (
          puzzle.rules.some((_, index) => {
            const others = puzzle.rules
              .filter((__, j) => index !== j)
              .map(words)
              .sort((a, b) => a.size - b.size);
            return ![...others[0]].some(
              (word) =>
                others.every((set) => set.has(word)) &&
                !words(puzzle.rules[index]).has(word),
            );
          })
        )
          throw Error(`${puzzle.id}: redundant rule`);
        if (
          !puzzle.solutions.length ||
          !puzzle.solutions.every(
            (word) => isWord(word) && solutions.includes(word),
          )
        )
          throw Error(`${puzzle.id}: invalid examples`);
        if (bank.version === 2) {
          const issues = qualityIssues(
            puzzle.rules,
            solutions,
            difficulty,
            puzzle.acceptedCount,
          );
          if (issues.length) throw Error(`${puzzle.id}: ${issues.join("; ")}`);
          const measuredAcceptedCount = acceptedCount(puzzle.rules);
          if (measuredAcceptedCount !== puzzle.acceptedCount)
            throw Error(`${puzzle.id}: accepted count disagrees`);
          // solutions are frequency ordered during generation; sets above may use another order.
          const ordered = commonWords.filter((word) =>
            solutions.includes(word),
          );
          if (
            JSON.stringify(
              difficultyMetrics(puzzle.rules, ordered, measuredAcceptedCount),
            ) !== JSON.stringify(puzzle.metrics)
          )
            throw Error(`${puzzle.id}: stale difficulty metadata`);
        }
        checked++;
      }
      if (bank.version === 2) {
        const templates = new Set(
          puzzles.map((p) =>
            p.rules
              .map((rule) => rule.type)
              .sort()
              .join(),
          ),
        );
        if (templates.size < (difficulty === "easy" ? 12 : 30))
          throw Error(`${difficulty}: inadequate structural diversity`);
      }
    }
  }
  if (!commonWords.every(isWord)) throw Error("Common words must be accepted");
  return checked;
}
console.log(
  `Validated ${validateBank()} retained and calibrated puzzles, including all ${calibrated.days * 3} future puzzles: solutions, counts, familiarity, length, cognitive load, and independence pass.`,
);
