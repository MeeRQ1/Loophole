import { describe, expect, it } from "vitest";
import {
  evaluateRule,
  evaluatePuzzle,
  validRule,
  describeRule,
  ruleCategory,
} from "../src/engine/rules";
import {
  isWord,
  normalize,
  acceptedWords,
  commonWords,
} from "../src/engine/dictionary";
import { RULE_TYPES, type Rule } from "../src/engine/types";
const examples: [Rule, string, string][] = [
  [{ type: "length", value: 6 }, "butter", "cat"],
  [{ type: "minLength", value: 6 }, "butter", "cat"],
  [{ type: "maxLength", value: 6 }, "butter", "butters"],
  [{ type: "starts", value: "b" }, "butter", "cutter"],
  [{ type: "ends", value: "r" }, "butter", "button"],
  [{ type: "position", value: "t", position: 3 }, "butter", "banner"],
  [{ type: "contains", value: "b" }, "butter", "cutter"],
  [{ type: "excludes", value: "b" }, "cutter", "butter"],
  [{ type: "sequence", value: "tt" }, "butter", "banner"],
  [{ type: "noSequence", value: "tt" }, "banner", "butter"],
  [{ type: "vowels", value: 2 }, "butter", "banana"],
  [{ type: "minVowels", value: 3 }, "banana", "butter"],
  [{ type: "hasVowel", value: "u" }, "butter", "banner"],
  [{ type: "noVowel", value: "u" }, "banner", "butter"],
  [{ type: "adjacent" }, "butter", "banana"],
  [{ type: "unique" }, "planet", "banana"],
  [{ type: "repeated" }, "banana", "planet"],
  [{ type: "distinct", value: 5 }, "butter", "banana"],
  [{ type: "differentEnds" }, "butter", "radar"],
  [{ type: "startsVowel" }, "apple", "butter"],
  [{ type: "endsConsonant" }, "butter", "apple"],
  [{ type: "distinctVowels", value: 2 }, "butter", "banana"],
];
describe("authoritative rules", () => {
  it.each(examples)("%j accepts %s and rejects %s", (rule, yes, no) => {
    expect(validRule(rule)).toBe(true);
    expect(evaluateRule(yes, rule)).toBe(true);
    expect(evaluateRule(no, rule)).toBe(false);
    expect(evaluateRule(yes.toUpperCase(), rule)).toBe(true);
    expect(describeRule(rule)).not.toContain("undefined");
    expect(ruleCategory(rule)).toBeTruthy();
  });
  it("covers every declared rule", () =>
    expect(examples.map(([r]) => r.type).sort()).toEqual(
      [...RULE_TYPES].sort(),
    ));
  it("accepts both BITTER and BUTTER rather than one hidden answer", () => {
    const rules: Rule[] = [
      { type: "length", value: 6 },
      { type: "starts", value: "b" },
      { type: "ends", value: "r" },
      { type: "vowels", value: 2 },
      { type: "adjacent" },
    ];
    for (const word of ["BITTER", "BUTTER", "BANNER"])
      expect(evaluatePuzzle(word, rules).every(Boolean)).toBe(true);
  });
  it.each([
    null,
    {},
    [],
    { type: "unknown" },
    { type: "length", value: 0 },
    { type: "length", value: 13 },
    { type: "length", value: 4.1 },
    { type: "vowels", value: -1 },
    { type: "starts", value: "A" },
    { type: "position", value: "a", position: 0 },
    { type: "position", value: "a", position: 13 },
    { type: "hasVowel", value: "y" },
    { type: "sequence", value: "abc" },
    { type: "unique", value: 1 },
    { type: "adjacent", position: 2 },
    { type: "length", value: 4, evil: true },
  ])("rejects invalid rule %j", (rule) => expect(validRule(rule)).toBe(false));
  it("defines boundaries and Y as consonant", () => {
    expect(evaluateRule("rhythm", { type: "vowels", value: 0 })).toBe(true);
    expect(evaluateRule("play", { type: "endsConsonant" })).toBe(true);
    expect(
      evaluateRule("abc", { type: "position", value: "a", position: 4 }),
    ).toBe(false);
    expect(evaluateRule("", { type: "noVowel", value: "a" })).toBe(false);
    expect(evaluateRule("a-b", { type: "length", value: 3 })).toBe(false);
  });
});
describe("offline dictionary", () => {
  it("is broad, normalized, and separates showcase vocabulary", () => {
    expect(acceptedWords.length).toBeGreaterThan(100000);
    expect(commonWords.length).toBeGreaterThan(5000);
    expect(acceptedWords.every((w) => /^[a-z]{3,12}$/.test(w))).toBe(true);
    expect(commonWords.every(isWord)).toBe(true);
    expect(new Set(acceptedWords).size).toBe(acceptedWords.length);
  });
  it("accepts legitimate inflections, rejects junk and nonalphabetic input", () => {
    for (const w of [
      "butter",
      "bitter",
      "banners",
      "running",
      "planets",
      "elephant",
    ])
      expect(isWord(w)).toBe(true);
    for (const w of [
      "zzqzx",
      "abc123",
      "mother-in-law",
      "hi",
      "supercalifragilisticexpialidocious",
    ])
      expect(isWord(w)).toBe(false);
    expect(normalize("  BUTTER ")).toBe("butter");
    expect(isWord("BUTTER")).toBe(true);
  });
});
