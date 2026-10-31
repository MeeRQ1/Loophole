# Difficulty calibration and compatibility report

The v2 schedule begins **November 1, 2026** and contains **366 days / 1,098 puzzles**. The original 396-day bank is retained intact. Historical UTC dates through October 31 use their original definitions; dates from November 1 use the versioned new schedule. Practice immediately uses the new verified pool. Stored runs embed their original puzzle definitions, so partial/completed games, guesses, hints, scores and statistics survive without a schema migration. Existing settings are preserved; only new players default to the approved dark theme.

## What the audit found

The original [full audit](difficulty-audit-original.md) independently scanned all 1,188 original puzzles. **137 of 396 Warm-Ups force words longer than six letters**, while 337 allow solutions outside 4–6 letters. Easy included 82 precise-position puzzles and 79 distinct-letter puzzles. Twelve Medium and 44 Hard puzzles had no top-2,000-frequency solutions. No original puzzle was impossible: the failure was calibration, not validity.

## Measurable quality gates

The estimator combines rule complexity, interacting negative/position/repetition constraints, solution length, common-solution count, frequency-rank familiarity, and unusual required letters. Its score classifies Easy below 18, Medium 18–39.99, and Hard at least 40. Generation separately rejects contradictory, duplicate and materially redundant rules, recent-template repeats, and high overlap with the immediately preceding puzzle.

- **Easy:** 3 simple rules, exact length 4–6, 40–250 common solutions, at least 5 among the top 2,000 and 12 among the top 4,000 common words. No precise positions, vowel counting, repetition counting, unusual required J/Q/X/Z, or interacting exclusions.
- **Medium:** 4 rules, 4–7-letter solutions, 15–70 common solutions and at least 5 among the top 4,000 words. Moderate complexity; no precise-position/distinct-vowel/distinct-letter restrictions or multiple exclusions.
- **Hard:** 5 rules, 4–9-letter solutions, 5–30 common solutions, at least 3 among the top 6,000 and one among the top 4,000. More interaction is allowed, with an upper cognitive-load bound.

The common vocabulary is frequency ranked, not hand-labeled by age or education. Frequency is a proxy for recognition. **No human playtest was performed, and the proposed solving times have not been validated with players.** These automated gates establish objective content properties, not guaranteed personal difficulty.

## Recomputed new-schedule summary

| Difficulty | Common solutions min / median / max | Solution lengths | Top-2,000 familiar solutions min | Cognitive score | Rule structures |
|---|---|---|---:|---|---:|
| easy | 40 / 108 / 247 | 4–6 | 6 | 6.54–17.34 | 27 |
| medium | 15 / 34 / 70 | 4–7 | 0 | 18.07–36.65 | 108 |
| hard | 5 / 11 / 30 | 4–9 | 0 | 40.16–78.99 | 202 |

## Nine representative verified puzzles

Every answer below is in the accepted dictionary and passes the same authoritative evaluator used by gameplay. They are common-word solutions, not required hidden answers. Counts and classifications are recomputed.

### Easy

**v2-easy-1** — Exactly 5 letters; Contains the letter O; Ends with R.

Examples: **OTHER, POWER, ORDER, MAJOR, LOWER**. 45 common solutions; estimated score 13.84.

**v2-easy-122** — Exactly 6 letters; Ends with L; No letter O.

Examples: **TRAVEL, ANNUAL, ACTUAL, MENTAL, ANIMAL**. 47 common solutions; estimated score 16.85.

**v2-easy-245** — Exactly 6 letters; First and last letters differ; Begins with D.

Examples: **DURING, DESIGN, DOUBLE, DEGREE, DIRECT**. 71 common solutions; estimated score 15.27.

### Medium

**v2-medium-1** — Exactly 4 letters; Ends with P; No letter L; Exactly 1 vowel.

Examples: **STOP, STEP, DROP, SHIP, TRIP**. 26 common solutions; estimated score 24.41.

**v2-medium-122** — Exactly 7 letters; Begins with T; At least one repeated letter; Contains the vowel I.

Examples: **TONIGHT, TELLING, TRAFFIC, TWITTER, TURNING**. 29 common solutions; estimated score 26.14.

**v2-medium-245** — Exactly 6 letters; No letter O; Contains the vowel I; Ends with T.

Examples: **WEIGHT, CREDIT, IMPACT, DIRECT, FLIGHT**. 38 common solutions; estimated score 19.97.

### Hard

**v2-hard-1** — Exactly 8 letters; Letter 3 is T; Exactly 7 distinct letters; Contains the letter R; First and last letters differ.

Examples: **MATERIAL, ENTIRELY, ATTORNEY, INTERNAL, BATHROOM**. 22 common solutions; estimated score 49.84.

**v2-hard-122** — Exactly 5 letters; Contains LA together; Ends with E; No letter N; Letter 2 is L.

Examples: **PLACE, BLAME, PLATE, SLAVE, BLADE**. 8 common solutions; estimated score 42.41.

**v2-hard-245** — Exactly 9 letters; No vowel A; No letter D; At least one repeated letter; Letter 8 is L.

Examples: **CURRENTLY, SERIOUSLY, OBVIOUSLY, EXTREMELY, PERFECTLY**. 19 common solutions; estimated score 51.07.

## Compatibility and maintenance

- The original source bank remains unchanged (1188 original puzzles). Historical mappings and identifiers remain stable. Future daily identifiers remain date based, while versioned source banks document the changed future definitions.
- Existing saved runs are loaded from their stored rules and outcomes, never replaced with freshly scheduled puzzles. No reset, scoring-formula change, achievement change, streak-policy change, or storage-version change is required.
- Version-1 friend URLs retain their original count-based scoring tier. New version-2 links use the improved estimator. Both URL versions remain playable.
- A Nudge normally provides an unexposed first letter; when that would repeat a visible rule, it gives an informative verified letter position/ending instead. It remains a clue to one possible answer, uses the existing one-per-round flag and unchanged penalty, and persists deterministically.
- Run `npm run generate:puzzles` to reproduce the current content without changes. `PUZZLE_DAYS=732 npm run generate:puzzles` appends future v2 days. Existing v1 and v2 entries are retained; never silently regenerate a released schedule.
- `npm run validate:puzzles` verifies all retained and future puzzles, including recomputed accepted/common counts, rule independence, difficulty metrics and structural diversity. `npm run audit:difficulty` regenerates this report from actual data.
