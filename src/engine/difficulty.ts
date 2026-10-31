import { commonWords } from "./dictionary";
import { evaluatePuzzle, evaluateRule, validRule } from "./rules";
import type { Difficulty, Rule, RuleType } from "./types";

/** A reproducible content-quality model, not a measured human solving-time predictor. */
export const DIFFICULTY_MODEL_VERSION = 2;
export const RULE_COMPLEXITY: Record<RuleType, number> = {
  length: 0.35,
  minLength: 0.65,
  maxLength: 0.65,
  starts: 0.45,
  ends: 0.45,
  contains: 0.55,
  hasVowel: 0.55,
  excludes: 0.85,
  noVowel: 0.85,
  startsVowel: 0.65,
  endsConsonant: 0.65,
  differentEnds: 0.9,
  unique: 1.2,
  repeated: 1.6,
  vowels: 2,
  minVowels: 1.6,
  adjacent: 2.4,
  sequence: 1.8,
  noSequence: 2.1,
  position: 2.8,
  distinct: 3.1,
  distinctVowels: 2.7,
};
const rank = new Map(commonWords.map((word, index) => [word, index + 1]));
export const wordRank = (word: string): number =>
  rank.get(word) ?? commonWords.length + 1;
const easyTypes = new Set<RuleType>([
  "length",
  "starts",
  "ends",
  "contains",
  "excludes",
  "hasVowel",
  "noVowel",
  "startsVowel",
  "endsConsonant",
  "differentEnds",
]);
const negativeTypes = new Set<RuleType>(["excludes", "noVowel", "noSequence"]);
export interface DifficultyMetrics {
  modelVersion: 2;
  commonCount: number;
  acceptedCount?: number;
  minLength: number;
  maxLength: number;
  meanLength: number;
  familiarTop2000: number;
  familiarTop4000: number;
  familiarTop6000: number;
  bestRank: number;
  meanRank: number;
  ruleComplexity: number;
  interactionPenalty: number;
  rareLetterConstraints: number;
  score: number;
  estimatedDifficulty: Difficulty;
}
export function difficultyMetrics(
  rules: Rule[],
  solutions: string[],
  acceptedCount?: number,
): DifficultyMetrics {
  const commonCount = solutions.length;
  const lengths = solutions.map((word) => word.length);
  const ranks = solutions.map(wordRank);
  const meanLength = commonCount
    ? lengths.reduce((a, b) => a + b, 0) / commonCount
    : 12;
  const ruleComplexity = rules.reduce(
    (total, rule) => total + RULE_COMPLEXITY[rule.type],
    0,
  );
  const negatives = rules.filter((rule) => negativeTypes.has(rule.type)).length;
  const positions = rules.filter((rule) => rule.type === "position").length;
  const repeated = rules.some((rule) =>
    ["adjacent", "repeated", "distinct"].includes(rule.type),
  );
  const vowelConstraint = rules.some((rule) =>
    ["vowels", "minVowels", "distinctVowels"].includes(rule.type),
  );
  const rareLetterConstraints = rules.filter(
    (rule) =>
      typeof rule.value === "string" &&
      /[jqxz]/.test(rule.value) &&
      !negativeTypes.has(rule.type),
  ).length;
  const interactionPenalty =
    Math.max(0, negatives - 1) * 1.2 +
    Math.max(0, positions - 1) * 1.2 +
    (repeated && vowelConstraint ? 0.8 : 0) +
    (positions && meanLength >= 7 ? 0.5 : 0);
  const familiarTop2000 = ranks.filter((value) => value <= 2000).length;
  const familiarTop4000 = ranks.filter((value) => value <= 4000).length;
  const familiarTop6000 = ranks.filter((value) => value <= 6000).length;
  const score = Number(
    (
      ruleComplexity * 4 +
      Math.max(0, meanLength - 4.5) * 2 +
      Math.max(0, Math.log2(251 / Math.max(1, commonCount))) * 3 +
      interactionPenalty * 3 +
      rareLetterConstraints * 2 +
      Math.max(0, 5 - familiarTop4000) * 1.5
    ).toFixed(2),
  );
  return {
    modelVersion: 2,
    commonCount,
    ...(acceptedCount === undefined ? {} : { acceptedCount }),
    minLength: commonCount ? Math.min(...lengths) : 0,
    maxLength: commonCount ? Math.max(...lengths) : 0,
    meanLength: Number(meanLength.toFixed(2)),
    familiarTop2000,
    familiarTop4000,
    familiarTop6000,
    bestRank: commonCount ? Math.min(...ranks) : 10001,
    meanRank: commonCount
      ? Math.round(ranks.reduce((a, b) => a + b, 0) / commonCount)
      : 10001,
    ruleComplexity: Number(ruleComplexity.toFixed(2)),
    interactionPenalty,
    rareLetterConstraints,
    score,
    estimatedDifficulty: score < 18 ? "easy" : score < 40 ? "medium" : "hard",
  };
}
/** Content gates are intentionally stricter than challenge validity: links may remain playable even if demanding. */
export function qualityIssues(
  rules: Rule[],
  solutions: string[],
  difficulty: Difficulty,
  acceptedCount?: number,
): string[] {
  const issues: string[] = [];
  const metrics = difficultyMetrics(rules, solutions, acceptedCount);
  if (rules.length !== { easy: 3, medium: 4, hard: 5 }[difficulty])
    issues.push("wrong rule count");
  if (!rules.every(validRule)) issues.push("invalid parameters");
  if (new Set(rules.map(ruleSignature)).size !== rules.length)
    issues.push("duplicate rules");
  if (
    !solutions.length ||
    !solutions.every((word) => evaluatePuzzle(word, rules).every(Boolean))
  )
    issues.push("invalid or missing solutions");
  const [min, max] =
    difficulty === "easy"
      ? [40, 250]
      : difficulty === "medium"
        ? [15, 70]
        : [5, 30];
  if (metrics.commonCount < min || metrics.commonCount > max)
    issues.push("common solution count outside target");
  if (difficulty === "easy") {
    if (
      !rules.some(
        (rule) =>
          rule.type === "length" &&
          Number(rule.value) >= 4 &&
          Number(rule.value) <= 6,
      ) ||
      metrics.minLength < 4 ||
      metrics.maxLength > 6
    )
      issues.push("warm-up requires 4–6 letter solutions");
    if (rules.some((rule) => !easyTypes.has(rule.type)))
      issues.push("warm-up rule too complex");
    if (rules.filter((rule) => negativeTypes.has(rule.type)).length > 1)
      issues.push("warm-up has interacting exclusions");
    if (metrics.rareLetterConstraints)
      issues.push("warm-up requires an unusual letter");
    if (metrics.familiarTop2000 < 5 || metrics.familiarTop4000 < 12)
      issues.push("warm-up lacks obvious familiar answers");
    if (metrics.ruleComplexity > 2.2 || metrics.score >= 18)
      issues.push("warm-up cognitive load too high");
  } else if (difficulty === "medium") {
    if (metrics.minLength < 4 || metrics.maxLength > 7)
      issues.push("medium length outside 4–7");
    if (metrics.familiarTop4000 < 5)
      issues.push("medium lacks familiar answers");
    if (
      metrics.ruleComplexity < 2.1 ||
      metrics.ruleComplexity > 6.5 ||
      metrics.score < 18 ||
      metrics.score >= 40
    )
      issues.push("medium cognitive load outside target");
    if (
      rules.filter((rule) => negativeTypes.has(rule.type)).length > 1 ||
      rules.some((rule) =>
        ["distinct", "distinctVowels", "position"].includes(rule.type),
      )
    )
      issues.push("medium has hard-only interaction");
  } else {
    if (metrics.minLength < 4 || metrics.maxLength > 9)
      issues.push("hard length outside 4–9");
    if (metrics.familiarTop6000 < 3 || metrics.familiarTop4000 < 1)
      issues.push("hard lacks recognizable answers");
    if (metrics.ruleComplexity < 6 || metrics.score < 40 || metrics.score > 80)
      issues.push("hard cognitive load outside target");
  }
  return issues;
}
/** Normalize synonymous rules so different spelling of the same condition cannot create fake variety. */
export function ruleSignature(rule: Rule): string {
  const type =
    rule.type === "hasVowel"
      ? "contains"
      : rule.type === "noVowel"
        ? "excludes"
        : rule.type;
  return JSON.stringify({ ...rule, type });
}
export function puzzleSignature(rules: Rule[]): string {
  return rules.map(ruleSignature).sort().join("|");
}
export function commonSolutions(rules: Rule[]): string[] {
  return commonWords.filter((word) =>
    rules.every((rule) => evaluateRule(word, rule)),
  );
}
