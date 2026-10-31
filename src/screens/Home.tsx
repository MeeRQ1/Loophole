import { useEffect, useState } from "react";
import { dateKey, dayNumber } from "../engine/puzzles";
import { isComplete } from "../engine/game";
import type { Run, Save } from "../engine/types";

interface HomeProps {
  save: Save;
  today: string;
  daily?: Run;
  startDaily: () => void;
  onChange: (save: Save) => void;
}

function Countdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.ceil(
    (new Date(dateKey(new Date(now))).getTime() + 86400000 - now) / 1000,
  );
  return (
    <span className="mono">
      {String(Math.floor(seconds / 3600)).padStart(2, "0")}:
      {String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
    </span>
  );
}

export default function Home({
  save,
  today,
  daily,
  startDaily,
  onChange,
}: HomeProps) {
  return (
    <div className="home">
      <section className="home-intro">
        <p className="eyebrow">
          <span className="tiny-star">✳</span> A DAILY EXERCISE IN POSSIBILITY
        </p>
        <h1>
          A little wordplay.
          <br />A <em>way through.</em>
        </h1>
        <p className="intro-copy">
          A handful of rules. A word that fits them all.
          <br />
          There’s always more than one way through.
        </p>
        <div className="brand-orbit" aria-hidden="true">
          <span>o</span>
          <i>→</i>
          <small>
            THINK OUTSIDE.
            <br />
            STAY WITHIN.
          </small>
        </div>
      </section>
      {!save.onboarding && (
        <div className="onboarding-strip">
          <div>
            <strong>New here? You already know the words.</strong>
            <p>We’ll show you how to make the rules work.</p>
          </div>
          <button
            className="secondary"
            onClick={() => (location.hash = "/help")}
          >
            A 15-second guide →
          </button>
          <button
            className="text-button"
            onClick={() => onChange({ ...save, onboarding: true })}
          >
            Skip
          </button>
        </div>
      )}
      <section className="daily-feature">
        <div className="daily-card-top">
          <span className="eyebrow">THE DAILY RUN</span>
          <span className="edition">
            NO. {String(dayNumber(today)).padStart(3, "0")}
          </span>
        </div>
        <div className="daily-card-body">
          <div>
            <h2>
              Three rounds.
              <br />
              One curious mind.
            </h2>
            <p>Start easy. Stretch a little. Find the loophole.</p>
            <div className="daily-facts">
              <span>3 puzzles</span>
              <span>6 tries each</span>
              <span>500 possible points</span>
            </div>
            <button onClick={startDaily}>
              {daily
                ? isComplete(daily)
                  ? "See your results"
                  : "Continue Daily Run"
                : "Play Daily Run"}{" "}
              <span>→</span>
            </button>
          </div>
          <div className="daily-round-preview">
            {["Warm-Up", "The Stretch", "The Loophole"].map((label, i) => (
              <div key={label}>
                <span className="mono">0{i + 1}</span>
                <strong>{label}</strong>
                <small>
                  {daily?.rounds[i].status === "solved"
                    ? "✓ Solved"
                    : daily?.rounds[i].status === "failed"
                      ? "× Not solved"
                      : `${i + 3} rules`}
                </small>
              </div>
            ))}
          </div>
        </div>
        <div className="daily-card-bottom">
          <span>Fresh daily at midnight UTC</span>
          <span>
            Next in <Countdown />
          </span>
        </div>
      </section>
      <section className="home-extras">
        <a href="#/practice">
          <span className="mini-icon">∞</span>
          <div>
            <p className="eyebrow">NO WAITING NECESSARY</p>
            <h3>A little more practice.</h3>
            <p>Find your rhythm with endless puzzles.</p>
          </div>
          <span>→</span>
        </a>
        <a href="#/create">
          <span className="mini-icon">＋</span>
          <div>
            <p className="eyebrow">MAKE YOUR OWN RULES</p>
            <h3>Leave a friend a loophole.</h3>
            <p>Build a fair challenge. Pass it along.</p>
          </div>
          <span>→</span>
        </a>
      </section>
      <div className="home-bottom">
        <p>Small rules. Wide possibilities.</p>
        <a href="#/stats">
          Your journal <span>→</span>
        </a>
      </div>
    </div>
  );
}
