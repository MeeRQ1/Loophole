import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSavedData,
  defaultSave,
  loadSave,
  mergeSaves,
  parseSave,
  persistSave,
  storageIssue,
  STORAGE_KEY,
} from "../src/engine/storage";
import {
  advanceRun,
  newRun,
  submitGuess,
  useNudge as applyNudge,
} from "../src/engine/game";
import type { Puzzle, Save } from "../src/engine/types";
import { getStats, updateAchievements } from "../src/engine/stats";
const puzzle: Puzzle = {
  id: "test",
  difficulty: "easy",
  rules: [
    { type: "length", value: 6 },
    { type: "starts", value: "b" },
    { type: "ends", value: "r" },
  ],
  solutions: ["butter", "bitter"],
  commonCount: 2,
};
function partial(): Save {
  const save = defaultSave();
  const run = newRun("daily:2026-10-31", "2026-10-31", "daily", [
    structuredClone(puzzle),
    structuredClone(puzzle),
    structuredClone(puzzle),
  ]);
  run.rounds[0] = applyNudge(submitGuess(run.rounds[0], "apple").round);
  save.runs[run.id] = run;
  return save;
}
describe("save integrity", () => {
  const data = new Map<string, string>();
  beforeEach(() => {
    data.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, text: string) => data.set(key, text),
      removeItem: (key: string) => data.delete(key),
      get length() {
        return data.size;
      },
      key: (index: number) => [...data.keys()][index] ?? null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("loads missing state and round-trips a partial save", () => {
    expect(loadSave()).toEqual(defaultSave());
    const save = partial();
    expect(persistSave(save)).toBe(true);
    expect(loadSave()).toEqual(save);
  });
  it("reconstructs feedback and outcome instead of trusting serialized flags", () => {
    const save = partial();
    const round = save.runs["daily:2026-10-31"].rounds[0];
    round.status = "solved";
    round.guesses[0].passes = [true, true, true];
    const actual = parseSave(JSON.stringify(save)).runs["daily:2026-10-31"]
      .rounds[0];
    expect(actual.status).toBe("playing");
    expect(actual.guesses[0].passes).toEqual([false, false, false]);
    expect(actual.hint).toBe(true);
  });
  it("migrates schema one while preserving progress", () => {
    const save = partial();
    // Schema one predates settings, achievements and practiceIndex. They acquire defaults.
    const legacy = { version: 1, runs: save.runs, onboarding: true };
    data.set("loophole.save.v1", JSON.stringify(legacy));
    const migrated = loadSave();
    expect(migrated.version).toBe(2);
    expect(migrated.runs).toEqual(save.runs);
    expect(migrated.onboarding).toBe(true);
    expect(migrated.settings).toEqual(defaultSave().settings);
    expect(persistSave(migrated)).toBe(true);
    expect(data.has(STORAGE_KEY)).toBe(true);
    expect(data.get("loophole.save.v1")).toBe(JSON.stringify(legacy));
  });
  it("survives unavailable storage and corrupted data", () => {
    data.set(STORAGE_KEY, "{no");
    expect(loadSave()).toEqual(defaultSave());
    expect(storageIssue()).toBe("corrupt");
    expect(data.get(`${STORAGE_KEY}.recovery`)).toBe("{no");
    expect(persistSave(defaultSave())).toBe(true);
    expect(data.get(`${STORAGE_KEY}.recovery`)).toBe("{no");
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(loadSave()).toEqual(defaultSave());
    expect(storageIssue()).toBe("unavailable");
    expect(persistSave(defaultSave())).toBe(false);
  });
  it("preserves distinct damaged saves without replacing the original recovery copy", () => {
    data.set(STORAGE_KEY, "broken first");
    loadSave();
    data.set(STORAGE_KEY, "broken second");
    loadSave();
    expect(data.get(`${STORAGE_KEY}.recovery`)).toBe("broken first");
    expect(data.get(`${STORAGE_KEY}.recovery.1`)).toBe("broken second");
    loadSave();
    expect(data.has(`${STORAGE_KEY}.recovery.2`)).toBe(false);
    expect(persistSave(partial())).toBe(true);
    expect(loadSave()).toEqual(partial());
    expect(storageIssue()).toBeNull();
  });
  it("refuses to overwrite corruption if a recovery copy cannot be retained", () => {
    data.set(STORAGE_KEY, "damaged");
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(loadSave()).toEqual(defaultSave());
    expect(storageIssue()).toBe("corrupt");
    expect(persistSave(defaultSave())).toBe(false);
    expect(data.get(STORAGE_KEY)).toBe("damaged");
  });
  it("preserves in-progress and completed states across UTC midnight without duplicate awards", () => {
    let save = partial();
    expect(persistSave(save)).toBe(true);
    save = loadSave();
    expect(getStats(save, "2026-10-31").dailyStarted).toBe(1);
    expect(getStats(save).dailyCompleted).toBe(0);
    const run = save.runs["daily:2026-10-31"];
    run.rounds = run.rounds.map((round) => submitGuess(round, "butter").round);
    save.runs[run.id] = advanceRun({ ...run, current: 2 });
    save = updateAchievements(save, "2026-10-31T23:59:59Z");
    const points = getStats(save).totalPoints;
    expect(persistSave(save)).toBe(true);
    let restored = loadSave();
    expect(getStats(restored, "2026-11-01").currentStreak).toBe(1);
    expect(getStats(restored).dailyCompleted).toBe(1);
    restored.runs[run.id] = advanceRun(restored.runs[run.id]);
    restored = updateAchievements(restored, "2026-11-01T00:00:01Z");
    expect(getStats(restored).totalPoints).toBe(points);
    expect(getStats(restored).dailyCompleted).toBe(1);
    expect(restored.achievements.first).toBe("2026-10-31T23:59:59Z");
    expect(restored.runs[run.id].rounds[0].hint).toBe(true);
    expect(restored.runs[run.id].rounds[0].guesses).toHaveLength(2);
  });
  it("bases streaks on UTC challenge dates across DST offset changes", () => {
    const save = defaultSave();
    // US fall-back repeats an hour, but never duplicates a UTC challenge day.
    for (const date of ["2026-10-31", "2026-11-01"]) {
      const run = newRun(`daily:${date}`, date, "daily", [
        puzzle,
        puzzle,
        puzzle,
      ]);
      run.rounds = run.rounds.map(
        (round) => submitGuess(round, "butter").round,
      );
      run.current = 2;
      save.runs[run.id] = advanceRun(run);
    }
    const beforeFallback = new Date("2026-11-01T01:30:00-05:00")
      .toISOString()
      .slice(0, 10);
    const afterFallback = new Date("2026-11-01T01:30:00-06:00")
      .toISOString()
      .slice(0, 10);
    expect(beforeFallback).toBe(afterFallback);
    const restored = parseSave(JSON.stringify(save));
    expect(getStats(restored, beforeFallback).currentStreak).toBe(2);
    expect(getStats(restored, afterFallback).currentStreak).toBe(2);
    expect(getStats(restored, "2026-11-03").currentStreak).toBe(0);
  });
  it("clears only Loophole saved data, including recovery and legacy copies", () => {
    data.set(STORAGE_KEY, "damaged");
    loadSave();
    data.set(`${STORAGE_KEY}.recovery.1`, "another damaged value");
    data.set("loophole.save.v1", JSON.stringify({ version: 1, runs: {} }));
    data.set("another-game.progress", "keep");
    expect(storageIssue()).toBe("corrupt");
    expect(clearSavedData()).toBe(true);
    expect(storageIssue()).toBeNull();
    expect([...data.entries()]).toEqual([["another-game.progress", "keep"]]);
    expect(loadSave()).toEqual(defaultSave());
  });
  it("reports a denied reset without crashing", () => {
    vi.stubGlobal("localStorage", {
      get length() {
        throw new Error("denied");
      },
    });
    expect(clearSavedData()).toBe(false);
    expect(storageIssue()).toBe("unavailable");
  });
  it("rejects unknown versions, malformed rules, invalid solutions and duplicate guesses", () => {
    expect(() => parseSave('{"version":99,"runs":{}}')).toThrow();
    const save = partial();
    save.runs["daily:2026-10-31"].rounds[0].puzzle.rules[0] = {
      type: "length",
      value: -2,
    };
    expect(() => parseSave(JSON.stringify(save))).toThrow();
    const invalid = partial();
    invalid.runs["daily:2026-10-31"].rounds[0].puzzle.solutions = [
      "nonsensezzz",
    ];
    expect(() => parseSave(JSON.stringify(invalid))).toThrow();
    const duplicate = partial();
    duplicate.runs["daily:2026-10-31"].rounds[0].guesses.push(
      duplicate.runs["daily:2026-10-31"].rounds[0].guesses[0],
    );
    expect(() => parseSave(JSON.stringify(duplicate))).toThrow();
  });
  it("merges tab progress, hints, and separate game sessions without regressions", () => {
    const old = partial();
    const fresh = parseSave(JSON.stringify(old));
    const run = fresh.runs["daily:2026-10-31"];
    run.rounds[0] = submitGuess(run.rounds[0], "butter").round;
    run.current = 1;
    const practice = newRun("practice:1", run.date, "practice", [puzzle]);
    fresh.runs[practice.id] = practice;
    const merged = mergeSaves(fresh, old);
    expect(merged.runs[run.id].rounds[0].status).toBe("solved");
    expect(merged.runs[run.id].rounds[0].hint).toBe(true);
    expect(merged.runs[run.id].current).toBe(1);
    expect(merged.runs["practice:1"]).toBeTruthy();
    expect(mergeSaves(old, fresh).runs).toEqual(merged.runs);
  });
  it("unions concurrent unresolved guesses and never refunds a hint", () => {
    const first = partial();
    const second = partial();
    const key = "daily:2026-10-31";
    first.runs[key].rounds[0] = submitGuess(
      first.runs[key].rounds[0],
      "house",
    ).round;
    second.runs[key].rounds[0] = submitGuess(
      second.runs[key].rounds[0],
      "chair",
    ).round;
    const merged = mergeSaves(first, second);
    expect(
      merged.runs[key].rounds[0].guesses.map((guess) => guess.word).sort(),
    ).toEqual(["apple", "chair", "house"]);
    expect(merged.runs[key].rounds[0].hint).toBe(true);
    expect(mergeSaves(second, first).runs[key].rounds[0]).toEqual(
      merged.runs[key].rounds[0],
    );
  });
});
