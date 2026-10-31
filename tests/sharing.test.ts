import { describe, it, expect } from "vitest";
import { shareText } from "../src/engine/sharing";
import { dailyPuzzles } from "../src/engine/puzzles";
import { newRun, submitGuess } from "../src/engine/game";
describe("share results", () => {
  it("uses real line breaks and spoiler-free actual scores", () => {
    const run = newRun(
      "daily:2026-10-31",
      "2026-10-31",
      "daily",
      dailyPuzzles("2026-10-31"),
    );
    run.rounds = run.rounds.map(
      (r) => submitGuess(r, r.puzzle.solutions[0]).round,
    );
    const text = shareText(run, 1);
    expect(text.split("\n").length).toBeGreaterThan(8);
    expect(text).not.toContain("\\n");
    expect(text).toContain("Score: 500/500");
    expect(text).toContain("Streak: 1 day");
    for (const r of run.rounds)
      expect(text.toLowerCase()).not.toContain(r.guesses[0].word);
  });
});
