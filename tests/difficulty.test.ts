import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { commonWords, isWord } from "../src/engine/dictionary";
import {
  commonSolutions,
  difficultyMetrics,
  qualityIssues,
  puzzleSignature,
} from "../src/engine/difficulty";
import {
  calibratedBank,
  dailyPuzzles,
  practicePuzzle,
  puzzleBank,
  rebalanceStart,
} from "../src/engine/puzzles";
import { evaluateRule } from "../src/engine/rules";
import { decodeChallenge, encodeChallenge } from "../src/engine/challenges";
import { defaultSave, parseSave } from "../src/engine/storage";
import { newRun, submitGuess, totalScore } from "../src/engine/game";
import type { Rule, Difficulty } from "../src/engine/types";
const sets = new Map<string, Set<string>>();
function matching(rules: Rule[]) {
  const masks = rules
    .map((rule) => {
      const key = JSON.stringify(rule);
      if (!sets.has(key))
        sets.set(
          key,
          new Set(commonWords.filter((word) => evaluateRule(word, rule))),
        );
      return sets.get(key)!;
    })
    .sort((a, b) => a.size - b.size);
  return [...masks[0]].filter((word) => masks.every((mask) => mask.has(word)));
}
describe("calibrated content and compatibility", () => {
  it("independently verifies every future puzzle against measurable difficulty gates", () => {
    const signatures = new Set<string>();
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(calibratedBank.puzzles[d]).toHaveLength(calibratedBank.days);
      for (const p of calibratedBank.puzzles[d]) {
        const solutions = matching(p.rules);
        expect(qualityIssues(p.rules, solutions, d), p.id).toEqual([]);
        expect(
          difficultyMetrics(p.rules, solutions).estimatedDifficulty,
          p.id,
        ).toBe(d);
        expect(solutions.length, p.id).toBe(p.commonCount);
        expect(
          p.solutions.every((word) => isWord(word) && solutions.includes(word)),
        ).toBe(true);
        expect(signatures.has(puzzleSignature(p.rules))).toBe(false);
        signatures.add(puzzleSignature(p.rules));
      }
    }
  }, 30000);
  it("uses short familiar and structurally varied Warm-Ups rather than rule count alone", () => {
    const structures = new Set<string>();
    for (const p of calibratedBank.puzzles.easy) {
      const answers = matching(p.rules);
      expect(
        answers.every((word) => word.length >= 4 && word.length <= 6),
      ).toBe(true);
      expect(
        answers.filter((word) => commonWords.indexOf(word) < 2000),
      ).toHaveLength(difficultyMetrics(p.rules, answers).familiarTop2000);
      expect(
        difficultyMetrics(p.rules, answers).familiarTop2000,
      ).toBeGreaterThanOrEqual(5);
      structures.add(
        p.rules
          .map((rule) => rule.type)
          .sort()
          .join(),
      );
    }
    expect(structures.size).toBeGreaterThanOrEqual(12);
  });
  it("preserves historical date definitions, and starts the new schedule at the explicit cutoff", () => {
    expect(rebalanceStart).toBe("2026-11-01");
    for (let day = 0; day < 31; day++) {
      const date = new Date(Date.UTC(2026, 9, 1 + day))
        .toISOString()
        .slice(0, 10);
      const actual = dailyPuzzles(date);
      for (const [i, d] of (["easy", "medium", "hard"] as const).entries())
        expect(actual[i]).toEqual({
          ...puzzleBank.puzzles[d][day],
          id: `daily:${date}:${i}`,
        });
    }
    expect(dailyPuzzles(rebalanceStart)[0].rules).toEqual(
      calibratedBank.puzzles.easy[0].rules,
    );
    for (let day = 0; day < calibratedBank.days; day++) {
      const date = new Date(Date.UTC(2026, 10, 1 + day))
        .toISOString()
        .slice(0, 10);
      expect(dailyPuzzles(date).map((p) => p.rules)).toEqual(
        (["easy", "medium", "hard"] as Difficulty[]).map(
          (d) => calibratedBank.puzzles[d][day].rules,
        ),
      );
    }
  });
  it("keeps an existing saved long-word run intact during and after the update", () => {
    const run = newRun(
      "daily:2026-10-31",
      "2026-10-31",
      "daily",
      dailyPuzzles("2026-10-31"),
    );
    run.rounds[0] = submitGuess(run.rounds[0], "cat").round;
    const save = defaultSave();
    save.settings.theme = "light";
    save.runs[run.id] = run;
    const loaded = parseSave(JSON.stringify(save));
    const restored = loaded.runs[run.id].rounds[0];
    expect(restored.guesses).toEqual(run.rounds[0].guesses);
    expect(restored.status).toBe(run.rounds[0].status);
    expect(restored.hint).toBe(run.rounds[0].hint);
    for (const key of [
      "id",
      "rules",
      "solutions",
      "difficulty",
      "commonCount",
    ] as const)
      expect(restored.puzzle[key]).toEqual(run.rounds[0].puzzle[key]);
    expect(loaded.runs[run.id].rounds[0].guesses).toHaveLength(1);
    expect(loaded.settings.theme).toBe("light");
  });
  it("uses verified deterministic calibrated pools for practice and out-of-bank dates", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      expect(practicePuzzle(d, 2)).toEqual(practicePuzzle(d, 2));
      expect(practicePuzzle(d, 2).rules).toEqual(
        calibratedBank.puzzles[d][2].rules,
      );
      expect(practicePuzzle(d, 2).rules).not.toEqual(
        practicePuzzle(d, 3).rules,
      );
    }
    expect(dailyPuzzles("2040-01-01")).toEqual(dailyPuzzles("2040-01-01"));
    for (const p of dailyPuzzles("2040-01-01"))
      expect(qualityIssues(p.rules, matching(p.rules), p.difficulty)).toEqual(
        [],
      );
  });
  it("does not reinterpret scoring tiers of old friend links", () => {
    const rules: Rule[] = [
      { type: "length", value: 5 },
      { type: "starts", value: "b" },
      { type: "contains", value: "r" },
    ];
    const old = decodeChallenge(
      btoa(JSON.stringify({ v: 1, r: rules }))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, ""),
    );
    const modern = decodeChallenge(encodeChallenge(rules));
    expect(old.difficulty).toBe("medium");
    expect(modern.difficulty).toBe("easy");
    expect(modern.rules).toEqual(old.rules);
    const run = newRun("old-challenge", "2026-10-31", "challenge", [old]);
    run.rounds[0] = submitGuess(run.rounds[0], "bring").round;
    expect(totalScore(run)).toBe(150);
  });
  it("rejects misleading difficulty assignments and inappropriate Warm-Up properties", () => {
    const historical = puzzleBank.puzzles.easy[30];
    expect(
      qualityIssues(
        historical.rules,
        commonSolutions(historical.rules),
        "easy",
      ),
    ).toContain("warm-up requires 4–6 letter solutions");
    const hard = calibratedBank.puzzles.hard[0];
    expect(
      qualityIssues(hard.rules, matching(hard.rules), "easy").length,
    ).toBeGreaterThan(0);
    expect(
      qualityIssues(calibratedBank.puzzles.easy[0].rules, [], "easy"),
    ).toContain("invalid or missing solutions");
  });
  it("retains every definition in the complete originally published bank", () => {
    expect(
      createHash("sha256").update(JSON.stringify(puzzleBank)).digest("hex"),
    ).toBe("ab9caa67aa798bbd58c65c4bfeab5785216b3a28ff08f8ccac6bcc4d59daefde");
  });
});
