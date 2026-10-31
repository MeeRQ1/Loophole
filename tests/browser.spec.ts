import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Puzzle, Rule, Run, Save } from "../src/engine/types";
import { evaluatePuzzle } from "../src/engine/rules";
const commonWords = JSON.parse(
  readFileSync(new URL("../src/data/common.json", import.meta.url), "utf8"),
) as string[];
const bank = JSON.parse(
  readFileSync(new URL("../src/data/puzzles.json", import.meta.url), "utf8"),
) as { puzzles: Record<string, Puzzle[]> };
const calibrated = JSON.parse(
  readFileSync(new URL("../src/data/puzzles-v2.json", import.meta.url), "utf8"),
) as { puzzles: Record<string, Puzzle[]> };
const DAY = "2026-10-31";
const puzzles = ["easy", "medium", "hard"].map((d) => bank.puzzles[d][30]);
const nextRound = (page: Page) =>
  page.getByRole("button", { name: /^Next: / }).click();
const showResults = (page: Page) =>
  page.getByRole("button", { name: "See today’s results" }).click();
async function submit(page: Page, word: string) {
  await page.getByLabel("Your way through", { exact: true }).fill(word);
  await page.getByRole("button", { name: "Submit word", exact: true }).click();
}
async function startDaily(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Play today’s game" }).click();
}
async function saved(page: Page): Promise<Save> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("loophole.save.v2")!),
  );
}
async function finish(page: Page, words: Puzzle[]) {
  for (const [index, puzzle] of words.entries()) {
    await submit(page, puzzle.solutions[0]);
    if (index < words.length - 1) await nextRound(page);
    else await showResults(page);
  }
}
async function challengeLink(page: Page) {
  await page.goto("./#/create");
  await expect(
    page.getByRole("heading", { name: "This challenge works." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create shareable link" }).click();
  return page.getByLabel("Challenge link", { exact: true }).inputValue();
}
function challengeAnswer(url: string) {
  const rules = (
    JSON.parse(
      Buffer.from(url.split("/challenge/")[1], "base64url").toString(),
    ) as { r: Rule[] }
  ).r;
  return commonWords.find((w) => evaluatePuzzle(w, rules).every(Boolean))!;
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(`${DAY}T12:00:00Z`) });
});

