import accepted from "../data/accepted.json";
import common from "../data/common.json";

/** Word-game lexicon: plain English letters, 3–12 characters; no arbitrary inflection rules. */
export const acceptedWords: string[] = accepted;
/** Frequency-ranked, family-friendly subset used for generation; never an answer key. */
export const commonWords: string[] = common;
const acceptedSet = new Set(acceptedWords);
export function normalize(word: string): string {
  return word.trim().toLowerCase();
}
export function isWord(word: string): boolean {
  const normalized = normalize(word);
  return /^[a-z]{3,12}$/.test(normalized) && acceptedSet.has(normalized);
}
