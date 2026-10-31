import { useEffect, useState } from "react";
import { dateKey } from "../engine/puzzles";
import { isComplete } from "../engine/game";
import type { Run, Save, Rule } from "../engine/types";
import RuleList from "../components/RuleList";
const example: Rule[] = [
  { type: "length", value: 4 },
  { type: "starts", value: "s" },
  { type: "contains", value: "a" },
];
export default function Home({
  today,
  daily,
  startDaily,
}: {
  save: Save;
  today: string;
  daily?: Run;
  startDaily: () => void;
  onChange: (save: Save) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil(
      (Date.parse(dateKey(new Date(now)) + "T00:00:00Z") + 86400000 - now) /
        1000,
    ),
  );
  const countdown = [
    Math.floor(seconds / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(today + "T12:00:00Z"));
  return (
    <section className="quiet-home">
      <header className="home-heading">
        <p className="eyebrow">
          <span className="desktop-only">LOOPHOLE / A </span>DAILY WORD PUZZLE
        </p>
        <h1>
          One word.
          <span className="mobile-break" /> Every rule.
        </h1>
        <p className="editorial">
          Find any English word that fits
          <span className="mobile-break" /> every condition.
        </p>
      </header>
      <RuleList
        rules={example}
        className="home-rules"
        descriptions={["4 letters", "starts with S", "contains A"]}
      />
      <div className="home-actions">
        <button onClick={startDaily}>
          {daily
            ? isComplete(daily)
              ? "View today’s results"
              : "Continue today’s game"
            : "Play today’s game"}
        </button>
        <a className="button secondary" href="#/practice">
          Play unlimited
        </a>
      </div>
      <p className="daily-information">
        <span className="desktop-only">{dateLabel} · </span>3 rounds · 6 guesses
        each
      </p>
      <nav className="supporting-nav" aria-label="Home supporting navigation">
        <a href="#/help">How to play</a>
        <span aria-hidden="true">·</span>
        <a href="#/stats">Your stats</a>
        <span aria-hidden="true">·</span>
        <a href="#/archive">Archive</a>
      </nav>
      <p className="reset-information">
        Next daily in <time>{countdown}</time> · midnight UTC
      </p>
    </section>
  );
}
