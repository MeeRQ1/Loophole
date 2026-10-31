import { useState } from "react";
import { ACHIEVEMENTS, getStats } from "../engine/stats";
import { isComplete, scoreRound, totalScore } from "../engine/game";
import type { Save } from "../engine/types";

function displayDate(date: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function StatsScreen({ save }: { save: Save }) {
  const stats = getStats(save);
  const scores = stats.recent.slice(0, 14).reverse();
  return (
    <section
      className="quiet-page statistics-page"
      aria-labelledby="stats-heading"
    >
      <header className="quiet-heading">
        <p className="eyebrow">PERSONAL JOURNAL</p>
        <h1 id="stats-heading">Your numbers.</h1>
        <p className="editorial">A record of all the little ways through.</p>
      </header>
      <div className="stat-summary">
        {[
          [stats.currentStreak, "day streak"],
          [stats.longestStreak, "longest streak"],
          [stats.roundsSolved, "rounds solved"],
          [stats.bestScore, "best daily score"],
        ].map(([value, label]) => (
          <div className="metric" key={label}>
            <strong className="stat-number">{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="stats-chart-layout">
        <section aria-labelledby="recent-scores-title">
          <h2 className="eyebrow" id="recent-scores-title">
            RECENT DAILY SCORES
          </h2>
          {scores.length ? (
            <div
              className="score-chart"
              role="img"
              aria-label={scores
                .map(
                  (run) =>
                    `${displayDate(run.date)}: ${totalScore(run)} of 500`,
                )
                .join("; ")}
            >
              {scores.map((run) => (
                <span
                  className="score-bar"
                  key={run.id}
                  style={{ height: `${Math.max(1, totalScore(run) / 5)}%` }}
                  title={`${displayDate(run.date)} · ${totalScore(run)}/500`}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : (
            <div className="chart-empty">
              <p>Your first completed Daily Run will start the story.</p>
            </div>
          )}
        </section>
        <aside className="stats-aside">
          <h2 className="eyebrow">SOLVE RATE</h2>
          <strong className="stat-number">{stats.winRate}%</strong>
          <p>Average attempts</p>
          <strong className="stat-average">
            {stats.averageAttempts.toFixed(1)}
          </strong>
        </aside>
      </div>
      <details className="quiet-details">
        <summary>The daily ledger</summary>
        <dl className="stat-list">
          <div>
            <dt>Daily Runs started / completed</dt>
            <dd>
              {stats.dailyStarted} / {stats.dailyCompleted}
            </dd>
          </div>
          <div>
            <dt>Fully solved Daily Runs</dt>
            <dd>{stats.fullySolved}</dd>
          </div>
          <div>
            <dt>Perfect 500-point runs</dt>
            <dd>{stats.perfectRuns}</dd>
          </div>
          <div>
            <dt>Daily rounds solved / failed</dt>
            <dd>
              {stats.roundsSolved} / {stats.roundsFailed}
            </dd>
          </div>
          <div>
            <dt>Total daily points</dt>
            <dd>{stats.totalPoints.toLocaleString()}</dd>
          </div>
        </dl>
        <p className="muted">
          Finish all three daily rounds to build your streak, even when a round
          goes unsolved. Practice and archive play do not extend it.
        </p>
        <h3>Guesses used in solved daily rounds</h3>
        <ol className="distribution-list">
          {stats.distribution.map((count, i) => (
            <li key={i}>
              <span>
                {i + 1} {i === 0 ? "guess" : "guesses"}
              </span>
              <strong>{count} solves</strong>
            </li>
          ))}
        </ol>
      </details>
      <details className="quiet-details">
        <summary>Practice & all-mode records</summary>
        <p>{stats.practiceCompleted} practice rounds completed.</p>
        <dl className="stat-list">
          {(["easy", "medium", "hard"] as const).map((difficulty) => (
            <div key={difficulty}>
              <dt>{difficulty[0].toUpperCase() + difficulty.slice(1)}</dt>
              <dd>
                {stats.practiceByDifficulty[difficulty].solved} solved ·{" "}
                {stats.practiceByDifficulty[difficulty].completed} completed ·
                best {stats.practiceByDifficulty[difficulty].bestScore}
              </dd>
            </div>
          ))}
        </dl>
        <h3>Across your notebook</h3>
        <p className="muted">
          Daily, practice, and friend challenges. Archive replays are excluded.
        </p>
        <dl className="stat-list">
          <div>
            <dt>Total rounds solved / failed</dt>
            <dd>
              {stats.totalRoundsSolved} / {stats.totalRoundsFailed}
            </dd>
          </div>
          <div>
            <dt>Overall solve rate</dt>
            <dd>{stats.overallWinRate}%</dd>
          </div>
          <div>
            <dt>Average guesses to solve</dt>
            <dd>{stats.overallAverageAttempts.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Total points</dt>
            <dd>{stats.totalPointsAllModes.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Nudges used</dt>
            <dd>{stats.hintsUsed}</dd>
          </div>
        </dl>
      </details>
      {stats.recent.length > 0 && (
        <details className="quiet-details">
          <summary>Recent daily history</summary>
          <ul className="history-list">
            {stats.recent.slice(0, 30).map((run) => (
              <li className="history-row" key={run.id}>
                <span>{displayDate(run.date)}</span>
                <span>
                  {
                    run.rounds.filter((round) => round.status === "solved")
                      .length
                  }
                  /3 solved
                </span>
                <strong>{totalScore(run)}/500</strong>
              </li>
            ))}
          </ul>
        </details>
      )}
      <nav className="supporting-nav" aria-label="Statistics links">
        <a href="#/achievements">
          Achievements · {stats.achievementsEarned} earned
        </a>
        <a href="#/archive">View past daily runs</a>
      </nav>
    </section>
  );
}

export function AchievementsScreen({ save }: { save: Save }) {
  const stats = getStats(save);
  const [earnedOnly, setEarnedOnly] = useState(false);
  const visible = ACHIEVEMENTS.filter(
    (item) => !earnedOnly || save.achievements[item.id],
  );
  return (
    <section
      className="quiet-page achievements-page"
      aria-labelledby="achievements-heading"
    >
      <header className="quiet-heading">
        <p className="eyebrow">PERSONAL JOURNAL</p>
        <h1 id="achievements-heading">Milestones.</h1>
        <p className="editorial">Small victories worth keeping.</p>
      </header>
      <div className="list-heading">
        <span className="eyebrow accent">
          EARNED&nbsp; {Object.keys(save.achievements).length} /{" "}
          {ACHIEVEMENTS.length}
        </span>
        <button
          className="text-button"
          aria-pressed={earnedOnly}
          onClick={() => setEarnedOnly(!earnedOnly)}
        >
          {earnedOnly ? "View all" : "Earned only"}
        </button>
      </div>
      <ul className="achievement-list">
        {visible.map((item) => {
          const unlocked = save.achievements[item.id];
          const progress = Math.min(item.target, item.progress(stats));
          return (
            <li
              className={`achievement-row ${unlocked ? "earned" : "locked"}`}
              key={item.id}
            >
              <span
                className="achievement-status"
                aria-label={unlocked ? "Earned" : "Locked"}
              >
                {unlocked ? "✓" : "○"}
              </span>
              <h2 className="achievement-name">{item.name}</h2>
              <p className="achievement-description">{item.description}</p>
              <div className="achievement-progress">
                {unlocked ? (
                  <>
                    <span className="success">Earned</span>
                    <time dateTime={unlocked}>
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                      }).format(new Date(unlocked))}
                    </time>
                  </>
                ) : (
                  <span>
                    {progress ? `${progress} / ${item.target}` : "Locked"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="empty-state">
          Your first milestone is still ahead. Every puzzle is a chance to find
          it.
        </p>
      )}
      <p className="supporting-nav">Based on saved progress on this device.</p>
    </section>
  );
}

export function ArchiveScreen({
  save,
  onPlay,
}: {
  save: Save;
  onPlay: (date: string) => void;
}) {
  const today = new Date();
  const dates = Array.from({ length: 30 }, (_, i) =>
    new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - i - 1,
      ),
    )
      .toISOString()
      .slice(0, 10),
  );
  const [selected, setSelected] = useState(dates[0]);
  const selectedDate = dates.includes(selected) ? selected : dates[0];
  function records(date: string) {
    const official = Object.values(save.runs).find(
      (run) => run.mode === "daily" && run.date === date,
    );
    const archive = Object.values(save.runs)
      .filter((run) => run.mode === "archive" && run.date === date)
      .at(-1);
    return { official, archive, record: official ?? archive };
  }
  const { official, archive, record } = records(selectedDate);
  const roundNames = ["Warm-Up", "The Stretch", "The Loophole"];
  return (
    <section
      className="quiet-page archive-page"
      aria-labelledby="archive-heading"
    >
      <header className="quiet-heading">
        <p className="eyebrow">PAST PUZZLES</p>
        <h1 id="archive-heading">The archive.</h1>
        <p className="editorial">A different loophole for every day.</p>
      </header>
      <div className="archive-layout">
        <section aria-label="Last 30 daily challenges">
          <h2 className="eyebrow">
            {displayDate(dates[0], {
              month: "long",
              day: undefined,
              year: "numeric",
            }).toUpperCase()}
          </h2>
          <div className="archive-list">
            {dates.map((date) => {
              const item = records(date).record;
              const complete = item && isComplete(item);
              const fullySolved =
                complete &&
                item.rounds.every((round) => round.status === "solved");
              return (
                <button
                  type="button"
                  className={`archive-date ${date === selectedDate ? "selected" : ""}`}
                  aria-pressed={date === selectedDate}
                  onClick={() => setSelected(date)}
                  key={date}
                >
                  <span>{displayDate(date)}</span>
                  <span className={fullySolved ? "success" : "muted"}>
                    {complete
                      ? fullySolved
                        ? "Solved"
                        : "Completed"
                      : item
                        ? "In progress"
                        : "Not played"}
                  </span>
                  <span className="muted">
                    {complete ? `${totalScore(item)} / 500` : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <aside className="archive-detail">
          <h2 className="eyebrow">SELECTED DATE</h2>
          <p className="archive-selected-date">
            {displayDate(selectedDate, {
              weekday: "long",
              month: "long",
              year: undefined,
            }).toUpperCase()}
          </p>
          <strong className="archive-score">
            {record && isComplete(record)
              ? `${totalScore(record)} / 500`
              : "Not played yet"}
          </strong>
          {record ? (
            <ul className="archive-rounds">
              {record.rounds.map((round, i) => (
                <li
                  className={round.status === "solved" ? "success" : ""}
                  key={i}
                >
                  <span>{roundNames[i]}</span>
                  <span>
                    {round.status === "solved"
                      ? "✓"
                      : round.status === "failed"
                        ? "×"
                        : "—"}
                  </span>
                  <span className="sr-only">
                    {round.status} · {scoreRound(round)} points
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="editorial">Three puzzles waiting to be found.</p>
          )}
          <button onClick={() => onPlay(selectedDate)}>
            {archive?.completedAt
              ? "Replay this edition"
              : archive
                ? "Continue archive"
                : record
                  ? "Replay this day"
                  : "Play this edition"}
          </button>
          {official && (
            <p className="archive-record-note">
              {official.completedAt
                ? `Official record: ${totalScore(official)} / 500`
                : "Your official run remains unfinished."}{" "}
              Archive play keeps its own record.
            </p>
          )}
          {archive && official && archive.completedAt && (
            <p className="muted">
              Latest archive result: {totalScore(archive)} / 500
            </p>
          )}
        </aside>
      </div>
      <p className="supporting-nav">
        Archived games do not count toward your current streak.
      </p>
    </section>
  );
}
