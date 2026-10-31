export const RULE_TYPES = [
  "length",
  "minLength",
  "maxLength",
  "starts",
  "ends",
  "position",
  "contains",
  "excludes",
  "sequence",
  "noSequence",
  "vowels",
  "minVowels",
  "hasVowel",
  "noVowel",
  "adjacent",
  "unique",
  "repeated",
  "distinct",
  "differentEnds",
  "startsVowel",
  "endsConsonant",
  "distinctVowels",
] as const;
export type RuleType = (typeof RULE_TYPES)[number];
export interface Rule {
  type: RuleType;
  value?: number | string;
  position?: number;
}
export type Difficulty = "easy" | "medium" | "hard";
export interface Puzzle {
  id: string;
  rules: Rule[];
  difficulty: Difficulty;
  solutions: string[];
  commonCount: number;
}
export interface Guess {
  word: string;
  passes: boolean[];
}
export interface Round {
  puzzle: Puzzle;
  guesses: Guess[];
  hint: boolean;
  status: "playing" | "solved" | "failed";
}
export type Mode = "daily" | "practice" | "archive" | "challenge";
export interface Run {
  id: string;
  date: string;
  mode: Mode;
  rounds: Round[];
  current: number;
  completedAt?: string;
}
export interface Settings {
  theme: "light" | "dark" | "system";
  contrast: boolean;
  motion: boolean;
  sound: boolean;
}
export interface Save {
  version: 2;
  runs: Record<string, Run>;
  settings: Settings;
  onboarding: boolean;
  achievements: Record<string, string>;
  practiceIndex: number;
}
