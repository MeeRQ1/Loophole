import type { Difficulty, Run, Save } from "./types";
import { isComplete, scoreRound, totalScore } from "./game";

const DAY = 86_400_000;
export function getStats(
  save: Save,
  today = new Date().toISOString().slice(0, 10),
) {
  const runs = Object.values(save.runs);
  const daily = runs.filter((run) => run.mode === "daily");
  const completed = daily.filter(isComplete);
  const officialRounds = daily.flatMap((run) => run.rounds);
  const allRounds = runs
    .filter((run) => run.mode !== "archive")
    .flatMap((run) => run.rounds);
  const allSolved = allRounds.filter((round) => round.status === "solved");
  const allFailed = allRounds.filter((round) => round.status === "failed");
  const solved = officialRounds.filter((round) => round.status === "solved");
  const failed = officialRounds.filter((round) => round.status === "failed");
  const dates = [...new Set(completed.map((run) => run.date))].sort();
  let longestStreak = 0,
    chain = 0,
    previous = 0;
  for (const day of dates) {
    const epoch = Date.parse(`${day}T00:00:00Z`);
    chain = epoch - previous === DAY ? chain + 1 : 1;
    longestStreak = Math.max(longestStreak, chain);
    previous = epoch;
  }
  const todayEpoch = Date.parse(`${today}T00:00:00Z`);
  let cursor = dates.includes(today) ? todayEpoch : todayEpoch - DAY;
  let currentStreak = 0;
  const dateSet = new Set(dates);
  while (dateSet.has(new Date(cursor).toISOString().slice(0, 10))) {
    currentStreak++;
    cursor -= DAY;
  }
  const practiceRounds = runs
    .filter((run) => run.mode === "practice")
    .flatMap((run) => run.rounds)
    .filter((round) => round.status !== "playing");
  const practiceByDifficulty = Object.fromEntries(
    (["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => {
      const rounds = practiceRounds.filter(
        (round) => round.puzzle.difficulty === difficulty,
      );
      return [
        difficulty,
        {
          completed: rounds.length,
          solved: rounds.filter((round) => round.status === "solved").length,
          bestScore: Math.max(0, ...rounds.map(scoreRound)),
        },
      ];
    }),
  ) as Record<
    Difficulty,
    { completed: number; solved: number; bestScore: number }
  >;
  const distribution = Array.from(
    { length: 6 },
    (_, index) =>
      solved.filter((round) => round.guesses.length === index + 1).length,
  );
  return {
    dailyStarted: daily.length,
    dailyCompleted: completed.length,
    fullySolved: completed.filter((run) =>
      run.rounds.every((round) => round.status === "solved"),
    ).length,
    roundsSolved: solved.length,
    roundsFailed: failed.length,
    winRate:
      solved.length + failed.length
        ? Math.round((solved.length / (solved.length + failed.length)) * 100)
        : 0,
    currentStreak,
    longestStreak,
    perfectRuns: completed.filter((run) => totalScore(run) === 500).length,
    averageAttempts: solved.length
      ? solved.reduce((sum, round) => sum + round.guesses.length, 0) /
        solved.length
      : 0,
    totalPoints: daily.reduce((sum, run) => sum + totalScore(run), 0),
    bestScore: Math.max(0, ...completed.map(totalScore)),
    hintsUsed: allRounds.filter((round) => round.hint).length,
    practiceCompleted: practiceRounds.length,
    practiceByDifficulty,
    distribution,
    recent: [...completed]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30),
    achievementsEarned: Object.keys(save.achievements).length,
    hardSolved: allRounds.filter(
      (round) =>
        round.status === "solved" && round.puzzle.difficulty === "hard",
    ).length,
    challengeSolved: runs.filter(
      (run) =>
        run.mode === "challenge" &&
        isComplete(run) &&
        run.rounds.every((round) => round.status === "solved"),
    ).length,
    totalRoundsSolved: allSolved.length,
    totalRoundsFailed: allFailed.length,
    overallWinRate:
      allSolved.length + allFailed.length
        ? Math.round(
            (allSolved.length / (allSolved.length + allFailed.length)) * 100,
          )
        : 0,
    overallAverageAttempts: allSolved.length
      ? allSolved.reduce((sum, round) => sum + round.guesses.length, 0) /
        allSolved.length
      : 0,
    totalPointsAllModes: allRounds.reduce(
      (sum, round) => sum + scoreRound(round),
      0,
    ),
    oneShots: allRounds.filter(
      (round) => round.status === "solved" && round.guesses.length === 1,
    ).length,
    unaidedRuns: completed.filter((run) =>
      run.rounds.every((round) => round.status === "solved" && !round.hint),
    ).length,
  };
}
export type Stats = ReturnType<typeof getStats>;
export const ACHIEVEMENTS: {
  id: string;
  name: string;
  description: string;
  symbol: string;
  target: number;
  progress: (stats: Stats) => number;
}[] = [
  {
    id: "first",
    name: "First Crack",
    description: "Solve your first puzzle.",
    symbol: "◒",
    target: 1,
    progress: (s) => s.totalRoundsSolved,
  },
  {
    id: "sweep",
    name: "Clean Sweep",
    description: "Solve all three rounds in a Daily Run.",
    symbol: "✦",
    target: 1,
    progress: (s) => s.fullySolved,
  },
  {
    id: "one",
    name: "One-Shot Wonder",
    description: "Solve a puzzle on your first attempt.",
    symbol: "①",
    target: 1,
    progress: (s) => s.oneShots,
  },
  {
    id: "perfect",
    name: "Perfect Run",
    description: "Earn 500 points in a Daily Run.",
    symbol: "✶",
    target: 1,
    progress: (s) => s.perfectRuns,
  },
  {
    id: "unaided",
    name: "No Help Needed",
    description: "Solve a full Daily Run without nudges.",
    symbol: "◇",
    target: 1,
    progress: (s) => s.unaidedRuns,
  },
  {
    id: "three",
    name: "Three-Day Streak",
    description: "Complete three consecutive UTC Daily Runs.",
    symbol: "Ⅲ",
    target: 3,
    progress: (s) => s.longestStreak,
  },
  {
    id: "week",
    name: "Weekly Regular",
    description: "Reach a seven-day completion streak.",
    symbol: "☷",
    target: 7,
    progress: (s) => s.longestStreak,
  },
  {
    id: "month",
    name: "Dedicated Solver",
    description: "Reach a 30-day completion streak.",
    symbol: "☼",
    target: 30,
    progress: (s) => s.longestStreak,
  },
  {
    id: "century",
    name: "Century Club",
    description: "Solve 100 rounds across game modes.",
    symbol: "∞",
    target: 100,
    progress: (s) => s.totalRoundsSolved,
  },
  {
    id: "hard",
    name: "Rule Breaker",
    description: "Solve 25 hard puzzles.",
    symbol: "⌘",
    target: 25,
    progress: (s) => s.hardSolved,
  },
  {
    id: "practice",
    name: "Practice Makes Perfect",
    description: "Finish 50 practice puzzles.",
    symbol: "↻",
    target: 50,
    progress: (s) => s.practiceCompleted,
  },
  {
    id: "friend",
    name: "Challenge Accepted",
    description: "Solve a shared friend challenge.",
    symbol: "↗",
    target: 1,
    progress: (s) => s.challengeSolved,
  },
];
export const achievements = ACHIEVEMENTS;
export function updateAchievements(
  save: Save,
  now = new Date().toISOString(),
): Save {
  const stats = getStats(save);
  const unlocked = { ...save.achievements };
  for (const achievement of ACHIEVEMENTS) {
    if (
      !unlocked[achievement.id] &&
      achievement.progress(stats) >= achievement.target
    )
      unlocked[achievement.id] = now;
  }
  return { ...save, achievements: unlocked };
}
export function recentRuns(save: Save, mode: Run["mode"]) {
  return Object.values(save.runs)
    .filter((run) => run.mode === mode)
    .slice(-10)
    .reverse();
}
