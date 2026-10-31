import { describe, expect, it } from "vitest";
import type { Puzzle, Save } from "../src/engine/types";
import {
  advanceRun,
  isComplete,
  newRound,
  newRun,
  scoreRound,
  submitGuess,
  totalScore,
  useNudge as applyNudge,
} from "../src/engine/game";
import { getStats, updateAchievements } from "../src/engine/stats";
import { defaultSave } from "../src/engine/storage";
import { shareText } from "../src/engine/sharing";
const puzzle: Puzzle = {
  id: "test",
  difficulty: "hard",
  rules: [
    { type: "length", value: 6 },
    { type: "starts", value: "b" },
    { type: "ends", value: "r" },
    { type: "vowels", value: 2 },
    { type: "adjacent" },
  ],
  solutions: ["bitter", "butter"],
  commonCount: 2,
};
const wrong = ["apple", "house", "chair", "train", "world", "stone"];
function solved(difficulty: Puzzle["difficulty"] = "hard") {
  return submitGuess(newRound({ ...puzzle, difficulty }), "butter").round;
}
function completed(date: string, mode: "daily" | "archive" = "daily") {
  const run = newRun(`${mode}:${date}`, date, mode, [puzzle, puzzle, puzzle]);
  return {
    ...run,
    rounds: [solved("easy"), solved("medium"), solved("hard")],
    current: 2,
  };
}
describe("guess validation and completion", () => {
  it("accepts multiple legitimate solutions, normalizing case", () => {
    expect(submitGuess(newRound(puzzle), " BITTER ").round.status).toBe(
      "solved",
    );
    expect(submitGuess(newRound(puzzle), "BUTTER").round.status).toBe("solved");
  });
  it("does not spend guesses on invalid characters, lengths or unknown words", () => {
    for (const value of ["xyzzzyzz", "hi", "b!tter", "abcdefghijklm"]) {
      const result = submitGuess(newRound(puzzle), value);
      expect(result.error).toBeTruthy();
      expect(result.round.guesses).toHaveLength(0);
    }
  });
  it("spends one attempt on real incorrect words and rejects duplicates", () => {
    const first = submitGuess(newRound(puzzle), "apple");
    expect(first.error).toBeUndefined();
    expect(first.round.guesses).toHaveLength(1);
    expect(first.round.guesses[0].passes).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
    const duplicate = submitGuess(first.round, "APPLE");
    expect(duplicate.error).toMatch(/already/);
    expect(duplicate.round).toBe(first.round);
  });
  it("fails after six legitimate incorrect guesses and cannot be resubmitted", () => {
    let round = newRound(puzzle);
    for (const word of wrong) {
      const result = submitGuess(round, word);
      expect(result.error).toBeUndefined();
      round = result.round;
    }
    expect(round.status).toBe("failed");
    expect(scoreRound(round)).toBe(0);
    expect(submitGuess(round, "butter").round).toBe(round);
  });
  it("guards completed rounds and advancement past unresolved rounds", () => {
    const run = newRun("daily:2026-10-31", "2026-10-31", "daily", [
      puzzle,
      puzzle,
      puzzle,
    ]);
    expect(advanceRun(run)).toBe(run);
    const one = { ...run, rounds: [solved(), ...run.rounds.slice(1)] };
    expect(advanceRun(one).current).toBe(1);
    const finished = completed("2026-10-31");
    expect(isComplete(finished)).toBe(true);
    const stamped = advanceRun(finished);
    expect(stamped.completedAt).toBeTruthy();
    expect(advanceRun(stamped)).toBe(stamped);
  });
});
describe("transparent score and nudge rules", () => {
  it("makes 500 a perfect daily and applies exact guess and hint penalties", () => {
    expect(totalScore(completed("2026-10-31"))).toBe(500);
    for (const [difficulty, maximum, penalty, hint] of [
      ["easy", 100, 12, 25],
      ["medium", 150, 18, 35],
      ["hard", 250, 30, 60],
    ] as const) {
      let round = newRound({ ...puzzle, difficulty });
      round = submitGuess(round, "apple").round;
      round = applyNudge(round);
      expect(applyNudge(round)).toBe(round);
      round = submitGuess(round, "butter").round;
      expect(scoreRound(round)).toBe(maximum - penalty - hint);
      expect(applyNudge(round)).toBe(round);
    }
  });
  it("applies successful minimum score at the sixth attempt with a nudge", () => {
    for (const [difficulty, minimum] of [
      ["easy", 20],
      ["medium", 25],
      ["hard", 40],
    ] as const) {
      let round = applyNudge(newRound({ ...puzzle, difficulty }));
      for (const word of wrong.slice(0, 5))
        round = submitGuess(round, word).round;
      round = submitGuess(round, "butter").round;
      expect(round.status).toBe("solved");
      expect(scoreRound(round)).toBe(minimum);
    }
  });
});
describe("statistics, streaks and achievements", () => {
  function saveWith(...dates: string[]): Save {
    const save = defaultSave();
    dates.forEach((date) => {
      const run = completed(date);
      save.runs[run.id] = run;
    });
    return save;
  }
  it("counts consecutive completed UTC days once and handles the current day", () => {
    const save = saveWith("2026-10-29", "2026-10-30", "2026-10-31");
    expect(getStats(save, "2026-10-31").currentStreak).toBe(3);
    expect(getStats(save, "2026-11-01").currentStreak).toBe(3);
    expect(getStats(save, "2026-11-02").currentStreak).toBe(0);
    expect(getStats(save).longestStreak).toBe(3);
  });
  it("counts completion regardless of success and excludes archive and practice from streaks", () => {
    const save = saveWith("2026-10-29");
    const archive = completed("2026-10-30", "archive");
    save.runs[archive.id] = archive;
    const practice = {
      ...newRun("practice:1", "2026-10-31", "practice", [puzzle]),
      rounds: [solved()],
    };
    save.runs[practice.id] = practice;
    expect(getStats(save, "2026-10-31").currentStreak).toBe(0);
    expect(getStats(save).practiceCompleted).toBe(1);
    expect(getStats(save).dailyCompleted).toBe(1);
    let failed = newRound(puzzle);
    wrong.forEach((word) => {
      failed = submitGuess(failed, word).round;
    });
    const run = completed("2026-10-30");
    run.rounds = [failed, failed, failed];
    save.runs[run.id] = run;
    expect(getStats(save, "2026-10-31").currentStreak).toBe(2);
  });
  it("keeps overall performance inclusive of practice and challenges and excludes archive", () => {
    const save = saveWith("2026-10-31");
    const practice = newRun("practice:1", "2026-10-31", "practice", [puzzle]);
    practice.rounds[0] = submitGuess(
      submitGuess(practice.rounds[0], "apple").round,
      "butter",
    ).round;
    const challenge = newRun("challenge:1", "2026-10-31", "challenge", [
      puzzle,
    ]);
    wrong.forEach((word) => {
      challenge.rounds[0] = submitGuess(challenge.rounds[0], word).round;
    });
    const archive = completed("2026-10-30", "archive");
    for (const run of [practice, challenge, archive]) save.runs[run.id] = run;
    const stats = getStats(save, "2026-10-31");
    expect(stats.totalRoundsSolved).toBe(4);
    expect(stats.totalRoundsFailed).toBe(1);
    expect(stats.overallWinRate).toBe(80);
    expect(stats.overallAverageAttempts).toBe(1.25);
    expect(stats.totalPointsAllModes).toBe(720);
    expect(stats.totalPoints).toBe(500);
    expect(stats.roundsSolved).toBe(3);
    expect(stats.roundsFailed).toBe(0);
  });
  it("stores real achievement dates once without duplicating points", () => {
    const save = saveWith("2026-10-31");
    const updated = updateAchievements(save, "2026-10-31T12:00:00Z");
    expect(updated.achievements.perfect).toBe("2026-10-31T12:00:00Z");
    const again = updateAchievements(updated, "2026-11-01T12:00:00Z");
    expect(again.achievements.perfect).toBe(updated.achievements.perfect);
    expect(getStats(again).totalPoints).toBe(500);
  });
  it("makes spoiler-free sharing from actual results", () => {
    const text = shareText(completed("2026-10-31"), 3);
    expect(text).toContain("500/500");
    expect(text).toContain("Streak: 3 days");
    expect(text.toLowerCase()).not.toContain("butter");
    expect(text).toContain("https://meerq1.github.io/Loophole/");
  });
});
