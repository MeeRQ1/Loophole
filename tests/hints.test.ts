import { describe, expect, it } from "vitest";
import { getNudge } from "../src/engine/hints";
import {
  newRound,
  scoreRound,
  submitGuess,
  useNudge as applyNudge,
} from "../src/engine/game";
import { defaultSave, parseSave } from "../src/engine/storage";
import type { Puzzle } from "../src/engine/types";

const freeStart: Puzzle = {
  id: "hint-free-start",
  difficulty: "easy",
  commonCount: 10,
  rules: [
    { type: "length", value: 4 },
    { type: "contains", value: "a" },
    { type: "ends", value: "r" },
  ],
  solutions: ["star", "bear", "gear"],
};
const fixedStart: Puzzle = {
  id: "hint-fixed-start",
  difficulty: "hard",
  commonCount: 5,
  rules: [
    { type: "length", value: 6 },
    { type: "starts", value: "b" },
    { type: "ends", value: "r" },
    { type: "vowels", value: 2 },
    { type: "adjacent" },
  ],
  solutions: ["bitter", "butter", "banner"],
};
describe("verified, informative Nudges", () => {
  it("retains first-letter wording where the rulebook has not already revealed it", () => {
    expect(getNudge(freeStart)).toBe(
      "One possible answer begins with S. Your word can start differently.",
    );
  });
  it("does not repeat an explicit starting or ending letter", () => {
    expect(getNudge(fixedStart)).toBe(
      "One possible answer has I as its second letter. Your answer may use a different letter.",
    );
  });
  it("recognizes fixed starts implied by the common solution pool", () => {
    const puzzle: Puzzle = {
      id: "hint-implied-start",
      difficulty: "hard",
      commonCount: 4,
      rules: [
        { type: "length", value: 4 },
        { type: "sequence", value: "qu" },
        { type: "contains", value: "i" },
      ],
      solutions: ["quit", "quip", "quiz"],
    };
    expect(getNudge(puzzle)).not.toContain("begins with Q");
    expect(getNudge(puzzle)).toContain("ends with T");
  });
  it("skips a precise position already shown to the player", () => {
    const puzzle: Puzzle = {
      ...fixedStart,
      rules: [
        ...fixedStart.rules,
        { type: "position", value: "i", position: 2 },
      ],
      solutions: ["bitter"],
    };
    expect(getNudge(puzzle)).not.toContain("second letter");
  });
  it("uses dictionary-verified examples and safely rejects unavailable clues", () => {
    expect(getNudge({ ...freeStart, solutions: ["zzzz", "bear"] })).toContain(
      "begins with B",
    );
    expect(getNudge({ ...freeStart, solutions: ["zzzz"] })).toContain(
      "no verified Nudge",
    );
    expect(
      getNudge({ ...freeStart, rules: [{ type: "length", value: 99 }] }),
    ).toContain("no verified Nudge");
  });
  it("keeps the hint stable across save/reload without changing the save schema", () => {
    let round = applyNudge(newRound(fixedStart));
    const original = getNudge(round.puzzle);
    const save = defaultSave();
    save.runs["practice-hint"] = {
      id: "practice-hint",
      date: "2026-10-31",
      mode: "practice",
      current: 0,
      rounds: [round],
    };
    round = parseSave(JSON.stringify(save)).runs["practice-hint"].rounds[0];
    expect(round.hint).toBe(true);
    expect(getNudge(round.puzzle)).toBe(original);
    expect(getNudge({ ...round.puzzle, id: "another-id" })).toBe(original);
  });
  it("applies the unchanged scoring penalty once and accepts another valid answer", () => {
    let round = applyNudge(newRound(fixedStart));
    round = applyNudge(round);
    round = submitGuess(round, "butter").round;
    expect(round.status).toBe("solved");
    expect(scoreRound(round)).toBe(190);
    expect(round.guesses).toHaveLength(1);
  });
});
