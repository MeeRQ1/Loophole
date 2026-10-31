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
  ["daily", "Daily Run"],
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
          .filter((r) => r.mode === "practice" && !isComplete(r))
          .at(-1);
  if (path.startsWith("archive/play/"))
    run = archiveId
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
          <section className="practice-toolbar" aria-label="Practice options">
            <label>
              Difficulty{" "}
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as Difficulty | "mix")
                }
              >
                <option value="mix">Random mix</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <button className="secondary" onClick={() => startPractice()}>
              Another puzzle →
            </button>
            <small>
              {stats.practiceCompleted} completed · Best: E{" "}
              {stats.practiceByDifficulty.easy.bestScore} / M{" "}
              {stats.practiceByDifficulty.medium.bestScore} / H{" "}
              {stats.practiceByDifficulty.hard.bestScore}
            </small>
          </section>
        )}
        <div className="play-topline">
          <button className="text-button" onClick={() => navigate("home")}>
            ← The journal
          </button>
          {r.mode === "challenge" && isComplete(r) && (
            <button
              className="text-button"
              onClick={() => playCustom(r.rounds[0].puzzle)}
            >
              Replay challenge
            </button>
          )}
          {r.mode === "practice" && (
            <button
              className="text-button"
              onClick={() => setResetPractice(true)}
            >
              Restart round
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
      <section className="page panel">
        <p className="eyebrow">TODAY’S THREE PUZZLES</p>
        <h1>Find your way through.</h1>
        <p>
          Six guesses per round. Any dictionary word that fits every rule wins.
        </p>
        <button onClick={startDaily}>Start Daily Run →</button>
      </section>
    );
  else if (path === "practice")
    page = run ? (
      gameContent(run)
    ) : (
      <section className="page">
        <p className="eyebrow">AN OPEN NOTEBOOK</p>
        <h1>Room to experiment.</h1>
        <p>No clock. No streak. Just you and the rules.</p>
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
        <section className="page">
          <p className="eyebrow">A FRIEND LEFT YOU A LOOPHOLE</p>
          <h1>Your move.</h1>
          <p>
            {puzzle.rules.length} rules · Six guesses · Any accepted word that
            satisfies every rule wins.
          </p>
          <ChallengeIntro puzzle={puzzle} onPlay={() => playCustom(puzzle)} />
        </section>
      );
    } catch {
      page = <Recovery challenge />;
    }
  } else if (path.startsWith("challenge-play/") && run) page = gameContent(run);
  else page = <Recovery />;
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          content.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="wordmark" href="#/home" aria-label="Loophole home">
          loophole<span>.</span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV.slice(0, 2).map(([p, label]) => (
            <a className={path === p ? "current" : ""} key={p} href={"#/" + p}>
              {label}
            </a>
          ))}
          <a href="#/create">Challenge a friend →</a>
        </nav>
        <div className="header-tools">
          <a
            className="icon-button"
            href="#/stats"
            aria-label="Your statistics"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 17V10M10 17V3M16 17V7"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </a>
          <a className="icon-button" href="#/help" aria-label="How to play">
            ?
          </a>
          <button
            className="icon-button menu-toggle"
            aria-label="Open navigation"
            aria-expanded={menu}
            aria-controls="full-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? "×" : "☰"}
          </button>
        </div>
      </header>
      {menu && (
        <nav
          id="full-navigation"
          className="menu-panel"
          aria-label="More navigation"
        >
          {NAV.map(([p, label]) => (
            <a
              key={p}
              href={"#/" + p}
              aria-current={path === p ? "page" : undefined}
            >
              {label}
              <span>→</span>
            </a>
          ))}
        </nav>
      )}
      {recoveryWarning && (
        <div className="notice" role="alert">
          A damaged save was found. The original has been retained in browser
          storage for recovery; you can import a valid backup in Settings.{" "}
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
          This browser can’t save progress. Keep this tab open and export a
          backup in Settings.
        </div>
      )}
      {update && (
        <div className="notice">
          A fresh version is ready. Your progress is saved.{" "}
          <button onClick={() => applyUpdate()}>Update when ready</button>
          <button className="text-button" onClick={() => setUpdate(false)}>
            Later
          </button>
        </div>
      )}
      {achievementNotice && (
        <div className="achievement-toast" role="status">
          <a href="#/achievements">✳ {achievementNotice}</a>
          <button
            className="text-button"
            aria-label="Dismiss achievement notification"
            onClick={() => setAchievementNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <main id="main" ref={content} tabIndex={-1}>
        <Suspense
          fallback={
            <section className="page panel" role="status" aria-live="polite">
              <p className="eyebrow">TURNING THE PAGE</p>
              <h1>One moment…</h1>
              <p>Your notebook is opening.</p>
            </section>
          }
        >
          {page}
        </Suspense>
      </main>
      <footer className="site-footer">
        <a className="footer-brand" href="#/home">
          loophole.
        </a>
        <span>A small daily ritual for a curious mind.</span>
        <nav aria-label="Footer navigation">
          <a href="#/archive">Archive</a>
          <a href="#/achievements">Achievements</a>
          <a href="#/settings">Settings</a>
          <a href="#/help">How to play</a>
        </nav>
        <small>
          No accounts. No ads. Just possibilities. <span>v{version}</span>
        </small>
      </footer>
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
    <div className="panel">
      <ol className="example-rules">
        {puzzle.rules.map((r, i) => (
          <li key={i}>{describeRule(r)}</li>
        ))}
      </ol>
      <p className="muted">
        Verified against the common-word dictionary. No single target answer.
      </p>
      <button onClick={onPlay}>Play Challenge →</button>
    </div>
  );
}
function Recovery({ challenge = false }: { challenge?: boolean }) {
  return (
    <section className="recovery page">
      <p className="eyebrow">A LOOSE PAGE</p>
      <h1>
        {challenge
          ? "That challenge doesn’t quite fit."
          : "Nothing on this page. Yet."}
      </h1>
      <p>
        {challenge
          ? "This link is malformed, unsupported, or has too few common solutions. Ask your friend for a fresh link."
          : "Let’s get you back to a puzzle."}
      </p>
      <a className="button" href="#/home">
        Back to the journal →
      </a>
    </section>
  );
}
