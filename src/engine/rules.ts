import { RULE_TYPES, type Rule, type RuleType } from "./types";

const vowels = "aeiou";
const numeric = new Set<RuleType>([
  "length",
  "minLength",
  "maxLength",
  "vowels",
  "minVowels",
  "distinct",
  "distinctVowels",
]);
const letter = new Set<RuleType>([
  "starts",
  "ends",
  "position",
  "contains",
  "excludes",
  "hasVowel",
  "noVowel",
]);
const parameterless = new Set<RuleType>([
  "adjacent",
  "unique",
  "repeated",
  "differentEnds",
  "startsVowel",
  "endsConsonant",
]);
export function validRule(input: unknown): input is Rule {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const r = input as Record<string, unknown>;
  if (typeof r.type !== "string" || !RULE_TYPES.includes(r.type as RuleType))
    return false;
  if (Object.keys(r).some((k) => !["type", "value", "position"].includes(k)))
    return false;
  const type = r.type as RuleType;
  if (type !== "position" && r.position !== undefined) return false;
  if (numeric.has(type)) {
    if (typeof r.value !== "number" || !Number.isInteger(r.value)) return false;
    const min = ["vowels", "minVowels"].includes(type) ? 0 : 1;
    const max = type === "distinctVowels" ? 5 : 12;
    return r.value >= min && r.value <= max;
  }
  if (letter.has(type)) {
    if (typeof r.value !== "string" || !/^[a-z]$/.test(r.value)) return false;
    if (["hasVowel", "noVowel"].includes(type) && !vowels.includes(r.value))
      return false;
    if (type === "position")
      return (
        typeof r.position === "number" &&
        Number.isInteger(r.position) &&
        r.position >= 1 &&
        r.position <= 12
      );
    return true;
  }
  if (type === "sequence" || type === "noSequence")
    return typeof r.value === "string" && /^[a-z]{2}$/.test(r.value);
  return parameterless.has(type) && r.value === undefined;
}
export function ruleCategory(r: Rule): string {
  if (["length", "minLength", "maxLength"].includes(r.type)) return "Length";
  if (["starts", "ends", "position"].includes(r.type)) return "Position";
  if (["contains", "excludes", "sequence", "noSequence"].includes(r.type))
    return "Letters";
  if (
    ["vowels", "minVowels", "hasVowel", "noVowel", "distinctVowels"].includes(
      r.type,
    )
  )
    return "Vowels";
  if (["adjacent", "unique", "repeated", "distinct"].includes(r.type))
    return "Repetition";
  return "Relationships";
}
export function describeRule(r: Rule): string {
  const n = r.value as number;
  const s = String(r.value).toUpperCase();
  switch (r.type) {
    case "length":
      return `Exactly ${n} letters`;
    case "minLength":
      return `At least ${n} letters`;
    case "maxLength":
      return `At most ${n} letters`;
    case "starts":
      return `Begins with ${s}`;
    case "ends":
      return `Ends with ${s}`;
    case "position":
      return `Letter ${r.position} is ${s}`;
    case "contains":
      return `Contains the letter ${s}`;
    case "excludes":
      return `No letter ${s}`;
    case "sequence":
      return `Contains ${s} together`;
    case "noSequence":
      return `No ${s} sequence`;
    case "vowels":
      return `Exactly ${n} vowel${n === 1 ? "" : "s"}`;
    case "minVowels":
      return `At least ${n} vowel${n === 1 ? "" : "s"}`;
    case "hasVowel":
      return `Contains the vowel ${s}`;
    case "noVowel":
      return `No vowel ${s}`;
    case "adjacent":
      return "Has a double letter";
    case "unique":
      return "No repeated letters";
    case "repeated":
      return "At least one repeated letter";
    case "distinct":
      return `Exactly ${n} distinct letters`;
    case "differentEnds":
      return "First and last letters differ";
    case "startsVowel":
      return "Begins with a vowel";
    case "endsConsonant":
      return "Ends with a consonant";
    case "distinctVowels":
      return `At least ${n} different vowel${n === 1 ? "" : "s"}`;
  }
}
/** Mechanical vowels are a/e/i/o/u. Y is always a consonant. */
export function evaluateRule(input: string, r: Rule): boolean {
  if (!validRule(r)) return false;
  const w = input.trim().toLowerCase();
  if (!/^[a-z]+$/.test(w)) return false;
  const vowelCount = () => [...w].filter((c) => vowels.includes(c)).length;
  switch (r.type) {
    case "length":
      return w.length === r.value;
    case "minLength":
      return w.length >= Number(r.value);
    case "maxLength":
      return w.length <= Number(r.value);
    case "starts":
      return w.startsWith(String(r.value));
    case "ends":
      return w.endsWith(String(r.value));
    case "position":
      return w[(r.position ?? 0) - 1] === r.value;
    case "contains":
    case "hasVowel":
      return w.includes(String(r.value));
    case "excludes":
    case "noVowel":
      return !w.includes(String(r.value));
    case "sequence":
      return w.includes(String(r.value));
    case "noSequence":
      return !w.includes(String(r.value));
    case "vowels":
      return vowelCount() === r.value;
    case "minVowels":
      return vowelCount() >= Number(r.value);
    case "adjacent":
      return /(.)\1/.test(w);
    case "unique":
      return new Set(w).size === w.length;
    case "repeated":
      return new Set(w).size < w.length;
    case "distinct":
      return new Set(w).size === r.value;
    case "differentEnds":
      return w[0] !== w.at(-1);
    case "startsVowel":
      return vowels.includes(w[0]);
    case "endsConsonant":
      return !vowels.includes(w.at(-1)!);
    case "distinctVowels":
      return (
        new Set([...w].filter((c) => vowels.includes(c))).size >=
        Number(r.value)
      );
  }
}
export function evaluatePuzzle(word: string, rules: Rule[]): boolean[] {
  return rules.map((rule) => evaluateRule(word, rule));
}
export function explainRule(word: string, rule: Rule): string {
  return `${describeRule(rule)} — ${evaluateRule(word, rule) ? "Satisfied" : "Not satisfied"}`;
}
