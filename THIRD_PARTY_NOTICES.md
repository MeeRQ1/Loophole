# Third-party notices

Loophole uses vendored, offline word datasets. No dictionary API or runtime network lookup is used. The game code's licensing does not replace the following dataset licenses.

## Accepted lexicon: an-array-of-english-words 2.0.0

- Author: Zeke Sikelianos, copyright 2014.
- Source: https://github.com/words/an-array-of-english-words (npm version 2.0.0).
- License: MIT; full notice in [docs/licenses/english-words-MIT.txt](docs/licenses/english-words-MIT.txt).
- Upstream list: Loren Brichter's Letterpress list, https://github.com/lorenbrichter/Words, combining US, UK and Australian word-game spellings. Upstream policy excludes proper nouns and acronyms, with some historical abbreviations retained. It is a word-game lexicon, not an exhaustive natural-language dictionary.
- Modification: retained unique lowercase ASCII alphabetic entries of 3–12 letters and sorted them. `src/data/accepted.json` contains **241,528** entries. No automatically invented inflections were added.

## Puzzle-quality vocabulary: wordfreq 3.1.1

- Creator: Robyn Speer. Source: https://github.com/rspeer/wordfreq/tree/v3.1.1.
- Citation: Robyn Speer (2022), *rspeer/wordfreq: v3.0 (v3.0.2)*, Zenodo, https://doi.org/10.5281/zenodo.7199437.
- The wordfreq software is Apache 2.0; its distributed frequency data is available under **Creative Commons Attribution-ShareAlike 4.0 International**, https://creativecommons.org/licenses/by-sa/4.0/.
- `src/data/common.json` is a **CC BY-SA 4.0** adaptation of the frequency-ranked English word data. It contains the first 10,000 accepted 3–12-letter words from `wordfreq.top_n_list('en', 50000)` after an editorial exclusion of profanity, slurs, explicit sexual words and distressing showcase terms. It remains in descending source-frequency order. The least frequent entries have a Zipf frequency of 3.67. Frequency is a measurable commonness proxy, not a claim that every speaker knows every word. No frequency values or example sentences are distributed.
- Changes: intersection with the accepted word-game lexicon, length normalization, exclusion filtering, selection of 10,000 entries and conversion to JSON.
- The CC BY-SA license also applies to the selected solution examples included in the generated puzzle-bank data. Game source code is independent of these data licenses.
- Full data attribution inherited from wordfreq is in [docs/licenses/wordfreq-data-attribution.md](docs/licenses/wordfreq-data-attribution.md); full CC BY-SA terms are in [docs/licenses/CC-BY-SA-4.0.txt](docs/licenses/CC-BY-SA-4.0.txt). Wordfreq software notice is in [docs/licenses/wordfreq-Apache.txt](docs/licenses/wordfreq-Apache.txt).

The underlying wordfreq sources include Google Books Ngrams (http://books.google.com/ngrams), the Leeds Internet Corpus (http://corpus.leeds.ac.uk/list.html), Wikipedia (https://www.wikipedia.org), ParaCrawl (https://paracrawl.eu), OPUS OpenSubtitles 2018 (https://opus.nlpl.eu/OpenSubtitles.php) / OpenSubtitles (https://www.opensubtitles.org), and the freely available SUBTLEX lists by Marc Brysbaert and colleagues (http://crr.ugent.be/programs-data/subtitle-frequencies). See the inherited attribution document for their terms. SUBTLEX-US: Brysbaert & New (2009), *Behavior Research Methods* 41(4), 977–990.

## Acceptance policy

All modes use precisely the same accepted-word set. Any accepted word satisfying every visible rule wins, even if it is absent from the common vocabulary or stored example solutions. Case and surrounding whitespace are normalized; accented letters, apostrophes, spaces and hyphens are unsupported. Word-game spellings and inflections are accepted only if present in the lexicon. Proper nouns are not accepted merely because they appear in frequency data. Some words that are also names can be valid lowercase English words (for example, `rose`). Offensive entries may remain in the broad accepted lexicon; they are not used as generated examples. Editorial filtering is an aid, not a promise that every possible interpretation of every word is suitable for every audience.

## Other assets

The original Loophole geometric mark and interface artwork are generated in this repository. System font stacks require no downloaded third-party font assets. React, Vite and test-tool dependencies carry their own package licenses in `node_modules`; no remote analytics, advertising, or tracking code is included.
