import bank from "../src/data/puzzles.json";
import { acceptedWords, commonWords, isWord } from "../src/engine/dictionary";
import { evaluateRule, validRule, ruleCategory } from "../src/engine/rules";
import type { Rule, Puzzle } from "../src/engine/types";
const cache = new Map<string, Set<string>>();
function words(rule: Rule): Set<string> {
  const key = JSON.stringify(rule);
  if (!cache.has(key))
    cache.set(key, new Set(commonWords.filter((w) => evaluateRule(w, rule))));
  return cache.get(key)!;
}
export function validateBank(): number {
  const used = new Set<string>();
  let checked = 0;
  if (bank.days < 396)
    throw Error(
      "Schedule must include 30 archive dates plus a full launch year",
    );
  for (const [difficulty, count, min, max] of [
    ["easy", 3, 40, 250],
    ["medium", 4, 15, 70],
    ["hard", 5, 5, 30],
  ] as const) {
    const puzzles = bank.puzzles[difficulty] as Puzzle[];
    if (puzzles.length !== bank.days) throw Error("Incomplete schedule");
    for (const p of puzzles) {
      if (p.rules.length !== count || !p.rules.every(validRule))
        throw Error(`${p.id}: invalid rules`);
      if (new Set(p.rules.map(ruleCategory)).size < 3)
        throw Error(`${p.id}: poor category variety`);
      const key = p.rules
        .map((r) => JSON.stringify(r))
        .sort()
        .join("|");
      if (used.has(key)) throw Error(`${p.id}: repeated puzzle`);
      used.add(key);
      const sets = p.rules.map(words).sort((a, b) => a.size - b.size);
      const solutions = [...sets[0]].filter((w) => sets.every((s) => s.has(w)));
      if (
        solutions.length !== p.commonCount ||
        solutions.length < min ||
        solutions.length > max
      )
        throw Error(`${p.id}: unfair solution count ${solutions.length}`);
      if (
        p.rules.some((_, i) => {
          const subsets = p.rules
            .filter((__, j) => i !== j)
            .map(words)
            .sort((a, b) => a.size - b.size);
          return ![...subsets[0]].some(
            (w) => subsets.every((s) => s.has(w)) && !words(p.rules[i]).has(w),
          );
        })
      )
        throw Error(`${p.id}: redundant constraint`);
      if (
        !p.solutions.length ||
        !p.solutions.every((w) => isWord(w) && solutions.includes(w))
      )
        throw Error(`${p.id}: invalid example`);
      checked++;
    }
  }
  const accepted = new Set(acceptedWords);
  if (!commonWords.every((w) => accepted.has(w)))
    throw Error("Common vocabulary must be accepted");
  return checked;
}
console.log(
  `Validated ${validateBank()} unique puzzles across ${bank.days} UTC days; all solution counts, examples, rule independence and dictionary policies pass.`,
);
