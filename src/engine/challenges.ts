import { commonWords } from "./dictionary";
import { difficultyMetrics } from "./difficulty";
import { evaluatePuzzle, validRule } from "./rules";
import type { Difficulty, Puzzle, Rule } from "./types";
export function validateChallenge(input: unknown): {
  valid: boolean;
  message: string;
  solutions: string[];
  commonCount: number;
  difficulty: Difficulty;
} {
  const fail = (message: string) => ({
    valid: false,
    message,
    solutions: [],
    commonCount: 0,
    difficulty: "hard" as const,
  });
  if (
    !Array.isArray(input) ||
    input.length < 3 ||
    input.length > 5 ||
    !input.every(validRule)
  )
    return fail("Choose 3–5 supported rules with valid parameters.");
  const rules = input as Rule[];
  if (new Set(rules.map((r) => JSON.stringify(r))).size !== rules.length)
    return fail("Remove duplicate rules.");
  const solutions = commonWords.filter((w) =>
    evaluatePuzzle(w, rules).every(Boolean),
  );
  if (solutions.length < 5)
    return fail(
      "This combination needs at least 5 common solutions to be fair.",
    );
  if (solutions.length > 500)
    return fail("Add a more specific rule: over 500 common words fit.");
  const redundant = rules.some(
    (_, i) =>
      !commonWords.some(
        (w) =>
          !evaluatePuzzle(w, [rules[i]])[0] &&
          evaluatePuzzle(
            w,
            rules.filter((__, j) => j !== i),
          ).every(Boolean),
      ),
  );
  if (redundant)
    return fail("One rule adds no restriction. Remove or replace it.");
  const difficulty = difficultyMetrics(rules, solutions).estimatedDifficulty;
  return {
    valid: true,
    message: `${solutions.length} common solutions · Ready to share`,
    solutions: solutions.slice(0, 12),
    commonCount: solutions.length,
    difficulty,
  };
}
export function encodeChallenge(rules: Rule[]): string {
  if (!validateChallenge(rules).valid)
    throw new Error("The challenge is not ready to share.");
  return btoa(JSON.stringify({ v: 2, r: rules }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodeChallenge(payload: string): Puzzle {
  if (payload.length > 1800 || !/^[A-Za-z0-9_-]+$/.test(payload))
    throw new Error("This challenge link is invalid or too long.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      atob(payload.replaceAll("-", "+").replaceAll("_", "/")),
    );
  } catch {
    throw new Error("This challenge link could not be read.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("v" in parsed) ||
    (parsed.v !== 1 && parsed.v !== 2) ||
    !("r" in parsed) ||
    Object.keys(parsed).some((k) => !["v", "r"].includes(k))
  )
    throw new Error("This challenge version is not supported.");
  const result = validateChallenge(parsed.r);
  if (!result.valid) throw new Error(result.message);
  return {
    id: `challenge:${payload}`,
    rules: parsed.r as Rule[],
    solutions: result.solutions,
    commonCount: result.commonCount,
    // Version-1 URLs keep their original scoring tier; new links use the calibrated estimator.
    difficulty:
      parsed.v === 1
        ? result.commonCount > 70
          ? "easy"
          : result.commonCount > 30
            ? "medium"
            : "hard"
        : result.difficulty,
  };
}
