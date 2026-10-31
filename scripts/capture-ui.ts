/** Capture real, reproducible game states for the 18 approved design references. */
import { chromium, type Browser, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { defaultSave, STORAGE_KEY } from "../src/engine/storage";
import { newRun, submitGuess } from "../src/engine/game";
import { dailyPuzzles, practicePuzzle } from "../src/engine/puzzles";
import { commonWords } from "../src/engine/dictionary";
import { evaluatePuzzle } from "../src/engine/rules";
import { encodeChallenge, decodeChallenge } from "../src/engine/challenges";
import { updateAchievements } from "../src/engine/stats";
import type { Run, Save } from "../src/engine/types";
const BASE = process.env.CAPTURE_BASE ?? "http://127.0.0.1:4173/Loophole/";
const DIR = "reports/visual";
const DAY = "2026-11-01";
const figures: { file: string; reference: string; state: string }[] = [];
const seed = () => ({
  ...defaultSave(),
  onboarding: true,
  settings: {
    ...defaultSave().settings,
    theme: "dark" as const,
    motion: false,
  },
});
function complete(run: Run, misses = [0, 1, 2]): Run {
  const rounds = run.rounds.map((round, index) => {
    for (const word of commonWords
      .filter((w) => !evaluatePuzzle(w, round.puzzle.rules).every(Boolean))
      .slice(0, misses[index] ?? 0))
      round = submitGuess(round, word).round;
    return submitGuess(round, round.puzzle.solutions[0]).round;
  });
  return {
    ...run,
    rounds,
    current: rounds.length - 1,
    completedAt: run.date + "T12:00:00Z",
  };
}
async function capture(
  browser: Browser,
  file: string,
  route: string,
  save: Save,
  state: string,
  mobile = false,
  action?: (p: Page) => Promise<void>,
) {
  const context = await browser.newContext({
    viewport: { width: mobile ? 390 : 1360, height: mobile ? 844 : 850 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date(DAY + "T12:00:00Z") });
  await page.addInitScript(
    ({ save, key }) => localStorage.setItem(key, JSON.stringify(save)),
    { save: updateAchievements(save, DAY + "T12:00:00Z"), key: STORAGE_KEY },
  );
  await page.goto(BASE + "#/" + route);
  await page.locator("main h1,main h2").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (action) await action(page);
  await page.screenshot({
    path: `${DIR}/${file}.png`,
    fullPage: true,
    animations: "disabled",
  });
  figures.push({ file: `${file}.png`, reference: file.slice(0, 2), state });
  await context.close();
}
await mkdir(DIR, { recursive: true });
const browser = await chromium.launch(
  !process.env.CI && existsSync("/usr/bin/chromium")
    ? { executablePath: "/usr/bin/chromium" }
    : {},
);
try {
  await capture(
    browser,
    "01-home",
    "home",
    seed(),
    "New visitor; example rules are explanatory, not today’s puzzle.",
  );
  const daily = newRun("daily:" + DAY, DAY, "daily", dailyPuzzles(DAY));
  const playing = seed();
  playing.runs[daily.id] = daily;
  await capture(
    browser,
    "02-daily-warm-up",
    "daily",
    playing,
    "Actual calibrated November 1 Warm-Up.",
  );
  const won = seed();
  won.runs[daily.id] = {
    ...daily,
    rounds: [
      submitGuess(daily.rounds[0], daily.rounds[0].puzzle.solutions[0]).round,
      ...daily.rounds.slice(1),
    ],
  };
  await capture(
    browser,
    "03-round-completed",
    "daily",
    won,
    "Actual accepted common word, authoritative rule checks and 100 points.",
  );
  const finished = seed();
  finished.runs[daily.id] = complete(daily, [1, 2, 0]);
  await capture(
    browser,
    "04-daily-results",
    "daily",
    finished,
    "Actual completed run: engine-derived points and attempts.",
  );
  const practice = seed();
  const practiceRun = newRun("practice:visual", DAY, "practice", [
    practicePuzzle("medium", 2),
  ]);
  practice.runs[practiceRun.id] = practiceRun;
  await capture(
    browser,
    "05-practice",
    "practice",
    practice,
    "Verified medium practice pool selected through the real difficulty control.",
    false,
    async (page) => {
      await page
        .getByRole("group", { name: "Practice difficulty" })
        .getByRole("button", { name: "Medium", exact: true })
        .click();
      await page.getByLabel("Your way through", { exact: true }).waitFor();
    },
  );
  await capture(
    browser,
    "06-create-challenge",
    "create",
    seed(),
    "Validated default builder rules and live common solutions.",
  );
  const encoded = encodeChallenge([
    { type: "length", value: 5 },
    { type: "starts", value: "b" },
    { type: "contains", value: "r" },
  ]);
  const puzzle = decodeChallenge(encoded);
  const friend = seed();
  const friendRun = newRun("challenge:visual", DAY, "challenge", [puzzle]);
  friend.runs[friendRun.id] = friendRun;
  await capture(
    browser,
    "07-friend-challenge",
    "challenge-play/" + puzzle.id,
    friend,
    "A genuinely validated shared challenge with no target word.",
  );
  const history = seed();
  for (let i = 1; i <= 14; i++) {
    const date = new Date(Date.parse(DAY + "T00:00:00Z") - i * 86400000)
      .toISOString()
      .slice(0, 10);
    const r = newRun("daily:" + date, date, "daily", dailyPuzzles(date));
    history.runs[r.id] = complete(r, [i % 3, i % 4, i % 5]);
  }
  await capture(
    browser,
    "08-statistics",
    "stats",
    history,
    "Fourteen actual engine-completed fixture runs; numbers are calculated from these records.",
  );
  await capture(
    browser,
    "09-achievements",
    "achievements",
    history,
    "Achievements earned from the same legitimate completed fixture runs.",
  );
  await capture(
    browser,
    "10-archive",
    "archive",
    history,
    "Historical date selection with preserved official results.",
  );
  await capture(
    browser,
    "11-how-to-play",
    "help",
    seed(),
    "Interactive STAR example with actual rule evaluation.",
  );
  await capture(
    browser,
    "12-settings",
    "settings",
    seed(),
    "Quiet dark theme and original persistence options.",
  );
  const failed = seed();
  const failedRun = complete(daily, [0, 0, 0]);
  delete failedRun.completedAt;
  let hard = daily.rounds[2];
  const wrong = commonWords
    .filter((w) => !evaluatePuzzle(w, hard.puzzle.rules).every(Boolean))
    .slice(0, 6);
  for (const w of wrong.slice(0, 5)) hard = submitGuess(hard, w).round;
  failedRun.rounds[2] = hard;
  failed.runs[daily.id] = failedRun;
  await capture(
    browser,
    "13-round-unsuccessful",
    "daily",
    failed,
    "Six actual wrong dictionary words; verified example answers and zero points.",
    false,
    async (page) => {
      await page.getByLabel("Your way through", { exact: true }).fill(wrong[5]);
      await page.getByRole("button", { name: "Submit word" }).click();
      await page.getByRole("heading", { name: "Not quite." }).waitFor();
    },
  );
  await capture(
    browser,
    "14-invalid-challenge",
    "challenge/malformed",
    seed(),
    "Sanitized malformed-link recovery.",
  );
  await capture(
    browser,
    "15-mobile-home",
    "home",
    seed(),
    "390px mobile home without decoration.",
    true,
  );
  await capture(
    browser,
    "16-mobile-daily",
    "daily",
    playing,
    "390px calibrated Warm-Up input and attempts.",
    true,
  );
  await capture(
    browser,
    "17-mobile-creator",
    "create",
    seed(),
    "390px rule builder and validation.",
    true,
  );
  await capture(
    browser,
    "18-mobile-navigation",
    "home",
    seed(),
    "390px complete navigation menu.",
    true,
    async (page) => {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("navigation", { name: "More navigation" }).waitFor();
    },
  );
  await writeFile(
    `${DIR}/index.json`,
    JSON.stringify(
      {
        date: DAY,
        desktop: "1360×850 @2x",
        mobile: "390×844 @2x",
        note: "Screenshots use real engine-generated fixture runs. Numeric results are computed, not copied from illustrative Figma statistics.",
        figures,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Captured ${figures.length} approved reference states in ${DIR}.`,
  );
} finally {
  await browser.close();
}