test("first visit guide, all Daily rounds, invalid and duplicate words, Nudge, refresh and sharing", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./#/help");
  await page.getByText("Try another word", { exact: true }).click();
  await page.getByRole("button", { name: "SEED", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "does not meet every rule",
  );
  await page.getByRole("button", { name: "I’ve got it — let’s play" }).click();
  await expect(
    page.getByRole("heading", { name: "Warm-Up", exact: true }),
  ).toBeVisible();
  await submit(page, "zzzzzzzzzzzz");
  await expect(
    page.getByRole("status").filter({ hasText: /isn’t in our dictionary/ }),
  ).toBeVisible();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  const incorrect = commonWords.find(
    (w) => !evaluatePuzzle(w, puzzles[0].rules).every(Boolean),
  )!;
  await submit(page, incorrect);
  await expect(page.getByText("5 tries remaining")).toBeVisible();
  await submit(page, incorrect);
  await expect(
    page.getByRole("status").filter({ hasText: /already tried/ }),
  ).toBeVisible();
  await expect(page.getByText("5 tries remaining")).toBeVisible();
  await page.getByRole("button", { name: "Need a hint?" }).click();
  await expect(page.getByText(/It costs/)).toContainText("25 points");
  await page.getByRole("button", { name: "Use Nudge", exact: true }).click();
  const nudge = await page.locator(".nudge-note").innerText();
  expect(nudge).toMatch(/One possible answer/);
  await page.reload();
  await expect(page.getByText("5 tries remaining")).toBeVisible();
  await expect(page.locator(".nudge-note")).toHaveText(nudge);
  await submit(page, puzzles[0].solutions[0]);
  await expect(
    page.getByRole("heading", { name: "That fits.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".round-receipt")).toContainText("2 guesses");
  await expect(page.locator(".round-receipt")).toContainText("+63 points");
  await nextRound(page);
  await submit(page, puzzles[1].solutions[0]);
  await nextRound(page);
  await submit(page, puzzles[2].solutions[0]);
  await showResults(page);
  await expect(
    page.getByRole("heading", { name: "Today’s results." }),
  ).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("463");
  await expect(page.locator(".streak-note")).toContainText("1 day");
  await page.getByRole("button", { name: "Copy results", exact: true }).click();
  await expect(page.locator(".share-status")).toHaveText(
    "Results ready to share.",
  );
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("463");
  expect(shared).toContain("https://meerq1.github.io/Loophole/");
  expect(shared.split("\n").length).toBeGreaterThan(8);
  for (const p of puzzles)
    expect(shared.toLowerCase()).not.toContain(p.solutions[0]);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save image" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  await page.reload();
  await expect(page.locator(".result-score")).toContainText("463");
});

test("Practice selection, resolution, another round, restart, and no daily streak pollution", async ({
  page,
}) => {
  await page.goto("./#/practice");
  await page.getByLabel("Choose your challenge").selectOption("hard");
  await page.getByRole("button", { name: "Start practice" }).click();
  const first = Object.values((await saved(page)).runs).find(
    (r) => r.mode === "practice",
  )!;
  expect(first.rounds[0].puzzle.difficulty).toBe("hard");
  await submit(page, first.rounds[0].puzzle.solutions[0]);
  await showResults(page);
  await expect(
    page.getByRole("heading", { name: "Practice results." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practice instead" }).click();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Practice actions" })
    .getByRole("button", { name: "Restart round" })
    .click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  await page
    .getByRole("group", { name: "Practice difficulty" })
    .getByRole("button", { name: "Easy", exact: true })
    .click();
  const latest = Object.values((await saved(page)).runs)
    .filter((r) => r.mode === "practice")
    .at(-1)!;
  expect(latest.rounds[0].puzzle.difficulty).toBe("easy");
  await page.reload();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  await page.goto("./#/stats");
  await expect(
    page.locator(".metric").filter({ hasText: /day streak/ }),
  ).toContainText("0");
});

test("create and play a friend challenge, reject malformed links, and preserve official Daily results", async ({
  page,
}) => {
  const url = await challengeLink(page);
  const answer = challengeAnswer(url);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Your move." })).toBeVisible();
  await page.getByRole("button", { name: "Play Challenge" }).click();
  await submit(page, answer);
  await showResults(page);
  await expect(
    page.getByRole("heading", { name: "Your challenge results." }),
  ).toBeVisible();
  expect(
    Object.values((await saved(page)).runs).filter((r) => r.mode === "daily"),
  ).toHaveLength(0);
  await page.goto("./#/challenge/malformed");
  await expect(
    page.getByRole("heading", { name: "A missing loophole." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to today’s game" }).click();
  await expect(
    page.getByRole("button", { name: "Start Daily Run" }),
  ).toBeVisible();
});

test("settings persist, export backup, and keyboard access remains available", async ({
  page,
}) => {
  await page.goto("./#/settings");
  await page
    .getByRole("radio", { name: "Dark", exact: true })
    .locator("..")
    .click();
  await page.getByText("High contrast", { exact: true }).click();
  await page.getByText("Reduced motion", { exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("checkbox", { name: "High contrast", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Reduced motion", exact: true }),
  ).toBeChecked();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved progress" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /loophole-backup-.*\.json$/,
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "More navigation" })
    .getByRole("link", { name: "Today’s game" })
    .click();
  await page.getByRole("button", { name: "Start Daily Run" }).click();
  await page
    .getByLabel("Your way through", { exact: true })
    .fill(puzzles[0].solutions[0]);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /^Next: / })).toBeVisible();
});

for (const width of [320, 375, 390, 768, 1360])
  test(`responsive layout stays within ${width}px on all main screens`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "practice",
      "create",
      "stats",
      "achievements",
      "archive",
      "settings",
      "help",
    ]) {
      await page.goto(`./#/${route}`);
      await expect(page.locator("main h1,main h2").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    await startDaily(page);
    await expect(
      page.getByRole("button", { name: "Submit word" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("navigation", { name: "More navigation" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });

test("production service worker precaches content and fonts for offline Daily, Practice and secondary screens", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Play today’s game" }).click();
  await submit(page, puzzles[0].solutions[0]);
  await expect(page.getByRole("button", { name: /^Next: / })).toBeVisible();
  await page.goto("./#/practice");
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toBeVisible();
  for (const route of ["create", "settings", "stats", "help"]) {
    await page.goto(`./#/${route}`);
    await expect(page.locator("main h1").first()).toBeVisible();
  }
  expect(
    await page.evaluate(async () =>
      Promise.all(
        [
          "dm-sans-variable.woff2",
          "instrument-serif-regular.woff2",
          "instrument-serif-italic.woff2",
        ].map(async (file) => {
          const response = await fetch("/Loophole/fonts/" + file, {
            cache: "reload",
          });
          return (
            response.ok && (await response.arrayBuffer()).byteLength > 1000
          );
        }),
      ),
    ),
  ).toEqual([true, true, true]);
  expect(
    await page.evaluate(async () => {
      await document.fonts.ready;
      return (
        document.fonts.check('16px "DM Sans"') &&
        document.fonts.check('16px "Instrument Serif"')
      );
    }),
  ).toBeTruthy();
});

test("six unsuccessful valid guesses fail honestly and allow Daily completion", async ({
  page,
}) => {
  await startDaily(page);
  const incorrect = commonWords
    .filter((w) => !evaluatePuzzle(w, puzzles[0].rules).every(Boolean))
    .slice(0, 6);
  for (const w of incorrect) await submit(page, w);
  await expect(page.getByRole("heading", { name: "Not quite." })).toBeVisible();
  await expect(
    page.getByText("This round earns 0 points. You can still finish the run."),
  ).toBeVisible();
  for (const word of puzzles[0].solutions.slice(0, 3))
    await expect(
      page
        .locator(".example-answers")
        .getByText(word.toUpperCase(), { exact: true }),
    ).toBeVisible();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toHaveCount(0);
  await nextRound(page);
  await submit(page, puzzles[1].solutions[0]);
  await nextRound(page);
  await submit(page, puzzles[2].solutions[0]);
  await showResults(page);
  await expect(page.locator(".result-score")).toContainText("400");
  await expect(page.locator(".streak-note")).toContainText("1 day");
  expect(
    (await saved(page)).runs["daily:" + DAY].rounds.map((r) => r.status),
  ).toEqual(["failed", "solved", "solved"]);
  await page.reload();
  await expect(page.getByText(/2 of 3 puzzles solved/)).toBeAttached();
});

test("two tabs converge concurrent valid guesses without regaining attempts", async ({
  page,
  context,
}) => {
  await startDaily(page);
  const second = await context.newPage();
  await second.clock.install({ time: new Date(`${DAY}T12:00:00Z`) });
  await second.goto("./#/daily");
  const wrong = commonWords
    .filter((w) => !evaluatePuzzle(w, puzzles[0].rules).every(Boolean))
    .slice(0, 2);
  await page.getByLabel("Your way through", { exact: true }).fill(wrong[0]);
  await second.getByLabel("Your way through", { exact: true }).fill(wrong[1]);
  await Promise.all([
    page.getByRole("button", { name: "Submit word" }).click(),
    second.getByRole("button", { name: "Submit word" }).click(),
  ]);
  await expect(page.getByText("4 tries remaining")).toBeVisible();
  await expect(second.getByText("4 tries remaining")).toBeVisible();
  await Promise.all([page.reload(), second.reload()]);
  await expect(page.getByText("4 tries remaining")).toBeVisible();
  await expect(second.getByText("4 tries remaining")).toBeVisible();
  await submit(second, wrong[0]);
  await expect(
    second.getByRole("status").filter({ hasText: /already tried/ }),
  ).toBeVisible();
  await expect(second.getByText("4 tries remaining")).toBeVisible();
  await submit(page, puzzles[0].solutions[0]);
  await expect(second.getByRole("button", { name: /^Next: / })).toBeVisible();
  await expect(second.locator(".round-receipt")).toContainText("+76 points");
  await expect(second.locator(".round-receipt")).toContainText("3 guesses");
  await second.close();
});

test("UTC midnight preserves the active run and offers an explicit switch to calibrated next-day content", async ({
  page,
}) => {
  await startDaily(page);
  const wrong = commonWords.find(
    (w) => !evaluatePuzzle(w, puzzles[0].rules).every(Boolean),
  )!;
  await submit(page, wrong);
  await page.clock.setSystemTime(new Date("2026-11-01T00:00:01Z"));
  await page.clock.runFor(1100);
  await expect(
    page.locator(".notice").filter({ hasText: /You’re finishing/ }),
  ).toContainText(DAY);
  await expect(page.getByText("5 tries remaining")).toBeVisible();
  await page.getByRole("button", { name: "Play today’s puzzle" }).click();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  const runs = (await saved(page)).runs;
  expect(runs["daily:2026-10-31"].rounds[0].guesses).toHaveLength(1);
  expect(runs["daily:2026-11-01"].rounds[0].guesses).toHaveLength(0);
  expect(runs["daily:2026-11-01"].rounds[0].puzzle.rules).toEqual(
    calibrated.puzzles.easy[0].rules,
  );
  expect(
    runs["daily:2026-11-01"].rounds[0].puzzle.rules.some(
      (r) =>
        r.type === "length" && Number(r.value) >= 4 && Number(r.value) <= 6,
    ),
  ).toBeTruthy();
  await page.reload();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  expect(
    (await saved(page)).runs["daily:2026-11-01"].rounds[0].guesses,
  ).toHaveLength(0);
});

test("archive completion and replay preserve original official record and streak", async ({
  page,
}) => {
  const archivedDate = "2026-10-30";
  const ap = ["easy", "medium", "hard"].map((d) => bank.puzzles[d][29]);
  await page.clock.setSystemTime(new Date(`${archivedDate}T12:00:00Z`));
  await startDaily(page);
  await finish(page, ap);
  await expect(page.locator(".result-score")).toContainText("500");
  const before = (await saved(page)).runs["daily:" + archivedDate];
  await page.clock.setSystemTime(new Date(`${DAY}T12:00:00Z`));
  await page.goto("./#/archive");
  await page.getByRole("button", { name: /Oct 30, 2026/ }).click();
  await expect(page.getByText(/Official record: 500/)).toBeVisible();
  await page.getByRole("button", { name: "Replay this day" }).click();
  await expect(page.locator(".quiet-heading .eyebrow")).toContainText(
    "ARCHIVE",
  );
  await finish(page, ap);
  await expect(page.locator(".result-score")).toContainText("500");
  await page.goto("./#/archive");
  await page.getByRole("button", { name: /Oct 30, 2026/ }).click();
  await expect(
    page.getByText("Latest archive result: 500 / 500"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay this edition" }).click();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  expect((await saved(page)).runs["daily:" + archivedDate]).toEqual(before);
  await page.goto("./#/stats");
  await expect(
    page.locator(".metric").filter({ hasText: /day streak/ }),
  ).toContainText("1");
  await page.getByText("The daily ledger", { exact: true }).click();
  await expect(page.getByText("Daily Runs started / completed")).toBeVisible();
  expect(
    Object.values((await saved(page)).runs).filter((r) => r.mode === "daily"),
  ).toHaveLength(1);
});

test("friend challenges replay identical rules with independent results", async ({
  page,
}) => {
  const url = await challengeLink(page);
  const answer = challengeAnswer(url);
  await page.goto(url);
  await page.getByRole("button", { name: "Play Challenge" }).click();
  const descriptions = await page
    .locator(".rule-list .rule-description")
    .allTextContents();
  await submit(page, answer);
  await showResults(page);
  await expect(
    page.getByRole("heading", { name: "Your challenge results." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replay challenge", exact: true })
    .click();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  expect(
    await page.locator(".rule-list .rule-description").allTextContents(),
  ).toEqual(descriptions);
  await page.reload();
  await expect(page.getByText("6 tries remaining")).toBeVisible();
  const runs = Object.values((await saved(page)).runs).filter(
    (r) => r.mode === "challenge",
  );
  expect(runs).toHaveLength(2);
  expect(runs.map((r) => r.rounds[0].status).sort()).toEqual([
    "playing",
    "solved",
  ]);
});

test("previously saved progress and explicit light preference survive the redesign", async ({
  page,
}) => {
  const legacy: Save = {
    version: 2,
    runs: {},
    settings: { theme: "light", contrast: false, motion: true, sound: false },
    onboarding: true,
    achievements: {},
    practiceIndex: 0,
  };
  const wrong = commonWords.find(
    (w) => !evaluatePuzzle(w, puzzles[0].rules).every(Boolean),
  )!;
  const run: Run = {
    id: "daily:" + DAY,
    date: DAY,
    mode: "daily",
    current: 0,
    rounds: puzzles.map((p, i) => ({
      puzzle: {
        id: `daily:${DAY}:${i}`,
        rules: p.rules,
        difficulty: p.difficulty,
        solutions: p.solutions,
        commonCount: p.commonCount,
      },
      guesses:
        i === 0
          ? [{ word: wrong, passes: evaluatePuzzle(wrong, p.rules) }]
          : [],
      hint: false,
      status: "playing",
    })),
  };
  legacy.runs[run.id] = run;
  await page.addInitScript(
    (value) => localStorage.setItem("loophole.save.v2", JSON.stringify(value)),
    legacy,
  );
  await page.goto("./#/daily");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("5 tries remaining")).toBeVisible();
  expect((await saved(page)).runs[run.id]).toEqual(run);
  await submit(page, puzzles[0].solutions[1]);
  await expect(page.getByRole("heading", { name: "That fits." })).toBeVisible();
  await expect(page.locator(".round-receipt")).toContainText("+88 points");
});
