/** Calibrated v2 content: append only. The entire published v1 bank remains untouched. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { acceptedWords, commonWords } from "../src/engine/dictionary";
import { evaluateRule } from "../src/engine/rules";
import {
  difficultyMetrics,
  puzzleSignature,
  qualityIssues,
  type DifficultyMetrics,
} from "../src/engine/difficulty";
import type { Difficulty, Puzzle, Rule } from "../src/engine/types";

const START = "2026-11-01";
const path = "src/data/puzzles-v2.json";
type MeasuredPuzzle = Puzzle & {
  acceptedCount: number;
  metrics: DifficultyMetrics;
};
type Bank = {
  version: 2;
  modelVersion: 2;
  start: string;
  days: number;
  puzzles: Record<Difficulty, MeasuredPuzzle[]>;
};
const old: Bank | null = existsSync(path)
  ? JSON.parse(readFileSync(path, "utf8"))
  : null;
if (old && (old.version !== 2 || old.start !== START))
  throw Error("Do not change a published schedule version or start.");
const requested = Number(process.env.PUZZLE_DAYS ?? 366);
if (!Number.isSafeInteger(requested) || requested < 366 || requested > 5000)
  throw Error("PUZZLE_DAYS must be an integer from366to5000.");
const days = Math.max(old?.days ?? 0, requested);
const puzzles: Bank["puzzles"] = old?.puzzles ?? {
  easy: [],
  medium: [],
  hard: [],
};
const legacy = JSON.parse(readFileSync("src/data/puzzles.json", "utf8")) as {
  puzzles: Record<Difficulty, Puzzle[]>;
};
const used = new Set(
  [
    ...Object.values(legacy.puzzles).flat(),
    ...Object.values(puzzles).flat(),
  ].map((p) => puzzleSignature(p.rules)),
);
let state = 0x62851;
const random = () => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
};
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
function shuffle<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const wordMasks = new Map<string, Uint32Array>();
const size = Math.ceil(commonWords.length / 32);
function mask(rule: Rule) {
  const key = JSON.stringify(rule);
  if (!wordMasks.has(key)) {
    const bits = new Uint32Array(size);
    commonWords.forEach((word, index) => {
      if (evaluateRule(word, rule)) bits[index >>> 5] |= 1 << (index & 31);
    });
    wordMasks.set(key, bits);
  }
  return wordMasks.get(key)!;
}
function matching(rules: Rule[]): number[] {
  const masks = rules.map(mask);
  const result: number[] = [];
  for (let i = 0; i < size; i++) {
    let bits = masks.reduce((value, m) => value & m[i], -1) >>> 0;
    while (bits) {
      const low = bits & -bits;
      const index = i * 32 + 31 - Math.clz32(low);
      if (index < commonWords.length) result.push(index);
      bits = (bits & ~low) >>> 0;
    }
  }
  return result;
}
const acceptedCache = new Map<string, string[]>();
function acceptedCount(rules: Rule[]): number {
  const ordered = [...rules].sort(
    (a, b) => matching([a]).length - matching([b]).length,
  );
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
function candidates(word: string, difficulty: Difficulty): Rule[] {
  const letters = shuffle([...new Set(word)]);
  const vowelLetters = letters.filter((c) => "aeiou".includes(c));
  const rules: Rule[] = [
    { type: "starts", value: word[0] },
    { type: "ends", value: word.at(-1)! },
    ...letters.map((value) => ({ type: "contains" as const, value })),
  ];
  for (const value of shuffle([..."etaoinshrdlc"])
    .filter((c) => !word.includes(c))
    .slice(0, 3))
    rules.push({ type: "excludes", value });
  if (vowelLetters.length)
    rules.push({ type: "hasVowel", value: pick(vowelLetters) });
  const absent = [..."aeiou"].filter((c) => !word.includes(c));
  if (absent.length) rules.push({ type: "noVowel", value: pick(absent) });
  if (word[0] !== word.at(-1)) rules.push({ type: "differentEnds" });
  if ("aeiou".includes(word[0])) rules.push({ type: "startsVowel" });
  if (!"aeiou".includes(word.at(-1)!)) rules.push({ type: "endsConsonant" });
  if (difficulty === "easy") return rules;
  const unique = new Set(word).size === word.length;
  rules.push(
    { type: unique ? "unique" : "repeated" },
    {
      type: "vowels",
      value: [...word].filter((c) => "aeiou".includes(c)).length,
    },
  );
  const sequence = Math.floor(random() * (word.length - 1));
  rules.push({ type: "sequence", value: word.slice(sequence, sequence + 2) });
  if (difficulty === "medium") return rules;
  rules.push({ type: "distinct", value: new Set(word).size });
  if (/(.)\1/.test(word)) rules.push({ type: "adjacent" });
  for (let i = 1; i < word.length - 1; i++)
    rules.push({ type: "position", position: i + 1, value: word[i] });
  if (vowelLetters.length)
    rules.push(
      { type: "distinctVowels", value: vowelLetters.length },
      {
        type: "minVowels",
        value: Math.max(
          1,
          [...word].filter((c) => "aeiou".includes(c)).length - 1,
        ),
      },
    );
  const pair = pick(["th", "st", "er", "in", "an", "re", "on", "at"]);
  if (!word.includes(pair)) rules.push({ type: "noSequence", value: pair });
  return rules;
}
const seeds = {
  easy: commonWords
    .slice(0, 3000)
    .filter((w) => w.length >= 4 && w.length <= 6),
  medium: commonWords
    .slice(0, 5000)
    .filter((w) => w.length >= 4 && w.length <= 7),
  hard: commonWords
    .slice(0, 6000)
    .filter((w) => w.length >= 4 && w.length <= 9),
};
for (const difficulty of ["easy", "medium", "hard"] as const) {
  let attempts = 0;
  const number = { easy: 3, medium: 4, hard: 5 }[difficulty];
  const [min, max] =
    difficulty === "easy"
      ? [40, 250]
      : difficulty === "medium"
        ? [15, 70]
        : [5, 30];
  while (puzzles[difficulty].length < days) {
    if (++attempts > 800000)
      throw Error(
        `Insufficient fair ${difficulty} puzzles: ${puzzles[difficulty].length}/${days}`,
      );
    const seed = pick(seeds[difficulty]);
    const rules: Rule[] = [
      { type: "length", value: seed.length },
      ...shuffle(candidates(seed, difficulty)).slice(0, number - 1),
    ];
    const signature = puzzleSignature(rules);
    if (used.has(signature)) continue;
    const matches = matching(rules);
    if (matches.length < min || matches.length > max) continue;
    const solutions = matches.map((i) => commonWords[i]);
    if (qualityIssues(rules, solutions, difficulty).length) continue;
    if (
      rules.some(
        (_, index) =>
          matching(rules.filter((__, j) => j !== index)).length <=
          matches.length,
      )
    )
      continue;
    const previous = puzzles[difficulty].at(-1);
    const template = rules
      .map((r) => r.type)
      .sort()
      .join();
    if (
      previous &&
      previous.rules
        .map((r) => r.type)
        .sort()
        .join() === template
    )
      continue;
    if (previous) {
      const previousSet = new Set(matching(previous.rules));
      const overlap =
        matches.filter((index) => previousSet.has(index)).length /
        Math.min(matches.length, previousSet.size);
      if (overlap > 0.72) continue;
    }
    const count = acceptedCount(rules);
    const puzzle: MeasuredPuzzle = {
      id: `v2-${difficulty}-${puzzles[difficulty].length + 1}`,
      rules,
      difficulty,
      solutions: solutions.slice(0, 12),
      commonCount: solutions.length,
      acceptedCount: count,
      metrics: difficultyMetrics(rules, solutions, count),
    };
    puzzles[difficulty].push(puzzle);
    used.add(signature);
    if (puzzles[difficulty].length % 100 === 0)
      console.log(
        `${difficulty}: ${puzzles[difficulty].length}/${days} (${attempts} candidates)`,
      );
  }
}
writeFileSync(
  path,
  JSON.stringify({ version: 2, modelVersion: 2, start: START, days, puzzles }),
);
console.log(
  `Saved ${days} calibrated future Daily Runs (${days * 3} puzzles); v1 remains unchanged.`,
);
