# Original puzzle bank difficulty audit

This is a read-only audit of the originally deployed v1 bank: 396 days beginning 2026-10-01, 1188 puzzles. The authoritative rule evaluator was applied to all 10,000 frequency-ranked common words for every puzzle. Counts below refer to all scheduled content, including future dates. The original data file was not changed.

## Findings

- 137/396 Warm-Up puzzles force every common solution to have more than six letters. 337/396 permit at least one common solution outside the intended 4–6 range.
- 82 easy puzzles use an exact letter-position rule; 79 use an exact distinct-letter count; 61 use exact vowel counting; 43 use distinct-vowel counting. These make the three-rule label a weak difficulty guarantee.
- 11 easy puzzles have fewer than five solutions among the 2,000 most frequent common words. Frequency rank is a vocabulary familiarity proxy, not proof of a player's recognition.
- Across all three levels, 0 puzzles were impossible, 0 had a rule redundant over the common dictionary, 0 duplicated a full rule signature, and 0 disagreed with stored common-solution counts. The problem is calibration rather than logical validity.

## Summary

| Metric | Easy | Medium | Hard |
| --- | ---: | ---: | ---: |
| Puzzles | 396 | 396 | 396 |
| Common solutions min / median / max | 40 / 125 / 250 | 15 / 37 / 70 | 5 / 15 / 30 |
| Common solution count mean | 132.18 | 38.8 | 16.65 |
| Top-2,000 solutions min / median / max | 3 / 20 / 92 | 0 / 6 / 29 | 0 / 3 / 13 |
| Puzzles with zero top-2,000 solutions | 0 | 12 | 44 |
| Rule-type structures | 235 | 326 | 368 |

The complete exact-length distributions, solution-length incidences, rule frequencies, rank summaries, and example puzzles are in [difficulty-audit-original.json](difficulty-audit-original.json). Solution-length incidences count a word once per matching puzzle; they are not a count of unique dictionary words. Stored accepted-solution counts are reported as historical generator metadata, while the common counts are independently recomputed here.

## Illustrative original Warm-Ups

### 2026-10-01 (v1-easy-1)

- Exactly 6 distinct letters
- Exactly 7 letters
- Letter 5 is I

Most frequent common matches: **looking, nothing, service, morning, meeting**. 177 common matches; length range 7–7.

### 2026-10-04 (v1-easy-4)

- Ends with a consonant
- Exactly 7 distinct letters
- Begins with P

Most frequent common matches: **problem, playing, probably, players, political**. 144 common matches; length range 7–11.

### 2026-10-06 (v1-easy-6)

- No letter H
- Letter 1 is C
- Exactly 11 letters

Most frequent common matches: **competition, communities, comfortable, considering, combination**. 70 common matches; length range 11–11.

## Limits

No human playtest was performed for this audit. Counts, source-frequency ranks, and rule characteristics identify risks; they do not validate a 5–20 second solving-time target. Historical definitions and player saves must remain stable even when their original difficulty label was imperfect.
