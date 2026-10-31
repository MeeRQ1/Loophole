import { describe, it, expect } from "vitest";
import {
  acceptedWords,
  commonWords,
  isWord,
  normalize,
} from "../src/engine/dictionary";

describe("offline English word policy", () => {
  it("uses a broad accepted lexicon and a genuinely smaller quality vocabulary", () => {
    expect(acceptedWords.length).toBeGreaterThan(200_000);
    expect(commonWords.length).toBe(10_000);
    expect(new Set(acceptedWords).size).toBe(acceptedWords.length);
    expect(new Set(commonWords).size).toBe(commonWords.length);
    expect(commonWords.every((word) => isWord(word))).toBe(true);
    expect(acceptedWords.every((word) => /^[a-z]{3,12}$/.test(word))).toBe(
      true,
    );
  });
  it("normalizes casing and surrounding whitespace but never invents words", () => {
    expect(normalize("  BUTTER  ")).toBe("butter");
    for (const word of [
      "BITTER",
      "butter",
      "banner",
      "  elephant  ",
      "colour",
      "color",
    ])
      expect(isWord(word)).toBe(true);
    for (const word of [
      "",
      "ab",
      "abcdefghijklmn",
      "zzzzzz",
      "abcxyz",
      "but-ter",
      "café",
      "ice cream",
      "123",
    ])
      expect(isWord(word)).toBe(false);
  });
  it("keeps accepted uncommon words valid without requiring showcase membership", () => {
    const common = new Set(commonWords);
    const uncommon = acceptedWords.find((word) => !common.has(word));
    expect(uncommon).toBeDefined();
    expect(isWord(uncommon!)).toBe(true);
  });
  it("excludes obvious inappropriate showcase entries", () => {
    for (const word of [
      "fuck",
      "shit",
      "cunt",
      "nigger",
      "pornography",
      "anal",
      "jew",
      "negro",
      "heroin",
    ]) {
      expect(commonWords.includes(word), word).toBe(false);
    }
  });
});
