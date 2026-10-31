import type { Puzzle, Round, Run, Save, Settings } from "./types";
import { newRound, submitGuess, isComplete } from "./game";
import { isWord } from "./dictionary";
import { evaluatePuzzle, validRule } from "./rules";

export const STORAGE_KEY = "loophole.save.v2";
const LEGACY_KEY = "loophole.save.v1";
let currentIssue: "corrupt" | "unavailable" | null = null;
/** A recoverable issue from the most recent storage operation; no saved values are exposed. */
export function storageIssue(): "corrupt" | "unavailable" | null {
  return currentIssue;
}
function preserveCorrupt(text: string): boolean {
  try {
    // Keep each distinct damaged save. Never overwrite an earlier recovery copy.
    for (let index = 0; index < 100; index++) {
      const key = `${STORAGE_KEY}.recovery${index ? "." + index : ""}`;
      const previous = localStorage.getItem(key);
      if (previous === text) return true;
      if (previous === null) {
        localStorage.setItem(key, text);
        return localStorage.getItem(key) === text;
      }
    }
    return false;
  } catch {
    return false;
  }
}
export function defaultSave(): Save {
  return {
    version: 2,
    runs: {},
    settings: { theme: "dark", contrast: false, motion: true, sound: false },
    onboarding: false,
    achievements: {},
    practiceIndex: 0,
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function validDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}
function validTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length < 40 &&
    Number.isFinite(Date.parse(value))
  );
}
function parsePuzzle(value: unknown): Puzzle {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    value.id.length > 2048 ||
    !["easy", "medium", "hard"].includes(String(value.difficulty)) ||
    !Array.isArray(value.rules) ||
    value.rules.length < 3 ||
    value.rules.length > 5 ||
    !value.rules.every(validRule) ||
    !Array.isArray(value.solutions) ||
    value.solutions.length < 1 ||
    value.solutions.length > 100 ||
    !Number.isInteger(value.commonCount) ||
    Number(value.commonCount) < 1
  )
    throw new Error("Invalid saved puzzle.");
  const rules = value.rules;
  if (new Set(rules.map((rule) => JSON.stringify(rule))).size !== rules.length)
    throw new Error("Duplicate saved rules.");
  const solutions = value.solutions;
  if (
    !solutions.every(
      (word) =>
        typeof word === "string" &&
        isWord(word) &&
        evaluatePuzzle(word, rules).every(Boolean),
    )
  )
    throw new Error("Invalid saved solutions.");
  return {
    id: value.id,
    rules,
    solutions: solutions as string[],
    difficulty: value.difficulty as Puzzle["difficulty"],
    commonCount: Number(value.commonCount),
  };
}
function parseRound(value: unknown): Round {
  if (
    !record(value) ||
    !Array.isArray(value.guesses) ||
    value.guesses.length > 6 ||
    typeof value.hint !== "boolean"
  )
    throw new Error("Invalid saved round.");
  let round = newRound(parsePuzzle(value.puzzle));
  for (const guess of value.guesses) {
    if (!record(guess) || typeof guess.word !== "string")
      throw new Error("Invalid saved guess.");
    const result = submitGuess(round, guess.word);
    if (result.error) throw new Error("Invalid saved guess sequence.");
    round = result.round;
  }
  return { ...round, hint: value.hint };
}
function parseRun(value: unknown, key: string): Run {
  if (
    !record(value) ||
    value.id !== key ||
    key.length > 2048 ||
    ["__proto__", "constructor", "prototype"].includes(key) ||
    !validDate(value.date) ||
    !["daily", "archive", "practice", "challenge"].includes(
      String(value.mode),
    ) ||
    !Array.isArray(value.rounds) ||
    value.rounds.length < 1 ||
    value.rounds.length > 3
  )
    throw new Error("Invalid saved run.");
  if (
    (value.mode === "daily" || value.mode === "archive") &&
    value.rounds.length !== 3
  )
    throw new Error("Daily runs need three rounds.");
  const rounds = value.rounds.map(parseRound);
  // Later rounds cannot have been played while an earlier round remains unresolved.
  const firstPlaying = rounds.findIndex((round) => round.status === "playing");
  if (
    firstPlaying >= 0 &&
    rounds
      .slice(firstPlaying + 1)
      .some((round) => round.guesses.length || round.hint)
  )
    throw new Error("Invalid saved progression.");
  const requested = Number.isInteger(value.current) ? Number(value.current) : 0;
  const current = Math.max(
    0,
    Math.min(requested, firstPlaying < 0 ? rounds.length - 1 : firstPlaying),
  );
  const run: Run = {
    id: key,
    date: value.date,
    mode: value.mode as Run["mode"],
    rounds,
    current,
  };
  if (isComplete(run))
    run.completedAt = validTimestamp(value.completedAt)
      ? value.completedAt
      : `${value.date}T23:59:59.000Z`;
  return run;
}
/** Strictly reconstruct game outcomes; serialized pass flags and statuses are never trusted. */
export function parseSave(text: string): Save {
  if (text.length > 12_000_000) throw new Error("The backup is too large.");
  const data: unknown = JSON.parse(text);
  if (
    !record(data) ||
    ![1, 2].includes(Number(data.version)) ||
    !record(data.runs)
  )
    throw new Error("This is not a supported Loophole backup.");
  const save = defaultSave();
  const entries = Object.entries(data.runs);
  if (entries.length > 10_000) throw new Error("Too many saved games.");
  for (const [key, run] of entries) save.runs[key] = parseRun(run, key);
  if (record(data.settings)) {
    const settings = data.settings;
    if (["light", "dark", "system"].includes(String(settings.theme)))
      save.settings.theme = settings.theme as Settings["theme"];
    for (const key of ["contrast", "motion", "sound"] as const)
      if (typeof settings[key] === "boolean")
        save.settings[key] = settings[key];
  }
  save.onboarding = data.onboarding === true;
  if (record(data.achievements))
    for (const [key, timestamp] of Object.entries(data.achievements)) {
      if (/^[a-z]{1,30}$/.test(key) && validTimestamp(timestamp))
        save.achievements[key] = timestamp;
    }
  if (
    Number.isSafeInteger(data.practiceIndex) &&
    Number(data.practiceIndex) >= 0
  )
    save.practiceIndex = Number(data.practiceIndex);
  return save;
}
export function loadSave(): Save {
  currentIssue = null;
  let text: string | null;
  try {
    text =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    currentIssue = "unavailable";
    return defaultSave();
  }
  if (text === null) return defaultSave();
  try {
    return parseSave(text);
  } catch {
    currentIssue = "corrupt";
    preserveCorrupt(text);
    return defaultSave();
  }
}
export function persistSave(save: Save): boolean {
  try {
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous !== null) {
      try {
        parseSave(previous);
      } catch {
        currentIssue = "corrupt";
        // Quota or denied recovery writes must leave the original damaged save untouched.
        if (!preserveCorrupt(previous)) return false;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    if (currentIssue === "unavailable") currentIssue = null;
    return true;
  } catch {
    currentIssue = "unavailable";
    return false;
  }
}
/** Explicit user-requested reset; unrelated applications' browser storage is preserved. */
export function clearSavedData(): boolean {
  try {
    const keys = [STORAGE_KEY, LEGACY_KEY];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && /^loophole\.save\.v2\.recovery(?:\.\d+)?$/.test(key))
        keys.push(key);
    }
    for (const key of new Set(keys)) localStorage.removeItem(key);
    currentIssue = null;
    return true;
  } catch {
    currentIssue = "unavailable";
    return false;
  }
}
function mergeRound(a: Round, b: Round): Round {
  if (a.puzzle.id !== b.puzzle.id) return a;
  // Prefer a resolved branch, then the branch with most progress. Ties use a stable ordering,
  // so two tabs converge without erasing an already completed result.
  const rank = (round: Round) =>
    (round.status === "solved" ? 100 : round.status === "failed" ? 50 : 0) +
    round.guesses.length;
  const [primary, secondary] = [a, b].sort(
    (left, right) =>
      rank(right) - rank(left) ||
      JSON.stringify(left.guesses).localeCompare(JSON.stringify(right.guesses)),
  );
  let merged = primary;
  if (primary.status === "playing") {
    for (const guess of secondary.guesses) {
      if (merged.status !== "playing") break;
      if (!merged.guesses.some((previous) => previous.word === guess.word))
        merged = submitGuess(merged, guess.word).round;
    }
  }
  return { ...merged, hint: a.hint || b.hint };
}
export function mergeSaves(local: Save, remote: Save): Save {
  const runs = { ...local.runs };
  for (const [key, incoming] of Object.entries(remote.runs)) {
    const previous = runs[key];
    if (!previous) {
      runs[key] = incoming;
      continue;
    }
    const rounds = previous.rounds.map((round, index) =>
      incoming.rounds[index]
        ? mergeRound(round, incoming.rounds[index])
        : round,
    );
    const firstPlaying = rounds.findIndex(
      (round) => round.status === "playing",
    );
    const current = Math.min(
      Math.max(previous.current, incoming.current),
      firstPlaying < 0 ? rounds.length - 1 : firstPlaying,
    );
    const completedAt = [previous.completedAt, incoming.completedAt]
      .filter((time): time is string => !!time)
      .sort()[0];
    const run = { ...previous, rounds, current };
    runs[key] = isComplete(run)
      ? { ...run, completedAt: completedAt ?? new Date().toISOString() }
      : run;
  }
  return {
    ...local,
    runs,
    settings: remote.settings,
    onboarding: local.onboarding || remote.onboarding,
    achievements: { ...remote.achievements, ...local.achievements },
    practiceIndex: Math.max(local.practiceIndex, remote.practiceIndex),
  };
}
