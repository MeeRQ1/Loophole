import { useState } from "react";
import type { Run } from "../engine/types";
import {
  advanceRun,
  isComplete,
  scoreRound,
  submitGuess,
  totalScore,
  useNudge as nudgeRound,
} from "../engine/game";
import { describeRule, evaluatePuzzle } from "../engine/rules";
import {
  copyText,
  downloadCard,
  shareResults,
  shareText,
} from "../engine/sharing";
export const ROUND_NAMES = ["Warm-Up", "The Stretch", "The Loophole"];
const MAX = [100, 150, 250];
const PENALTY = [25, 35, 60];
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
  const [hintConfirm, setHintConfirm] = useState(false);
  const round = run.rounds[run.current];
  const solved = round.status === "solved";
  const resolved = round.status !== "playing";
  const latest = round.guesses.at(-1);
  const level = ["easy", "medium", "hard"].indexOf(round.puzzle.difficulty);
  function soundCue(success: boolean) {
    if (!sound) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = success ? 660 : 280;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      osc.onended = () => {
        void ctx.close();
      };
    } catch {
      /* Sound is optional. */
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
      result.round.status === "solved"
        ? `Accepted. ${input.toUpperCase()} satisfies every rule.`
        : `${input.toUpperCase()}: ${result.round.guesses.at(-1)!.passes.filter(Boolean).length} of ${round.puzzle.rules.length} rules satisfied.`,
    );
    soundCue(result.round.status === "solved");
  }
  if (showResults && isComplete(run))
    return (
      <Results
        run={run}
        bestDaily={bestDaily}
        streak={streak}
        onHome={onHome}
        onAnother={onAnother}
      />
    );
  return (
    <section className="game-wrap" key={run.id}>
      <div className="section-kicker">
        <span className="eyebrow">
          {run.mode === "daily" ? "DAILY RUN" : run.mode.toUpperCase()} ·{" "}
          {run.date}
        </span>
        <span className="mono">
          {totalScore(run)} {run.rounds.length === 3 ? "/ 500" : "PTS"}
        </span>
      </div>
      {run.rounds.length === 3 && (
        <ol className="round-progress" aria-label="Round progress">
          {run.rounds.map((r, i) => (
            <li key={i} className={i === run.current ? "active" : r.status}>
              <span>
                {r.status === "solved"
                  ? "✓"
                  : r.status === "failed"
                    ? "×"
                    : String(i + 1).padStart(2, "0")}
              </span>
              <div>
                {ROUND_NAMES[i]}
                <small>
                  {i > run.current
                    ? "Locked"
                    : r.status === "playing"
                      ? "In progress"
                      : r.status === "solved"
                        ? "Solved"
                        : "Not solved"}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
      <header className="puzzle-heading">
        <div>
          <p className="eyebrow">
            {run.rounds.length === 3
              ? `ROUND ${run.current + 1} OF 3`
              : "ONE PUZZLE. YOUR WAY THROUGH."}
          </p>
          <h1>
            {run.rounds.length === 3
              ? ROUND_NAMES[run.current]
              : `${round.puzzle.difficulty[0].toUpperCase() + round.puzzle.difficulty.slice(1)} does it.`}
          </h1>
          <p>
            One word. <strong>{round.puzzle.rules.length} rules.</strong> Make
            them all work.
          </p>
        </div>
        <div className="round-stamp" aria-hidden="true">
          {round.puzzle.rules.length}
          <small>RULES</small>
        </div>
      </header>
      <div className="puzzle-paper">
        <div className="paper-label">
          <span>THE WORD MUST…</span>
          <span>
            {latest
              ? "LAST GUESS: " + latest.word.toUpperCase()
              : "ALL RULES ARE VISIBLE"}
          </span>
        </div>
        <ol className="rule-list">
          {round.puzzle.rules.map((r, i) => (
            <li
              key={i}
              className={latest ? (latest.passes[i] ? "pass" : "fail") : ""}
            >
              <span className="rule-number">
                {latest
                  ? latest.passes[i]
                    ? "✓"
                    : "×"
                  : String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{describeRule(r)}</strong>
                {latest && (
                  <small>
                    {latest.passes[i] ? "Satisfied" : "Not satisfied"}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ol>
        {!resolved ? (
          <>
            <form onSubmit={submit} className="guess-form">
              <label htmlFor="guess">Your way through</label>
              <div className="guess-entry">
                <input
                  id="guess"
                  name="guess"
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
                  aria-describedby="input-guidance game-message"
                  placeholder="TYPE A WORD"
                />
                <button type="submit" aria-label="Submit word">
                  Try word <span aria-hidden="true">↵</span>
                </button>
              </div>
              <div className="input-meta">
                <small id="input-guidance">3–12 letters · A–Z only</small>
                <span
                  className="attempt-dots"
                  role="img"
                  aria-label={`${round.guesses.length} of 6 attempts used`}
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <i
                      className={i < round.guesses.length ? "used" : ""}
                      key={i}
                    />
                  ))}
                </span>
                <small>{6 - round.guesses.length} attempts left</small>
              </div>
            </form>
            <p
              id="game-message"
              className="game-message"
              role="status"
              aria-live="polite"
            >
              {message ||
                "A word doesn’t need to be on our example list. If it fits, it wins."}
            </p>
            <div className="nudge-area">
              {round.hint ? (
                <p className="nudge-note">
                  → One possible answer begins with{" "}
                  <strong>{round.puzzle.solutions[0][0].toUpperCase()}</strong>.
                  Your word can start differently.
                </p>
              ) : hintConfirm ? (
                <div className="inline-confirm">
                  <p>
                    A Nudge reveals the first letter of one possible answer. It
                    costs <strong>{PENALTY[level]} points</strong>.
                  </p>
                  <button
                    onClick={() => {
                      onChange({
                        ...run,
                        rounds: run.rounds.map((r, i) =>
                          i === run.current ? nudgeRound(r) : r,
                        ),
                      });
                      setHintConfirm(false);
                    }}
                  >
                    Use Nudge
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setHintConfirm(false)}
                  >
                    Keep thinking
                  </button>
                </div>
              ) : (
                <button
                  className="text-button"
                  onClick={() => setHintConfirm(true)}
                >
                  → Need a Nudge? <span>−{PENALTY[level]} pts</span>
                </button>
              )}
              <small className="muted">
                Up to{" "}
                {Math.max(
                  [20, 25, 40][level],
                  MAX[level] -
                    [12, 18, 30][level] * round.guesses.length -
                    (round.hint ? PENALTY[level] : 0),
                )}{" "}
                points this round
              </small>
            </div>
          </>
        ) : (
          <div className={`round-result ${solved ? "won" : ""}`} role="status">
            <p className="eyebrow">
              {solved
                ? "A WAY THROUGH. WELL FOUND."
                : "SIX WORDS. A GOOD EFFORT."}
            </p>
            <h2>
              {solved ? latest?.word.toUpperCase() : "This one got away."}
            </h2>
            <p>
              {solved
                ? `${round.guesses.length} ${round.guesses.length === 1 ? "attempt" : "attempts"} · ${scoreRound(round)} points earned`
                : "No attempts left. This round earns 0 points. You can still finish the run."}
            </p>
            {run.current < run.rounds.length - 1 ? (
              <button
                onClick={() => {
                  onChange(advanceRun(run));
                  setMessage("");
                  setHintConfirm(false);
                }}
              >
                Next round <span>→</span>
              </button>
            ) : (
              <button
                onClick={() => (
                  onChange({
                    ...run,
                    completedAt: run.completedAt ?? new Date().toISOString(),
                  }),
                  setShowResults(true)
                )}
              >
                See results →
              </button>
            )}
            <details open={!solved}>
              <summary>
                {solved
                  ? "See other possible answers"
                  : "Verified ways through"}
              </summary>
              <div className="example-answers">
                {round.puzzle.solutions.slice(0, 3).map((w) => (
                  <details key={w}>
                    <summary>{w.toUpperCase()}</summary>
                    <ul>
                      {evaluatePuzzle(w, round.puzzle.rules).map((pass, i) => (
                        <li key={i}>
                          {pass ? "✓" : "×"}{" "}
                          {describeRule(round.puzzle.rules[i])}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
      {round.guesses.length > 0 && (
        <details className="history" open={resolved}>
          <summary>
            Attempt notebook <span>{round.guesses.length}/6</span>
          </summary>
          {round.guesses.map((g, i) => (
            <div className="history-row" key={g.word}>
              <span className="mono muted">0{i + 1}</span>
              <strong>{g.word.toUpperCase()}</strong>
              <span
                className="history-marks"
                role="img"
                aria-label={g.passes
                  .map((p, j) => `Rule ${j + 1} ${p ? "passed" : "failed"}`)
                  .join(", ")}
              >
                {g.passes.map((p, j) => (
                  <span key={j} className={p ? "pass" : "fail"}>
                    {p ? "✓" : "×"}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </details>
      )}
      <p className="game-footnote">
        Not one right answer. Many right ways to think.
      </p>
    </section>
  );
}
export function Results({
  run,
  bestDaily,
  streak,
  onHome,
  onAnother,
}: {
  run: Run;
  bestDaily: number;
  streak: number;
  onHome: () => void;
  onAnother?: () => void;
}) {
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState(false);
  async function action(kind: "copy" | "share" | "image") {
    try {
      if (kind === "copy") await copyText(shareText(run, streak));
      if (kind === "share") await shareResults(run, streak);
      if (kind === "image") await downloadCard(run, streak);
      setNotice(
        kind === "image"
          ? "Your result card is ready."
          : "Results ready to share.",
      );
    } catch {
      setNotice(
        "Sharing is unavailable in this browser. Select and copy your results below.",
      );
      setManual(true);
    }
  }
  const solved = run.rounds.filter((r) => r.status === "solved").length;
  return (
    <section className="results page">
      <p className="eyebrow">
        {run.mode === "daily" ? "DAILY RUN" : run.mode.toUpperCase()} ·{" "}
        {run.date}
      </p>
      <div className="result-seal" aria-hidden="true">
        {solved === run.rounds.length ? "→" : "✳"}
      </div>
      <h1>
        {solved === run.rounds.length
          ? "You found your way."
          : "Every round, a little wiser."}
      </h1>
      <p>
        {solved} of {run.rounds.length}{" "}
        {run.rounds.length === 1 ? "puzzle" : "puzzles"} solved.{" "}
        {run.mode === "daily"
          ? "Another small ritual, complete."
          : "Keep that curious mind moving."}
      </p>
      <div className="result-score">
        {totalScore(run)}
        <small>
          /{" "}
          {run.rounds.length === 3
            ? 500
            : MAX[
                ["easy", "medium", "hard"].indexOf(
                  run.rounds[0].puzzle.difficulty,
                )
              ]}
        </small>
      </div>
      {run.mode === "daily" &&
        totalScore(run) > 0 &&
        totalScore(run) >= bestDaily && (
          <p className="personal-best">
            Your best Daily Run score. Nicely found.
          </p>
        )}
      <div className="result-rounds">
        {run.rounds.map((r, i) => (
          <div key={i}>
            <span>
              {r.status === "solved" ? "✓" : "×"}{" "}
              {run.rounds.length === 3 ? ROUND_NAMES[i] : r.puzzle.difficulty}
            </span>
            <span>
              {r.guesses.length}/6 · {r.hint ? "1 Nudge" : "no Nudge"}
            </span>
            <strong>{scoreRound(r)} pts</strong>
          </div>
        ))}
      </div>
      {run.mode === "daily" && (
        <p className="streak-note">
          ✳ {streak} day completion streak · Solving and finishing are
          different. Both matter.
        </p>
      )}
      <div className="button-row">
        <button onClick={() => void action("copy")}>Copy results →</button>
        <button className="secondary" onClick={() => void action("share")}>
          Share
        </button>
        <button className="secondary" onClick={() => void action("image")}>
          Save image
        </button>
      </div>
      <p role="status">{notice}</p>
      {manual && (
        <textarea
          readOnly
          aria-label="Results to copy"
          value={shareText(run, streak)}
        />
      )}
      <div className="button-row">
        <button className="text-button" onClick={onHome}>
          ← Back home
        </button>
        {onAnother && (
          <button className="text-button" onClick={onAnother}>
            Keep playing →
          </button>
        )}
      </div>
    </section>
  );
}
