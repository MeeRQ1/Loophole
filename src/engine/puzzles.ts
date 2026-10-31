import bank from "../data/puzzles.json";
import type { Difficulty, Puzzle } from "./types";

export const scheduleStart = "2026-10-01";
export const puzzleBank = bank as {
  version: number;
  start: string;
  days: number;
  puzzles: Record<Difficulty, Puzzle[]>;
};
const DAY = 86_400_000;
export function dateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
export function dayNumber(date: string): number {
  return (
    Math.floor(
      (Date.parse(`${date}T00:00:00Z`) -
        Date.parse(`${scheduleStart}T00:00:00Z`)) /
        DAY,
    ) + 1
  );
}
function hash(value: string): number {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
/** The published year is immutable. Later dates use a deterministic verified pool until an appended schedule ships. */
export function dailyPuzzles(date: string): Puzzle[] {
  const day = dayNumber(date) - 1;
  return (["easy", "medium", "hard"] as const).map((difficulty, i) => {
    const pool = puzzleBank.puzzles[difficulty];
    const index =
      day >= 0 && day < puzzleBank.days
        ? day
        : hash(`${date}:v1:${i}`) % pool.length;
    return { ...pool[index], id: `daily:${date}:${i}` };
  });
}
export function practicePuzzle(
  difficulty: Difficulty,
  seed: number | string,
): Puzzle {
  const pool = puzzleBank.puzzles[difficulty];
  // Consecutive numeric seeds traverse the full pool without immediate repetition.
  const index =
    typeof seed === "number"
      ? ((seed % pool.length) + pool.length) % pool.length
      : hash(seed) % pool.length;
  return { ...pool[index], id: `practice:${difficulty}:${seed}` };
}
