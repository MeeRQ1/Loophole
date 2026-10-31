import legacy from "../data/puzzles.json";
import calibrated from "../data/puzzles-v2.json";
import type { Difficulty, Puzzle } from "./types";

type PuzzleBank = {
  version: number;
  start: string;
  days: number;
  puzzles: Record<Difficulty, Puzzle[]>;
};
/** The complete original bank is retained as the immutable compatibility record. */
export const puzzleBank = legacy as PuzzleBank;
export const calibratedBank = calibrated as PuzzleBank;
export const scheduleStart = "2026-10-01";
export const rebalanceStart = "2026-11-01";
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
/** Past dates stay exact. Existing saves embed their own puzzle and never get replaced here. */
export function dailyPuzzles(date: string): Puzzle[] {
  const bank = date >= rebalanceStart ? calibratedBank : puzzleBank;
  const day = Math.floor(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${bank.start}T00:00:00Z`)) /
      DAY,
  );
  return (["easy", "medium", "hard"] as const).map((difficulty, index) => {
    const pool = bank.puzzles[difficulty];
    const position =
      day >= 0 && day < bank.days
        ? day
        : hash(`${date}:v${bank.version}:${index}`) % pool.length;
    return { ...pool[position], id: `daily:${date}:${index}` };
  });
}
/** Practice immediately uses measured content, independently of historical Daily Run compatibility. */
export function practicePuzzle(
  difficulty: Difficulty,
  seed: number | string,
): Puzzle {
  const pool = calibratedBank.puzzles[difficulty];
  const index =
    typeof seed === "number"
      ? ((seed % pool.length) + pool.length) % pool.length
      : hash(seed) % pool.length;
  return { ...pool[index], id: `practice:${difficulty}:${seed}` };
}
