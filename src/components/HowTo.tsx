import { useState } from "react";
import { evaluatePuzzle, describeRule } from "../engine/rules";
import type { Rule } from "../engine/types";
const rules: Rule[] = [
  { type: "length", value: 6 },
  { type: "starts", value: "b" },
  { type: "adjacent" },
];
export default function HowTo({ onDone }: { onDone?: () => void }) {
  const [word, setWord] = useState("butter");
  const results = evaluatePuzzle(word, rules);
  return (
    <section className="how-to panel">
      <p className="eyebrow">A QUICK FIELD GUIDE</p>
      <h2>Every rule. Any word.</h2>
      <p>
        Find a real English word that satisfies <strong>all the rules</strong>.
        There’s no secret answer to guess.
      </p>
      <div className="example-switch" role="group" aria-label="Try an example">
        {["butter", "bitter", "banana"].map((w) => (
          <button
            key={w}
            className={word === w ? "selected" : "secondary"}
            onClick={() => setWord(w)}
          >
            {w.toUpperCase()}
          </button>
        ))}
      </div>
      <ul className="example-rules">
        {rules.map((r, i) => (
          <li key={r.type}>
            {results[i] ? "✓" : "×"} {describeRule(r)}{" "}
            <span className="muted">
              — {results[i] ? "satisfied" : "not satisfied"}
            </span>
          </li>
        ))}
      </ul>
      <p>
        <strong>Six dictionary words per round.</strong> Invalid and repeated
        words don’t use an attempt. Rule feedback arrives only after you submit.
      </p>
      <p>
        The Daily Run has three rounds. Solve them in fewer guesses for up to{" "}
        <strong>500 points</strong>. One optional Nudge per round reveals the
        first letter of one possible answer, for a point penalty.
      </p>
      <details>
        <summary>The finer print</summary>
        <p>
          Words have 3–12 letters. Vowels are A, E, I, O and U; Y counts as a
          consonant. Repeated letters may occur anywhere; adjacent repeats must
          touch. Positions start at 1.
        </p>
        <p>
          Warm-Up: 100 − 12 per previous guess − 25 per Nudge (minimum 20). The
          Stretch: 150 − 18 − 35 (minimum 25). The Loophole: 250 − 30 − 60
          (minimum 40). Failed rounds score 0.
        </p>
        <p>
          Finish all three rounds to keep your daily streak, even if you don’t
          solve them all. The daily puzzle resets at midnight UTC. Archive and
          practice never change your official streak.
        </p>
        <p>
          Accepted words come from an offline English dictionary, including many
          inflections. Proper names, punctuation and non-English characters
          aren’t supported. Our smaller common-word list keeps generated puzzles
          approachable. Regional spellings may vary.
        </p>
      </details>
      {onDone && (
        <button className="button" onClick={onDone}>
          Got it, let’s play <span>→</span>
        </button>
      )}
    </section>
  );
}
