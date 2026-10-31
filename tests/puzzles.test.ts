import type { Difficulty } from "../src/engine/types";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  puzzleBank,
  dailyPuzzles,
  practicePuzzle,
  dateKey,
  dayNumber,
} from "../src/engine/puzzles";
import { evaluatePuzzle, validRule } from "../src/engine/rules";
import { isWord } from "../src/engine/dictionary";
import {
  encodeChallenge,
  decodeChallenge,
  validateChallenge,
} from "../src/engine/challenges";
describe("scheduled and practice content", () => {
  it("contains a year of unique validated daily puzzles", () => {
    expect(puzzleBank.days).toBeGreaterThanOrEqual(396);
    const seen = new Set<string>();
    for (const [level, pool] of Object.entries(puzzleBank.puzzles)) {
      expect(pool.length).toBe(puzzleBank.days);
      const [rules, min, max] =
        level === "easy"
          ? [3, 40, 250]
          : level === "medium"
            ? [4, 15, 70]
            : [5, 5, 30];
      for (const p of pool) {
        expect(p.rules).toHaveLength(rules);
        expect(p.rules.every(validRule)).toBe(true);
        expect(p.commonCount).toBeGreaterThanOrEqual(min);
        expect(p.commonCount).toBeLessThanOrEqual(max);
        expect(p.solutions.length).toBeGreaterThanOrEqual(5);
        expect(
          p.solutions.every(
            (w) => isWord(w) && evaluatePuzzle(w, p.rules).every(Boolean),
          ),
        ).toBe(true);
        const signature = p.rules
          .map((r) => JSON.stringify(r))
          .sort()
          .join("|");
        expect(seen.has(signature)).toBe(false);
        seen.add(signature);
      }
      expect(
        new Set(pool.flatMap((p) => p.rules.map((r) => r.type))).size,
      ).toBeGreaterThanOrEqual(15);
    }
  });
  it("is stable by UTC date and continues after bank exhaustion", () => {
    expect(dailyPuzzles("2026-10-31")).toEqual(dailyPuzzles("2026-10-31"));
    expect(dailyPuzzles("2026-10-31")).not.toEqual(dailyPuzzles("2026-11-01"));
    expect(
      dailyPuzzles("2040-11-01").every((p) => p.solutions.length >= 5),
    ).toBe(true);
    expect(dateKey(new Date("2026-11-01T01:30:00+02:00"))).toBe("2026-10-31");
    expect(dayNumber("2026-10-01")).toBe(1);
  });
  it("practice is deterministic, valid and avoids immediate repeated content", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(practicePuzzle(d, 12)).toEqual(practicePuzzle(d, 12));
      expect(practicePuzzle(d, 12).rules).not.toEqual(
        practicePuzzle(d, 13).rules,
      );
      for (let i = 0; i < 100; i++)
        expect(
          practicePuzzle(d, i).solutions.every((w) =>
            evaluatePuzzle(w, practicePuzzle(d, i).rules).every(Boolean),
          ),
        ).toBe(true);
    }
  });
});
describe("safe friend challenges", () => {
  it("round trips a fair puzzle with rules but no hidden answer", () => {
    const rules = puzzleBank.puzzles.hard[0].rules;
    const encoded = encodeChallenge(rules);
    const decoded = decodeChallenge(encoded);
    expect(decoded.rules).toEqual(rules);
    expect(decoded.solutions.length).toBeGreaterThanOrEqual(5);
    expect(
      JSON.parse(atob(encoded.replaceAll("-", "+").replaceAll("_", "/"))),
    ).toEqual({ v: 1, r: rules });
  });
  it("rejects impossible, redundant and malformed rules", () => {
    expect(
      validateChallenge([
        { type: "starts", value: "a" },
        { type: "starts", value: "b" },
        { type: "length", value: 5 },
      ]).valid,
    ).toBe(false);
    expect(
      validateChallenge([
        { type: "length", value: 5 },
        { type: "minLength", value: 4 },
        { type: "ends", value: "s" },
      ]).valid,
    ).toBe(false);
    for (const payload of [
      "",
      "x".repeat(2000),
      "<script>",
      btoa('{"v":9,"r":[]}'),
      btoa('{"v":1,"r":[{"type":"evil"}]}'),
    ])
      expect(() => decodeChallenge(payload)).toThrow();
  });
});

// The first deployed year's definitions stay immutable as the schedule grows.
it("preserves every initially deployed puzzle", () => {
  const prefix = Object.fromEntries(
    ["easy", "medium", "hard"].map((d) => [
      d,
      puzzleBank.puzzles[d as Difficulty].slice(0, 366),
    ]),
  );
  expect(
    createHash("sha256").update(JSON.stringify(prefix)).digest("hex"),
  ).toBe("32189f8f7beb6815d9180cc077f4a736c15b206e54d109b993219a6a4d896c4d");
});
