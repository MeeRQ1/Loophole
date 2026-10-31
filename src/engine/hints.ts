import { commonWords, isWord, normalize } from "./dictionary";
import { evaluatePuzzle, validRule } from "./rules";
import type { Puzzle, Rule } from "./types";

const ordinals = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
];
const cache = new Map<string, string>();
const unavailable =
  "This puzzle has no verified Nudge. Keep following the visible rules.";

function alreadyShown(rules: Rule[], word: string, position: number): boolean {
  return rules.some(
    (rule) =>
      (rule.type === "position" && rule.position === position + 1) ||
      (position === 0 && rule.type === "starts") ||
      (position === word.length - 1 && rule.type === "ends"),
  );
}
function remember(key: string, message: string): string {
  // Endless practice should not retain an unbounded history of dictionary scans.
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(key, message);
  return message;
}

/**
 * A scored Nudge adds one verified clue, never an additional requirement.
 * Stored examples determine the source, keeping existing saved hints repeatable.
 * Common vocabulary is examined only on the first request for this puzzle.
 */
export function getNudge(puzzle: Puzzle): string {
  if (
    !puzzle ||
    !Array.isArray(puzzle.rules) ||
    !puzzle.rules.length ||
    !puzzle.rules.every(validRule) ||
    !Array.isArray(puzzle.solutions)
  )
    return unavailable;
  const key = JSON.stringify([puzzle.rules, puzzle.solutions]);
  const previous = cache.get(key);
  if (previous) return previous;
  const sources = [
    ...new Set(
      puzzle.solutions
        .filter((word): word is string => typeof word === "string")
        .map(normalize),
    ),
  ].filter(
    (word) => isWord(word) && evaluatePuzzle(word, puzzle.rules).every(Boolean),
  );
  if (!sources.length) return remember(key, unavailable);

  const common = commonWords.filter((word) =>
    evaluatePuzzle(word, puzzle.rules).every(Boolean),
  );
  // Fall back to another common answer if the saved examples all share a
  // short, already determined prefix. The examples themselves remain unchanged.
  for (const source of [...new Set([...sources, ...common])]) {
    // Prefer the established first-letter hint, then an unrevealed inner letter.
    // An ending is reserved for cases where it is more informative than those.
    const positions = [
      0,
      ...Array.from({ length: source.length - 2 }, (_, i) => i + 1),
      source.length - 1,
    ];
    for (const position of positions) {
      if (alreadyShown(puzzle.rules, source, position)) continue;
      const letter = source[position];
      const values = common.map((word) =>
        position === source.length - 1 ? word.at(-1) : word[position],
      );
      // If every common answer already has this letter, it adds no useful clue.
      if (values.length && values.every((value) => value === letter)) continue;
      const message =
        position === 0
          ? `One possible answer begins with ${letter.toUpperCase()}. Your word can start differently.`
          : position === source.length - 1
            ? `One possible answer ends with ${letter.toUpperCase()}. Other endings may work too.`
            : `One possible answer has ${letter.toUpperCase()} as its ${ordinals[position]} letter. Your answer may use a different letter.`;
      return remember(key, message);
    }
  }
  // A fully specified or malformed legacy puzzle may expose every letter already.
  // Do not invent a word or charge a second hint to repeat a visible restriction.
  return remember(
    key,
    "The visible rules already reveal the letters of one verified answer. Try putting those letters together.",
  );
}
