/** Append-only deterministic content pipeline. Existing released puzzle entries are never overwritten. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { commonWords, acceptedWords } from "../src/engine/dictionary";
import { evaluateRule, ruleCategory } from "../src/engine/rules";
import type { Rule, Difficulty, Puzzle } from "../src/engine/types";
let state = 0x1a04fac;
const random = () => {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
};
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
const shuffle = <T>(items: T[]) => [...items].sort(() => random() - 0.5);
const signature = (rules: Rule[]) =>
  rules
    .map((r) => JSON.stringify(r))
    .sort()
    .join("|");
const maskCache = new Map<string, Uint32Array>();
const size = Math.ceil(commonWords.length / 32);
function mask(rule: Rule): Uint32Array {
  const key = JSON.stringify(rule);
  const found = maskCache.get(key);
  if (found) return found;
  const out = new Uint32Array(size);
  commonWords.forEach((w, i) => {
    if (evaluateRule(w, rule)) out[i >>> 5] |= 1 << (i & 31);
  });
  maskCache.set(key, out);
  return out;
}
function matching(rules: Rule[]): number[] {
  const masks = rules.map(mask);
  const result: number[] = [];
  for (let i = 0; i < size; i++) {
    let bits = masks.reduce((a, m) => a & m[i], -1) >>> 0;
    while (bits) {
      const low = bits & -bits;
      const bit = 31 - Math.clz32(low);
      const idx = i * 32 + bit;
      if (idx < commonWords.length) result.push(idx);
      bits = (bits & ~low) >>> 0;
    }
  }
  return result;
}
function candidates(word: string): Rule[] {
  const letters = [...new Set(word)];
  const vowelLetters = letters.filter((c) => "aeiou".includes(c));
  const rules: Rule[] = [
    { type: "length", value: word.length },
    { type: "minLength", value: Math.max(3, word.length - 1) },
    { type: "maxLength", value: Math.min(12, word.length + 1) },
    { type: "starts", value: word[0] },
    { type: "ends", value: word.at(-1)! },
    {
      type: "vowels",
      value: [...word].filter((c) => "aeiou".includes(c)).length,
    },
    { type: "distinct", value: letters.length },
  ];
  for (const l of shuffle(letters).slice(0, 3))
    rules.push({ type: "contains", value: l });
  for (const l of shuffle([..."etaoinshrdluc"])
    .filter((l) => !word.includes(l))
    .slice(0, 3))
    rules.push({ type: "excludes", value: l });
  const index = Math.floor(random() * word.length);
  rules.push({ type: "position", value: word[index], position: index + 1 });
  if (vowelLetters.length) {
    rules.push(
      { type: "distinctVowels", value: vowelLetters.length },
      {
        type: "minVowels",
        value: Math.max(
          1,
          [...word].filter((c) => "aeiou".includes(c)).length - 1,
        ),
      },
      { type: "hasVowel", value: pick(vowelLetters) },
    );
  }
  const absent = [..."aeiou"].filter((c) => !word.includes(c));
  if (absent.length) rules.push({ type: "noVowel", value: pick(absent) });
  const pairIndex = Math.floor(random() * (word.length - 1));
  rules.push({ type: "sequence", value: word.slice(pairIndex, pairIndex + 2) });
  const absentPair = pick(["th", "st", "er", "an", "in", "re", "on", "at"]);
  if (!word.includes(absentPair))
    rules.push({ type: "noSequence", value: absentPair });
  rules.push({ type: letters.length === word.length ? "unique" : "repeated" });
  if (/(.)\1/.test(word)) rules.push({ type: "adjacent" });
  if (word[0] !== word.at(-1)) rules.push({ type: "differentEnds" });
  if ("aeiou".includes(word[0])) rules.push({ type: "startsVowel" });
  if (!"aeiou".includes(word.at(-1)!)) rules.push({ type: "endsConsonant" });
  return rules;
}
const acceptedCache = new Map<string, string[]>();
function acceptedSolutionCount(rules: Rule[]): number {
  const ordered = [...rules].sort(
    (a, b) => matching([a]).length - matching([b]).length,
  );
  const key = JSON.stringify(ordered[0]);
  if (!acceptedCache.has(key))
    acceptedCache.set(
      key,
      acceptedWords.filter((w) => evaluateRule(w, ordered[0])),
    );
  return acceptedCache
    .get(key)!
    .filter((w) => ordered.slice(1).every((r) => evaluateRule(w, r))).length;
}
const path = "src/data/puzzles.json";
const old = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
const days = Math.max(old?.days ?? 0, Number(process.env.PUZZLE_DAYS ?? 396));
const puzzles: Record<Difficulty, Puzzle[]> = old?.puzzles ?? {
  easy: [],
  medium: [],
  hard: [],
};
const used = new Set<string>(
  Object.values(puzzles)
    .flat()
    .map((p) => signature(p.rules)),
);
for (const [difficulty, count, min, max] of [
  ["easy", 3, 40, 250],
  ["medium", 4, 15, 70],
  ["hard", 5, 5, 30],
] as const) {
  let attempts = 0;
  while (puzzles[difficulty].length < days) {
    if (++attempts > 400000)
      throw new Error(`Could not produce enough ${difficulty} puzzles`);
    const word = pick(commonWords);
    const rules = shuffle(candidates(word)).slice(0, count);
    if (new Set(rules.map(ruleCategory)).size < Math.min(3, count)) continue;
    const key = signature(rules);
    if (used.has(key)) continue;
    const hits = matching(rules);
    if (hits.length < min || hits.length > max) continue;
    if (
      rules.some(
        (_, i) =>
          matching(rules.filter((__, j) => i !== j)).length <= hits.length,
      )
    )
      continue;
    // The accepted dictionary is broader than the quality list. Acceptance is always rule-based.
    const examples = shuffle(hits.map((i) => commonWords[i])).slice(0, 12);
    if (!examples.every((w) => acceptedWords.includes(w)))
      throw new Error(
        "Common dictionary is not a subset of accepted dictionary",
      );
    const last = puzzles[difficulty].at(-1);
    if (
      last &&
      last.rules
        .map((r) => r.type)
        .sort()
        .join() ===
        rules
          .map((r) => r.type)
          .sort()
          .join()
    )
      continue;
    const acceptedCount = acceptedSolutionCount(rules);
    used.add(key);
    const puzzle: Puzzle & { acceptedCount: number } = {
      acceptedCount,
      id: `v1-${difficulty}-${puzzles[difficulty].length + 1}`,
      rules,
      difficulty,
      solutions: examples,
      commonCount: hits.length,
    };
    puzzles[difficulty].push(puzzle);
    if (puzzles[difficulty].length % 100 === 0)
      console.log(
        `${difficulty}: ${puzzles[difficulty].length}/${days} (${attempts} candidates)`,
      );
  }
}
writeFileSync(
  path,
  JSON.stringify({ version: 1, start: "2026-10-01", days, puzzles }),
);
console.log(
  `Saved ${days} immutable daily runs (${days * 3} validated puzzles).`,
);
