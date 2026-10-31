import { ACHIEVEMENTS, getStats } from "../engine/stats";
import { scoreRound, totalScore } from "../engine/game";
import type { Save } from "../engine/types";

function displayDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function StatsScreen({ save }: { save: Save }) {
  const stats = getStats(save);
  const maxAttempts = Math.max(1, ...stats.distribution);
  return (
    <section className="stack" aria-labelledby="stats-heading">
      <header className="page-heading">
        <p className="eyebrow">YOUR PERSONAL RECORD</p>
        <h1 id="stats-heading">A little progress, every day.</h1>
        <p className="muted">
          Every number here is yours. Saved on this device, with no accounts or
          rankings.
        </p>
      </header>
      <div className="metric-grid">
        <div className="panel metric">
          <span className="metric-value">{stats.currentStreak}</span>
          <span>day streak</span>
        </div>
        <div className="panel metric">
          <span className="metric-value">
            {stats.bestScore}
            <small> / 500</small>
          </span>
          <span>best Daily Run</span>
        </div>
        <div className="panel metric">
          <span className="metric-value">
            {Math.round(stats.winRate)}
            <small>%</small>
          </span>
          <span>daily rounds solved</span>
        </div>
        <div className="panel metric">
          <span className="metric-value">{stats.dailyCompleted}</span>
          <span>Daily Runs completed</span>
        </div>
      </div>
      <div className="grid">
        <section className="panel stack">
          <h2>The daily ledger</h2>
          <dl className="stat-list">
            <div>
              <dt>Daily Runs started</dt>
              <dd>{stats.dailyStarted}</dd>
            </div>
            <div>
              <dt>Fully solved Daily Runs</dt>
              <dd>{stats.fullySolved}</dd>
            </div>
            <div>
              <dt>Longest daily streak</dt>
              <dd>{stats.longestStreak} days</dd>
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
              <dt>Average guesses to solve</dt>
              <dd>{stats.averageAttempts.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Total daily points</dt>
              <dd>{stats.totalPoints.toLocaleString()}</dd>
            </div>
          </dl>
          <p className="muted">
            Finishing all three daily rounds builds your streak, even when a
            round goes unsolved. Archive and practice do not extend it.
          </p>
        </section>
        <section className="panel stack">
          <h2>A way with words</h2>
          <p className="muted">
            Guesses used in solved daily rounds. Labels show the exact number of
            solves.
          </p>
          <div
            className="distribution"
            role="img"
            aria-label={`Solved round distribution: ${stats.distribution.map((n, i) => `${i + 1} guesses: ${n}`).join("; ")}`}
          >
            {stats.distribution.map((count, i) => (
              <div className="distribution-row" key={i}>
                <span>{i + 1}</span>
                <div className="distribution-track">
                  <span
                    className="distribution-bar"
                    style={{
                      width: `${Math.max(count ? 8 : 0, (count / maxAttempts) * 100)}%`,
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel stack">
        <div>
          <p className="eyebrow">EVERY WAY THROUGH</p>
          <h2>Across your notebook</h2>
        </div>
        <p>
          Daily, practice, and friend challenges together. Archive replays stay
          outside these totals.
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
            <dt>Points across game modes</dt>
            <dd>{stats.totalPointsAllModes.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Nudges used</dt>
            <dd>{stats.hintsUsed}</dd>
          </div>
        </dl>
      </section>
      <section className="panel stack">
        <div>
          <p className="eyebrow">OFF THE CLOCK</p>
          <h2>Practice notebook</h2>
        </div>
        <p>
          {stats.practiceCompleted} practice rounds completed. Practice records
          stay separate from the Daily Run.
        </p>
        <div className="grid">
          {(["easy", "medium", "hard"] as const).map((difficulty) => {
            const item = stats.practiceByDifficulty[difficulty];
            return (
              <div className="metric" key={difficulty}>
                <h3>{difficulty[0].toUpperCase() + difficulty.slice(1)}</h3>
                <p>
                  {item.solved} solved · {item.completed} completed
                </p>
                <p className="muted">Best score: {item.bestScore}</p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel stack">
        <h2>Recent daily history</h2>
        {stats.recent.length ? (
          <ul className="history-list">
            {stats.recent
              .filter((run) => run.mode === "daily")
              .slice(0, 14)
              .map((run) => (
                <li className="history-row" key={run.id}>
                  <span>{displayDate(run.date)}</span>
                  <span>
                    {
                      run.rounds.filter((round) => round.status === "solved")
                        .length
                    }{" "}
                    / 3 solved
                  </span>
                  <strong>{totalScore(run)} / 500</strong>
                  <span className="muted">
                    {run.completedAt ? "Complete" : "In progress"}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">Your first Daily Run will start the story.</p>
        )}
      </section>
      <p className="muted">
        {stats.achievementsEarned} achievements earned. Explore your collection
        in Achievements.
      </p>
    </section>
  );
}

export function AchievementsScreen({ save }: { save: Save }) {
  const stats = getStats(save);
  return (
    <section className="stack" aria-labelledby="achievements-heading">
      <header className="page-heading">
        <p className="eyebrow">SMALL VICTORIES</p>
        <h1 id="achievements-heading">Marks of a curious mind.</h1>
        <p className="muted">
          A collection earned through real play.{" "}
          {Object.keys(save.achievements).length} of {ACHIEVEMENTS.length}{" "}
          unlocked.
        </p>
      </header>
      <div className="achievement-grid">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = save.achievements[achievement.id];
          const progress = Math.min(
            achievement.target,
            achievement.progress(stats),
          );
          return (
            <article
              className={`panel achievement-card ${unlocked ? "unlocked" : "locked"}`}
              key={achievement.id}
            >
              <span className="achievement-symbol" aria-hidden="true">
                {achievement.symbol}
              </span>
              <div>
                <p className="eyebrow">
                  {unlocked ? "EARNED" : "IN THE MAKING"}
                </p>
                <h2>{achievement.name}</h2>
                <p>{achievement.description}</p>
                {unlocked ? (
                  <p className="muted">
                    Unlocked{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                    }).format(new Date(unlocked))}
                  </p>
                ) : (
                  <>
                    <progress
                      className="achievement-progress"
                      value={progress}
                      max={achievement.target}
                      aria-label={`${achievement.name} progress`}
                    />
                    <p className="muted">
                      {progress} / {achievement.target}
                    </p>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
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
  return (
    <section className="stack" aria-labelledby="archive-heading">
      <header className="page-heading">
        <p className="eyebrow">THE BACK ISSUES</p>
        <h1 id="archive-heading">Good puzzles keep.</h1>
        <p className="muted">
          Revisit the last 30 days. Archive sessions have their own records and
          never change your official daily score or streak.
        </p>
      </header>
      <div className="archive-grid">
        {dates.map((date) => {
          const official = Object.values(save.runs).find(
            (run) => run.mode === "daily" && run.date === date,
          );
          const archive = Object.values(save.runs)
            .filter((run) => run.mode === "archive" && run.date === date)
            .at(-1);
          return (
            <article className="panel archive-card" key={date}>
              <p className="eyebrow">ARCHIVE EDITION</p>
              <h2>{displayDate(date)}</h2>
              <p className="muted">
                {official?.completedAt
                  ? `Official record: ${totalScore(official)} / 500`
                  : official
                    ? "Official run unfinished"
                    : "No official result"}
              </p>
              {archive && (
                <p>
                  {archive.completedAt
                    ? `Archive record: ${archive.rounds.reduce((sum, round) => sum + scoreRound(round), 0)} / 500`
                    : "Archive session in progress"}
                </p>
              )}
              <button className="button secondary" onClick={() => onPlay(date)}>
                {archive?.completedAt
                  ? "Replay this edition"
                  : archive
                    ? "Continue archive"
                    : "Play this edition"}
                <span aria-hidden="true"> →</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
