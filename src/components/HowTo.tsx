import { useState } from "react";
import { evaluatePuzzle, describeRule } from "../engine/rules";
import type { Rule } from "../engine/types";
const rules: Rule[] = [
  { type: "length", value: 4 },
  { type: "starts", value: "s" },
  { type: "contains", value: "a" },
];
export default function HowTo({ onDone }: { onDone?: () => void }) {
  const [word, setWord] = useState("star");
  const results = evaluatePuzzle(word, rules);
  const fits = results.every(Boolean);
  return (
    <section className="quiet-page tutorial" aria-labelledby="tutorial-heading">
      <header className="quiet-heading">
        <p className="eyebrow">FIRST TIME HERE?</p>
        <h1 id="tutorial-heading">How to play.</h1>
        <p className="editorial">
          One word. A few rules. Any valid answer wins.
        </p>
      </header>
      <div className="tutorial-content">
        <h2>Find a word that:</h2>
        <ol className="tutorial-rules">
          {rules.map((rule, i) => (
            <li key={rule.type}>
              <span className="rule-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{describeRule(rule)}</span>
              {word !== "star" && (
                <span className={results[i] ? "success" : "error"}>
                  {results[i] ? "✓" : "×"}
                  <span className="sr-only">
                    {" "}
                    {results[i] ? "satisfied" : "not satisfied"}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="tutorial-answer">
          <span>One answer is</span>
          <strong>{word.toUpperCase()}</strong>
        </div>
        <p
          className={`editorial tutorial-note ${fits ? "success" : "error"}`}
          role="status"
        >
          {fits
            ? `${word.toUpperCase()} is a real word and meets all three rules.`
            : `${word.toUpperCase()} is a real word, but it does not meet every rule.`}
        </p>
        <details className="quiet-details tutorial-examples">
          <summary>Try another word</summary>
          <div
            className="tutorial-example-switch"
            role="group"
            aria-label="Try an example"
          >
            {["star", "sand", "seed"].map((example) => (
              <button
                className="secondary"
                aria-pressed={word === example}
                onClick={() => setWord(example)}
                key={example}
              >
                {example.toUpperCase()}
              </button>
            ))}
          </div>
          <p>
            Several words can win. Compare STAR and SAND, then see which rule
            SEED misses.
          </p>
        </details>
        {onDone && (
          <button className="tutorial-start" onClick={onDone}>
            I’ve got it — let’s play
          </button>
        )}
        <details className="quiet-details">
          <summary>The finer print</summary>
          <p>
            There are three daily rounds, with six valid guesses each. Invalid
            dictionary words and repeated guesses never use an attempt. Rule
            feedback appears after submission, never while you type.
          </p>
          <p>
            Words have 3–12 letters. Vowels mean A, E, I, O and U; Y is a
            consonant. Repeated letters may occur anywhere. Adjacent repeats
            must touch. Letter positions start at one.
          </p>
          <p>
            A Nudge gives information about one verified possible answer. Any
            other accepted word satisfying the rules still wins. A Nudge is
            optional, limited to once per round, and its point cost is shown
            before use.
          </p>
          <p>
            Warm-Up: 100 − 12 per earlier valid guess − 25 for a Nudge (minimum
            20). The Stretch: 150 − 18 − 35 (minimum 25). The Loophole: 250 − 30
            − 60 (minimum 40). Unsolved rounds earn 0.
          </p>
          <p>
            Finish all three rounds to build your daily completion streak, even
            if some rounds are unsolved. The game resets at midnight UTC.
            Practice and archive play never change the official streak.
          </p>
          <p>
            The offline English dictionary accepts common inflections and
            regional word-game spellings. Proper names, punctuation, and
            non-English characters are unsupported. A smaller common-word list
            keeps generated puzzles fair.
          </p>
        </details>
      </div>
      <p className="supporting-nav">
        Six valid guesses per round · A hint is always optional
      </p>
    </section>
  );
}
