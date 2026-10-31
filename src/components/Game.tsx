import { useRef, useState } from "react";
import type { Run } from "../engine/types";
import {
  advanceRun,
  hintPenalty,
  isComplete,
  maxRoundScore,
  scoreRound,
  submitGuess,
  totalScore,
  useNudge as nudgeRound,
} from "../engine/game";
import { describeRule, evaluatePuzzle } from "../engine/rules";
import { getNudge } from "../engine/hints";
import {
  copyText,
  downloadCard,
  shareResults,
  shareText,
} from "../engine/sharing";
import RuleList from "./RuleList";
export const ROUND_NAMES = ["Warm-Up", "The Stretch", "The Loophole"];
function PlayLinks() {
  return (
    <nav className="supporting-nav" aria-label="Gameplay navigation">
      <a href="#/daily">Daily</a>
      <span aria-hidden="true">/</span>
      <a href="#/practice">Practice</a>
      <span aria-hidden="true">/</span>
      <a href="#/help">How to play</a>
    </nav>
  );
}
export function Game({
  run,
  onChange,
  onHome,
  onAnother,
  streak,
  sound,
  bestDaily,
}: {
  run: Run;
  onChange: (r: Run) => void;
  onHome: () => void;
  onAnother?: () => void;
  streak: number;
  sound: boolean;
  bestDaily: number;
}) {
  const [showResults, setShowResults] = useState(isComplete(run));
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [confirmHint, setConfirmHint] = useState(false);
  const [examples, setExamples] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const round = run.rounds[run.current];
  const latest = round.guesses.at(-1);
  const resolved = round.status !== "playing";
  const solved = round.status === "solved";
  const maximum = { easy: 100, medium: 150, hard: 250 }[
    round.puzzle.difficulty
  ];
  const modeLabel =
    run.mode === "daily"
      ? `TODAY’S GAME / ROUND ${run.current + 1} OF ${run.rounds.length}`
      : run.mode === "archive"
        ? `ARCHIVE · ${run.date} / ROUND ${run.current + 1} OF 3`
        : run.mode === "challenge"
          ? "A FRIEND’S CHALLENGE"
          : "PLAY AS LONG AS YOU LIKE";
  function cue(win: boolean) {
    if (!sound) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = win ? 660 : 280;
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => {
        void ctx.close();
      };
    } catch {
      /* Silence remains a complete experience. */
    }
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = submitGuess(round, input);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    const rounds = run.rounds.map((r, i) =>
      i === run.current ? result.round : r,
    );
    const next = { ...run, rounds };
    if (rounds.every((r) => r.status !== "playing"))
      next.completedAt = new Date().toISOString();
    onChange(next);
    setInput("");
    setMessage(
      `${result.round.guesses.at(-1)!.word.toUpperCase()}: ${result.round.guesses.at(-1)!.passes.filter(Boolean).length} of ${round.puzzle.rules.length} rules satisfied.`,
    );
    cue(result.round.status === "solved");
    if (result.round.status !== "playing")
      requestAnimationFrame(() => titleRef.current?.focus());
  }
  function next() {
    onChange(advanceRun(run));
    setMessage("");
    setExamples(false);
    setConfirmHint(false);
    requestAnimationFrame(() => titleRef.current?.focus());
  }
  if (showResults && isComplete(run))
    return (
      <Results
        run={run}
        streak={streak}
        bestDaily={bestDaily}
        onHome={onHome}
        onAnother={onAnother}
      />
    );
  if (resolved)
    return (
      <section
        className={`quiet-game round-complete ${solved ? "won" : "lost"}`}
      >
        <header className="quiet-heading">
          <p className="eyebrow">
            ROUND {run.current + 1} OF {run.rounds.length} ·{" "}
            {solved ? "COMPLETED" : "NOT SOLVED"}
          </p>
          <h1 ref={titleRef} tabIndex={-1}>
            {solved ? "That fits." : "Not quite."}
          </h1>
          <p className="editorial">
            {solved
              ? "You found a word that passes every rule."
              : "Six guesses used. Here are a few words that worked."}
          </p>
        </header>
        {solved ? (
          <>
            <div className="accepted-word">{latest!.word.toUpperCase()}</div>
            <RuleList
              rules={round.puzzle.rules}
              passes={latest!.passes}
              compact
            />
            <div className="round-receipt">
              <span>
                Solved in {round.guesses.length}{" "}
                {round.guesses.length === 1 ? "guess" : "guesses"}
                {round.hint ? " · Nudge used" : ""}
              </span>
              <strong>+{scoreRound(round)} points</strong>
            </div>
          </>
        ) : (
          <div className="example-answers">
            {round.puzzle.solutions.slice(0, 3).map((word) => (
              <details key={word}>
                <summary>
                  <strong>{word.toUpperCase()}</strong>
                  <span>
                    {round.puzzle.rules.length} of {round.puzzle.rules.length}{" "}
                    rules satisfied
                  </span>
                </summary>
                <ul>
                  {evaluatePuzzle(word, round.puzzle.rules).map((pass, i) => (
                    <li key={i}>
                      <span aria-hidden="true">{pass ? "✓" : "×"}</span>{" "}
                      {describeRule(round.puzzle.rules[i])}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <p className="editorial">
              That one was difficult. Tomorrow brings another.
            </p>
            <p className="muted">
              This round earns 0 points. You can still finish the run.
            </p>
          </div>
        )}
        <div className="round-actions">
          {run.current < run.rounds.length - 1 ? (
            <button onClick={next}>
              Next: {ROUND_NAMES[run.current + 1]}{" "}
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onChange({
                  ...run,
                  completedAt: run.completedAt ?? new Date().toISOString(),
                });
                setShowResults(true);
              }}
            >
              See today’s results
            </button>
          )}
          {solved && (
            <button
              className="text-button"
              onClick={() => setExamples(!examples)}
              aria-expanded={examples}
            >
              {examples ? "Hide other answers" : "Other possible answers"}
            </button>
          )}
        </div>
        {solved && examples && (
          <div className="example-answers">
            <p>There is more than one way through:</p>
            {round.puzzle.solutions.slice(0, 6).map((word) => (
              <details key={word}>
                <summary>{word.toUpperCase()}</summary>
                <RuleList
                  rules={round.puzzle.rules}
                  passes={evaluatePuzzle(word, round.puzzle.rules)}
                  compact
                />
              </details>
            ))}
          </div>
        )}
        <AttemptHistory run={run} />
        {run.mode !== "practice" && <PlayLinks />}
      </section>
    );
  return (
    <section
      className={`quiet-game ${run.mode === "practice" ? "practice-game" : ""}`}
    >
      {run.mode !== "practice" && (
        <header className="quiet-heading">
          <p className="eyebrow">{modeLabel}</p>
          <h1 ref={titleRef} tabIndex={-1}>
            {run.rounds.length === 3
              ? ROUND_NAMES[run.current]
              : run.mode === "challenge"
                ? "A word that works."
                : "Practice."}
          </h1>
          <p className="editorial">
            Find a word that satisfies all{" "}
            {round.puzzle.rules.length === 3
              ? "three"
              : round.puzzle.rules.length === 4
                ? "four"
                : "five"}{" "}
            rules.
          </p>
        </header>
      )}
      <div className="game-meta">
        <span className="difficulty-label">
          {round.puzzle.difficulty}
          {run.mode === "practice"
            ? ` / ${round.puzzle.rules.length} rules`
            : ""}
        </span>
        <span>Score {totalScore(run)}</span>
      </div>
      <RuleList rules={round.puzzle.rules} passes={latest?.passes} />
      <form className="guess-form" onSubmit={submit}>
        <label htmlFor="guess">YOUR WORD</label>
        <div className="guess-entry">
          <input
            id="guess"
            aria-label="Your way through"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMessage("");
            }}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Type a word…"
            aria-describedby="word-guidance game-message"
          />
          <button type="submit" aria-label="Submit word">
            <span className="desktop-only">Submit</span>
            <span className="mobile-only">Submit word</span>
          </button>
        </div>
        <div className="attempt-meta">
          <span
            className="attempt-dots"
            role="img"
            aria-label={`${round.guesses.length} of 6 attempts used`}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={i < round.guesses.length ? "used" : ""} />
            ))}
          </span>
          <span>{6 - round.guesses.length} tries remaining</span>
          {!round.hint && (
            <button
              className="text-button"
              type="button"
              onClick={() => setConfirmHint(!confirmHint)}
              aria-expanded={confirmHint}
            >
              Need a hint?
            </button>
          )}
        </div>
        <p id="word-guidance" className="sr-only">
          Use an English word of 3 to 12 letters, A to Z. Rule feedback appears
          only after submitting a dictionary word.
        </p>
      </form>
      <p
        id="game-message"
        className="game-message"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
      {confirmHint && !round.hint && (
        <section className="nudge-area inline-confirm">
          <p>
            A Nudge reveals a letter in one possible answer. It costs{" "}
            <strong>{hintPenalty(round)} points</strong>. Other valid answers
            still count.
          </p>
          <div className="button-row">
            <button
              onClick={() => {
                onChange({
                  ...run,
                  rounds: run.rounds.map((r, i) =>
                    i === run.current ? nudgeRound(r) : r,
                  ),
                });
                setConfirmHint(false);
              }}
            >
              Use Nudge
            </button>
            <button className="secondary" onClick={() => setConfirmHint(false)}>
              Keep thinking
            </button>
          </div>
        </section>
      )}
      {round.hint && (
        <p className="nudge-note" role="status">
          {getNudge(round.puzzle)}
        </p>
      )}
      <AttemptHistory run={run} />
      <p className="potential-score sr-only">
        Up to {maxRoundScore(round)} of {maximum} points remain in this round.
      </p>
      {run.mode !== "practice" && <PlayLinks />}
    </section>
  );
}
function AttemptHistory({ run }: { run: Run }) {
  const r = run.rounds[run.current];
  if (!r.guesses.length) return null;
  return (
    <details className="history">
      <summary>
        Attempt history <span>{r.guesses.length}/6</span>
      </summary>
      {r.guesses.map((g, i) => (
        <details className="history-row" key={g.word}>
          <summary>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{g.word.toUpperCase()}</strong>
            <span>
              {g.passes.filter(Boolean).length}/{g.passes.length} rules
            </span>
            <span
              className="history-marks"
              role="img"
              aria-label={g.passes
                .map((p, j) => `Rule ${j + 1} ${p ? "passed" : "failed"}`)
                .join(", ")}
            >
              {g.passes.map((p, j) => (
                <span
                  key={j}
                  className={p ? "pass" : "fail"}
                  aria-hidden="true"
                >
                  {p ? "✓" : "×"}
                </span>
              ))}
            </span>
          </summary>
          <RuleList rules={r.puzzle.rules} passes={g.passes} compact />
        </details>
      ))}
    </details>
  );
}
export function Results({
  run,
  streak,
  bestDaily,
  onHome,
  onAnother,
}: {
  run: Run;
  streak: number;
  bestDaily: number;
  onHome: () => void;
  onAnother?: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState(false);
  const solved = run.rounds.filter((r) => r.status === "solved").length;
  const max = run.rounds.reduce(
    (sum, r) =>
      sum + { easy: 100, medium: 150, hard: 250 }[r.puzzle.difficulty],
    0,
  );
  async function action(kind: "copy" | "share" | "image") {
    try {
      if (kind === "copy") await copyText(shareText(run, streak));
      if (kind === "share") await shareResults(run, streak);
      if (kind === "image") downloadCard(run, streak);
      setNotice(
        kind === "image"
          ? "Your result card is ready."
          : "Results ready to share.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(
        "Sharing is unavailable here. Select and copy your results below.",
      );
      setManual(true);
    }
  }
  return (
    <section className="results quiet-page">
      <header className="quiet-heading">
        <p className="eyebrow">
          {run.mode === "daily" ? "TODAY’S GAME" : run.mode.toUpperCase()} /
          COMPLETE · {run.date}
        </p>
        <h1>
          {run.mode === "daily"
            ? "Today’s results."
            : run.mode === "practice"
              ? "Practice results."
              : run.mode === "archive"
                ? "Archive results."
                : "Your challenge results."}
        </h1>
        <p className="editorial">
          {run.rounds.length === 3
            ? "Three rounds, one daily score."
            : "One word. Every rule."}
        </p>
      </header>
      <div className="result-table" role="table" aria-label="Round results">
        <div className="result-table-head" role="row">
          <span role="columnheader">ROUND</span>
          <span role="columnheader">RESULT</span>
          <span role="columnheader">POINTS</span>
        </div>
        {run.rounds.map((r, i) => (
          <div className="result-table-row" role="row" key={i}>
            <span role="cell">
              <span className="rule-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              {run.rounds.length === 3 ? ROUND_NAMES[i] : r.puzzle.difficulty}
            </span>
            <span role="cell">
              {r.status === "solved" ? "Solved" : "Not solved"}
              <small>
                {r.guesses.length} {r.guesses.length === 1 ? "try" : "tries"}
                {r.hint ? " · Nudge" : ""}
              </small>
            </span>
            <span role="cell">
              {scoreRound(r)} /{" "}
              {{ easy: 100, medium: 150, hard: 250 }[r.puzzle.difficulty]}
            </span>
          </div>
        ))}
      </div>
      <div className="result-summary">
        <div>
          <p className="eyebrow">TOTAL</p>
          <div className="result-score">
            {totalScore(run)} <small>/ {max}</small>
          </div>
        </div>
        {run.mode === "daily" && (
          <p className="streak-note">
            Current streak{" "}
            <strong>
              {streak} {streak === 1 ? "day" : "days"}
            </strong>
          </p>
        )}
      </div>
      <p className="sr-only">
        {solved} of {run.rounds.length} puzzles solved.{" "}
        {run.rounds.filter((r) => r.hint).length} hints used.
      </p>
      {run.mode === "daily" &&
        totalScore(run) > 0 &&
        totalScore(run) >= bestDaily && (
          <p className="personal-best">Your best Daily Run score.</p>
        )}
      <div className="result-actions">
        <button onClick={() => void action("share")}>Share results</button>
        {onAnother && (
          <button className="secondary" onClick={onAnother}>
            Practice instead
          </button>
        )}
        <button className="secondary" onClick={onHome}>
          Return home
        </button>
      </div>
      <div className="share-extra">
        <button className="text-button" onClick={() => void action("copy")}>
          Copy results
        </button>
        <button className="text-button" onClick={() => void action("image")}>
          Save image
        </button>
      </div>
      <p role="status" className="share-status">
        {notice}
      </p>
      {manual && (
        <textarea
          readOnly
          aria-label="Results to copy"
          value={shareText(run, streak)}
        />
      )}
      {run.mode !== "practice" && <PlayLinks />}
    </section>
  );
}
