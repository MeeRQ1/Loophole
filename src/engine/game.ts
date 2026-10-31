import type { Mode, Puzzle, Round, Run } from "./types";
import { isWord, normalize } from "./dictionary";
import { evaluatePuzzle } from "./rules";

export const MAX_GUESSES = 6;
const SCORES = {
  easy: { max: 100, guess: 12, hint: 25, min: 20 },
  medium: { max: 150, guess: 18, hint: 35, min: 25 },
  hard: { max: 250, guess: 30, hint: 60, min: 40 },
};
export function newRound(puzzle: Puzzle): Round {
  return { puzzle, guesses: [], hint: false, status: "playing" };
}
export function newRun(
  id: string,
  date: string,
  mode: Mode,
  puzzles: Puzzle[],
): Run {
  return { id, date, mode, rounds: puzzles.map(newRound), current: 0 };
}
export function submitGuess(
  round: Round,
  input: string,
): { round: Round; error?: string } {
  if (round.status !== "playing")
    return { round, error: "This round is already finished." };
  const word = normalize(input);
  if (!/^[a-z]{3,12}$/.test(word))
    return {
      round,
      error:
        "Use an English word of 3–12 letters, without spaces or punctuation.",
    };
  if (round.guesses.some((guess) => guess.word === word))
    return {
      round,
      error: "You already tried that word. Try a different one.",
    };
  if (!isWord(word))
    return {
      round,
      error: "That word isn’t in our dictionary. No attempt used.",
    };
  const passes = evaluatePuzzle(word, round.puzzle.rules);
  const guesses = [...round.guesses, { word, passes }];
  return {
    round: {
      ...round,
      guesses,
      status: passes.every(Boolean)
        ? "solved"
        : guesses.length >= MAX_GUESSES
          ? "failed"
          : "playing",
    },
  };
}
export function useNudge(round: Round): Round {
  return round.status === "playing" && !round.hint
    ? { ...round, hint: true }
    : round;
}
export function scoreRound(round: Round): number {
  if (round.status !== "solved") return 0;
  const scoring = SCORES[round.puzzle.difficulty];
  return Math.max(
    scoring.min,
    scoring.max -
      scoring.guess * Math.max(0, round.guesses.length - 1) -
      (round.hint ? scoring.hint : 0),
  );
}
export function maxRoundScore(round: Round): number {
  if (round.status !== "playing") return scoreRound(round);
  const scoring = SCORES[round.puzzle.difficulty];
  return Math.max(
    scoring.min,
    scoring.max -
      scoring.guess * round.guesses.length -
      (round.hint ? scoring.hint : 0),
  );
}
export function hintPenalty(round: Round): number {
  return SCORES[round.puzzle.difficulty].hint;
}
export function totalScore(run: Run): number {
  return run.rounds.reduce((total, round) => total + scoreRound(round), 0);
}
export function isComplete(run: Run): boolean {
  return (
    run.rounds.length > 0 &&
    run.rounds.every((round) => round.status !== "playing")
  );
}
export function advanceRun(run: Run): Run {
  if (run.rounds[run.current]?.status === "playing") return run;
  if (isComplete(run))
    return run.completedAt
      ? run
      : { ...run, completedAt: new Date().toISOString() };
  return { ...run, current: Math.min(run.current + 1, run.rounds.length - 1) };
}
