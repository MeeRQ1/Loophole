import { version } from "../package.json";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Difficulty, Puzzle, Run, Save } from "./engine/types";
import { dailyPuzzles, dateKey, practicePuzzle } from "./engine/puzzles";
import { decodeChallenge } from "./engine/challenges";
import { isComplete, newRun, totalScore } from "./engine/game";
import {
  loadSave,
  mergeSaves,
  persistSave,
  storageIssue,
  STORAGE_KEY,
} from "./engine/storage";
import { getStats, updateAchievements } from "./engine/stats";
import { registerPWA, applyUpdate } from "./pwa";
import { Game } from "./components/Game";
import Home from "./screens/Home";
const HowTo = lazy(() => import("./components/HowTo"));
const StatsScreen = lazy(() =>
  import("./screens/Library").then((module) => ({
    default: module.StatsScreen,
  })),
);
const AchievementsScreen = lazy(() =>
  import("./screens/Library").then((module) => ({
    default: module.AchievementsScreen,
  })),
);
const ArchiveScreen = lazy(() =>
  import("./screens/Library").then((module) => ({
    default: module.ArchiveScreen,
  })),
);
const SettingsScreen = lazy(() =>
  import("./screens/Settings").then((module) => ({
    default: module.SettingsScreen,
  })),
);
const CreatorScreen = lazy(() =>
  import("./screens/Creator").then((module) => ({
    default: module.CreatorScreen,
  })),
);
const NAV = [
  ["daily", "Today’s game"],
  ["practice", "Practice"],
  ["create", "Create a challenge"],
  ["archive", "Archive"],
  ["stats", "Statistics"],
  ["achievements", "Achievements"],
  ["help", "How to play"],
  ["settings", "Settings"],
];
function route() {
  return location.hash.replace(/^#\/?/, "") || "home";
}
function navigate(path: string) {
  location.hash = "/" + path;
}

export default function App() {
  const [save, setSave] = useState<Save>(loadSave);
  const saveRef = useRef(save);
  const [path, setPath] = useState(route);
  const [menu, setMenu] = useState(false);
  const [storageWarning, setStorageWarning] = useState(
    storageIssue() === "unavailable",
  );
  const [recoveryWarning, setRecoveryWarning] = useState(
    storageIssue() === "corrupt",
  );
  const [update, setUpdate] = useState(false);
  const [today, setToday] = useState(dateKey());
  const [difficulty, setDifficulty] = useState<Difficulty | "mix">("mix");
  const [practiceId, setPracticeId] = useState<string>();
  const [activeDailyDate, setActiveDailyDate] = useState(dateKey());
  const [archiveId, setArchiveId] = useState<string>();
  const [achievementNotice, setAchievementNotice] = useState("");
  const [resetPractice, setResetPractice] = useState(false);
  const content = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menu) return;
    document.querySelector<HTMLAnchorElement>("#full-navigation a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  const change = useCallback((value: Save | ((s: Save) => Save)) => {
    const base = typeof value === "function" ? value(saveRef.current) : value;
    const updated = updateAchievements(base);
    const earned = Object.keys(updated.achievements).filter(
      (id) => !saveRef.current.achievements[id],
    );
    if (earned.length)
      setAchievementNotice("A new achievement is in your collection.");
    saveRef.current = updated;
    setSave(updated);
    setStorageWarning(!persistSave(updated));
  }, []);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const hash = () => {
      setPath(route());
      setMenu(false);
      setResetPractice(false);
      window.scrollTo(0, 0);
      content.current?.focus();
    };
    window.addEventListener("hashchange", hash);
    const tick = setInterval(() => setToday(dateKey()), 1000);
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const incoming = loadSave();
          change((s) => mergeSaves(s, incoming));
        } catch {
          /* Leave the current session intact. */
        }
      }
    };
    window.addEventListener("storage", sync);
    const cleanupPWA = registerPWA(() => setUpdate(true));
    return () => {
      cleanupPWA();
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("storage", sync);
      clearInterval(tick);
    };
  }, [change]);
  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        save.settings.theme === "system"
          ? m.matches
            ? "dark"
            : "light"
          : save.settings.theme;
      document.documentElement.dataset.contrast = String(
        save.settings.contrast,
      );
      document.documentElement.dataset.motion = String(save.settings.motion);
    };
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [save.settings]);
  const stats = getStats(save, today);
  function storeRun(run: Run) {
    change((s) => ({ ...s, runs: { ...s.runs, [run.id]: run } }));
  }
  function startDaily() {
    setActiveDailyDate(today);
    const id = "daily:" + today;
    if (!saveRef.current.runs[id])
      storeRun(newRun(id, today, "daily", dailyPuzzles(today)));
    navigate("daily");
  }
  function startPractice(choice: Difficulty | "mix" = difficulty) {
    const index = saveRef.current.practiceIndex + 1;
    const d =
      choice === "mix"
        ? (["easy", "medium", "hard"] as const)[index % 3]
        : choice;
    const id = "practice:" + Date.now() + ":" + index;
    const run = newRun(id, today, "practice", [practicePuzzle(d, index)]);
    change((s) => ({
      ...s,
      practiceIndex: index,
      runs: { ...s.runs, [id]: run },
    }));
    setPracticeId(id);
    setResetPractice(false);
    navigate("practice");
  }
  function startArchive(date: string) {
    const previous = Object.values(saveRef.current.runs)
      .filter((r) => r.mode === "archive" && r.date === date)
      .at(-1);
    const id =
      previous && !isComplete(previous)
        ? previous.id
        : "archive:" + date + ":" + Date.now();
    if (!saveRef.current.runs[id])
      storeRun(newRun(id, date, "archive", dailyPuzzles(date)));
    setArchiveId(id);
    navigate("archive/play/" + date);
  }
  function playCustom(puzzle: Puzzle) {
    const previous = Object.values(saveRef.current.runs)
      .filter(
        (r) => r.mode === "challenge" && r.rounds[0].puzzle.id === puzzle.id,
      )
      .at(-1);
    const id =
      previous && !isComplete(previous)
        ? previous.id
        : "challenge:" + puzzle.id + ":" + Date.now();
    if (!saveRef.current.runs[id])
      storeRun(newRun(id, today, "challenge", [puzzle]));
    navigate("challenge-play/" + puzzle.id);
  }
  const daily = save.runs["daily:" + today];
  const currentDaily = Object.values(save.runs)
    .filter((r) => r.mode === "daily" && !isComplete(r))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  let run: Run | undefined;
  if (path === "daily")
    run = save.runs["daily:" + activeDailyDate] ?? currentDaily ?? daily;
  if (path === "practice")
    run = practiceId
      ? save.runs[practiceId]
      : Object.values(save.runs)
          .filter((r) => r.mode === "practice")
          .at(-1);
  if (path.startsWith("archive/play/"))
    run =
      archiveId &&
      save.runs[archiveId]?.date === path.slice("archive/play/".length)
        ? save.runs[archiveId]
        : Object.values(save.runs)
            .filter(
              (r) =>
                r.mode === "archive" &&
                r.date === path.slice("archive/play/".length),
            )
            .at(-1);
  if (path.startsWith("challenge-play/"))
    run = Object.values(save.runs)
      .filter(
        (r) =>
          r.mode === "challenge" &&
          r.rounds[0].puzzle.id === path.slice("challenge-play/".length),
      )
      .at(-1);
  function gameContent(r: Run) {
    return (
      <>
        {r.mode === "practice" && (
          <div className="practice-intro">
            <header className="quiet-heading">
              <p className="eyebrow">PLAY AS LONG AS YOU LIKE</p>
              <h1>Practice.</h1>
              <p className="editorial">No streaks. No waiting. Just words.</p>
            </header>
            <section className="practice-toolbar" aria-label="Practice options">
              <div
                className="difficulty-tabs"
                role="group"
                aria-label="Practice difficulty"
              >
                {(["easy", "medium", "hard", "mix"] as const).map((choice) => (
                  <button
                    key={choice}
                    className={difficulty === choice ? "selected" : "secondary"}
                    aria-pressed={difficulty === choice}
                    onClick={() => {
                      setDifficulty(choice);
                      startPractice(choice);
                    }}
                  >
                    {choice === "mix"
                      ? "Random"
                      : choice[0].toUpperCase() + choice.slice(1)}
                  </button>
                ))}
              </div>
              <label className="visually-hidden">
                Difficulty
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as Difficulty | "mix")
                  }
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="mix">Random mix</option>
                </select>
              </label>
            </section>
          </div>
        )}
        <div className="play-topline">
          {r.mode === "challenge" && isComplete(r) && (
            <button
              className="text-button"
              onClick={() => playCustom(r.rounds[0].puzzle)}
            >
              Replay challenge
            </button>
          )}
        </div>
        {r.date !== today && r.mode === "daily" && (
          <div className="notice">
            You’re finishing {r.date}’s run. Your progress is safe.{" "}
            <button
              onClick={() => {
                startDaily();
              }}
            >
              Play today’s puzzle
            </button>
          </div>
        )}
        {resetPractice && (
          <div className="inline-confirm panel">
            <p>
              Restart this practice round? Attempts and its Nudge will be
              cleared. The new attempt is recorded separately.
            </p>
            <button
              onClick={() => {
                const id = "practice:" + Date.now() + ":restart";
                const next = newRun(id, today, "practice", [
                  r.rounds[0].puzzle,
                ]);
                storeRun(next);
                setPracticeId(id);
                setResetPractice(false);
              }}
            >
              Restart
            </button>
            <button
              className="secondary"
              onClick={() => setResetPractice(false)}
            >
              Keep playing
            </button>
          </div>
        )}
        <Game
          key={r.id}
          run={r}
          onChange={storeRun}
          onHome={() => navigate("home")}
          onAnother={() => startPractice()}
          streak={stats.currentStreak}
          bestDaily={stats.bestScore}
          sound={save.settings.sound}
        />
        {r.mode === "practice" && (
          <section className="practice-followup">
            <nav className="supporting-nav" aria-label="Practice actions">
              <button className="text-button" onClick={() => startPractice()}>
                New puzzle
              </button>
              <button
                className="text-button"
                onClick={() => setResetPractice(true)}
              >
                Restart round
              </button>
              <a href="#/stats">Practice stats</a>
            </nav>
            <p className="practice-record">
              {stats.practiceCompleted} completed · Best scores: Easy{" "}
              {stats.practiceByDifficulty.easy.bestScore} / Medium{" "}
              {stats.practiceByDifficulty.medium.bestScore} / Hard{" "}
              {stats.practiceByDifficulty.hard.bestScore}
            </p>
            <details className="practice-notebook">
              <summary>Recent practice</summary>
              {Object.values(save.runs)
                .filter((p) => p.mode === "practice" && isComplete(p))
                .slice(-8)
                .reverse()
                .map((p) => (
                  <div className="history-row" key={p.id}>
                    <span>{p.rounds[0].puzzle.difficulty}</span>
                    <span>
                      {p.rounds[0].status} · {p.rounds[0].guesses.length}/6
                    </span>
                    <strong>{totalScore(p)} pts</strong>
                  </div>
                ))}
            </details>
          </section>
        )}
      </>
    );
  }
  let page;
  if (path === "home")
    page = (
      <Home
        save={save}
        today={today}
        daily={daily}
        startDaily={startDaily}
        onChange={change}
      />
    );
  else if (path === "daily" && run) page = gameContent(run);
  else if (path === "daily/today" && daily) page = gameContent(daily);
  else if (path === "daily")
    page = (
      <section className="quiet-page introduction">
        <header className="quiet-heading">
          <p className="eyebrow">TODAY’S GAME / THREE ROUNDS</p>
          <h1>One word. Every rule.</h1>
          <p className="editorial">
            Find any English word that fits the conditions.
          </p>
        </header>
        <p>
          Six valid guesses per round. Any accepted word satisfying every rule
          wins.
        </p>
        <button onClick={startDaily}>Start Daily Run</button>
      </section>
    );
  else if (path === "practice")
    page = run ? (
      gameContent(run)
    ) : (
      <section className="quiet-page practice-start">
        <header className="quiet-heading">
          <p className="eyebrow">PLAY AS LONG AS YOU LIKE</p>
          <h1>Practice.</h1>
          <p className="editorial">No streaks. No waiting. Just words.</p>
        </header>
        <div className="panel">
          <label className="form-field">
            Choose your challenge
            <select
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value as Difficulty | "mix")
              }
            >
              <option value="mix">Random mix</option>
              <option value="easy">Easy · 3 rules</option>
              <option value="medium">Medium · 4 rules</option>
              <option value="hard">Hard · 5 rules</option>
            </select>
          </label>
          <button onClick={() => startPractice()}>Start practice →</button>
        </div>
        <p className="muted">
          {stats.practiceCompleted} practice rounds completed. Your daily streak
          stays separate.
        </p>
      </section>
    );
  else if (path === "create") page = <CreatorScreen onPlay={playCustom} />;
  else if (path === "stats") page = <StatsScreen save={save} />;
  else if (path === "achievements") page = <AchievementsScreen save={save} />;
  else if (path === "archive")
    page = <ArchiveScreen save={save} onPlay={startArchive} />;
  else if (path.startsWith("archive/play/") && run) page = gameContent(run);
  else if (path === "settings")
    page = (
      <SettingsScreen
        save={save}
        onChange={(s) => {
          change(s);
          setPracticeId(undefined);
          setArchiveId(undefined);
        }}
      />
    );
  else if (path === "help")
    page = (
      <div className="page">
        <HowTo
          onDone={() => {
            change((s) => ({ ...s, onboarding: true }));
            startDaily();
          }}
        />
      </div>
    );
  else if (path.startsWith("challenge/")) {
    try {
      const puzzle = decodeChallenge(path.slice(10));
      page = (
        <section className="quiet-page challenge-introduction">
          <header className="quiet-heading">
            <p className="eyebrow">A FRIEND CHALLENGE</p>
            <h1>Your move.</h1>
            <p className="editorial">
              Find a real word that matches all these rules.
            </p>
          </header>
          <p className="challenge-allowance">
            {puzzle.rules.length} rules · Six guesses · Any accepted word that
            fits wins.
          </p>
          <ChallengeIntro puzzle={puzzle} onPlay={() => playCustom(puzzle)} />
        </section>
      );
    } catch {
      page = <Recovery challenge />;
    }
  } else if (path.startsWith("challenge-play/") && run) page = gameContent(run);
  else page = <Recovery />;
  const focusedScreen =
    path === "home" ||
    path === "daily" ||
    path === "daily/today" ||
    path === "practice" ||
    path.startsWith("archive/play/") ||
    path.startsWith("challenge-play/");
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          content.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#/home" aria-label="Loophole home">
          loophole<span aria-hidden="true">.</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV.slice(0, 5).map(([key]) => (
            <a
              key={key}
              href={"#/" + key}
              aria-current={path === key ? "page" : undefined}
              className={path === key ? "current" : ""}
            >
              {key === "stats" ? "stats" : key}
            </a>
          ))}
        </nav>
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          aria-controls={menu ? "full-navigation" : undefined}
          onClick={() => setMenu((value) => !value)}
        >
          {menu ? (
            <span aria-hidden="true">×</span>
          ) : (
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22">
              <path
                d="M3 5h16M3 11h16M3 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </button>
      </header>
      <main id="main" ref={content} tabIndex={-1}>
        {menu ? (
          <nav
            id="full-navigation"
            className="menu-page"
            aria-label="More navigation"
          >
            <p className="eyebrow">MENU</p>
            {NAV.map(([key, label]) => (
              <a
                key={key}
                href={"#/" + key}
                aria-current={path === key ? "page" : undefined}
                onClick={() => {
                  setMenu(false);
                  requestAnimationFrame(() => content.current?.focus());
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        ) : (
          <>
            {recoveryWarning && (
              <div className="notice" role="alert">
                A damaged save was retained for recovery. Import a valid backup
                in <a href="#/settings">Settings</a>.
                <button
                  className="text-button"
                  onClick={() => setRecoveryWarning(false)}
                >
                  Dismiss
                </button>
              </div>
            )}
            {storageWarning && (
              <div className="notice" role="alert">
                This browser can’t save progress. Keep this tab open and export
                a backup in Settings.
              </div>
            )}
            {update && (
              <div className="notice" role="status">
                A new version is ready. Your progress is saved.
                <button onClick={applyUpdate}>Update when ready</button>
                <button
                  className="text-button"
                  onClick={() => setUpdate(false)}
                >
                  Later
                </button>
              </div>
            )}
            <Suspense
              fallback={
                <section
                  className="quiet-page loading-state"
                  role="status"
                  aria-live="polite"
                >
                  <p className="eyebrow">ONE MOMENT</p>
                  <p>Your puzzle is opening.</p>
                </section>
              }
            >
              {page}
            </Suspense>
            {achievementNotice && (
              <div className="achievement-notice" role="status">
                <a href="#/achievements">{achievementNotice}</a>
                <button
                  className="text-button"
                  aria-label="Dismiss achievement notification"
                  onClick={() => setAchievementNotice("")}
                >
                  Dismiss
                </button>
              </div>
            )}
          </>
        )}
      </main>
      {!menu && (
        <footer
          className={"site-footer" + (focusedScreen ? " compact-footer" : "")}
        >
          {!focusedScreen && (
            <nav aria-label="Footer navigation">
              <a href="#/daily">Daily</a>
              <a href="#/practice">Practice</a>
              <a href="#/help">How to play</a>
            </nav>
          )}
          <small>
            <span>v{version}</span>
          </small>
        </footer>
      )}
    </>
  );
}

import { describeRule } from "./engine/rules";
function ChallengeIntro({
  puzzle,
  onPlay,
}: {
  puzzle: Puzzle;
  onPlay: () => void;
}) {
  return (
    <div className="challenge-preview">
      <ol className="rule-list">
        {puzzle.rules.map((r, i) => (
          <li key={i}>
            <span className="rule-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{describeRule(r)}</span>
          </li>
        ))}
      </ol>
      <p className="muted">
        Verified against the common-word dictionary. No single target answer.
      </p>
      <button onClick={onPlay}>Play Challenge</button>
    </div>
  );
}
function Recovery({ challenge = false }: { challenge?: boolean }) {
  return (
    <section className="quiet-page recovery">
      <header className="quiet-heading">
        <p className="eyebrow">THE LINK DOESN’T WORK</p>
        <h1>{challenge ? "A missing loophole." : "A missing page."}</h1>
        <p className="editorial">
          {challenge
            ? "The challenge link may be incomplete or out of date."
            : "This page seems to have slipped away."}
        </p>
      </header>
      <div className="recovery-actions">
        <a className="button" href="#/daily">
          Back to today’s game
        </a>
        <a className="button secondary" href="#/create">
          Create a challenge
        </a>
      </div>
      <p className="recovery-help">
        {challenge
          ? "Nothing was changed in your saved progress."
          : "Your saved progress is still here."}
      </p>
    </section>
  );
}
