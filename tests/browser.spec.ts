import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Puzzle, Rule } from "../src/engine/types";
import { evaluatePuzzle } from "../src/engine/rules";
const commonWords = JSON.parse(
  readFileSync(new URL("../src/data/common.json", import.meta.url), "utf8"),
) as string[];
const bank = JSON.parse(
  readFileSync(new URL("../src/data/puzzles.json", import.meta.url), "utf8"),
) as { puzzles: Record<string, Puzzle[]> };

const DAY = "2026-10-31";
const puzzles = ["easy", "medium", "hard"].map(
  (difficulty) => bank.puzzles[difficulty][30],
);
async function submit(page: Page, word: string) {
  await page.getByLabel("Your way through", { exact: true }).fill(word);
  await page.getByRole("button", { name: "Submit word" }).click();
}
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(`${DAY}T12:00:00Z`) });
});

test("first visit guide, all Daily rounds, invalid and duplicate words, Nudge, refresh and sharing", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./");
  await page.getByRole("button", { name: "A 15-second guide" }).click();
  await page.getByRole("button", { name: "BANANA", exact: true }).click();
  await expect(page.getByText(/not satisfied/)).toBeVisible();
  await page.getByRole("button", { name: /Got it, let’s play/ }).click();
  await expect(
    page.getByRole("heading", { name: "Warm-Up", exact: true }),
  ).toBeVisible();
  await submit(page, "zzzzzzzzzzzz");
  await expect(
    page.getByRole("status").filter({ hasText: /isn’t in our dictionary/ }),
  ).toBeVisible();
  await expect(page.getByText("6 attempts left")).toBeVisible();
  const incorrect = commonWords.find(
    (word) => !evaluatePuzzle(word, puzzles[0].rules).every(Boolean),
  )!;
  await submit(page, incorrect);
  await expect(page.getByText("5 attempts left")).toBeVisible();
  await submit(page, incorrect);
  await expect(
    page.getByRole("status").filter({ hasText: /already tried/ }),
  ).toBeVisible();
  await expect(page.getByText("5 attempts left")).toBeVisible();
  await page.getByRole("button", { name: /Need a Nudge/ }).click();
  await expect(page.getByText(/It costs/)).toContainText("25 points");
  await page.getByRole("button", { name: "Use Nudge", exact: true }).click();
  await expect(page.getByText(/One possible answer begins/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("5 attempts left")).toBeVisible();
  await expect(page.getByText(/One possible answer begins/)).toBeVisible();
  await submit(page, puzzles[0].solutions[0]);
  await expect(page.getByText("2 attempts · 63 points earned")).toBeVisible();
  await page.getByRole("button", { name: "Next round" }).click();
  await submit(page, puzzles[1].solutions[0]);
  await page.getByRole("button", { name: "Next round" }).click();
  await submit(page, puzzles[2].solutions[0]);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(
    page.getByRole("heading", { name: "You found your way." }),
  ).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("463");
  await expect(page.getByText(/1 day completion streak/)).toBeVisible();
  await page.getByRole("button", { name: "Copy results" }).click();
  await expect(page.locator(".results").getByRole("status")).toHaveText(
    "Results ready to share.",
  );
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("463");
  expect(shared).toContain("https://meerq1.github.io/Loophole/");
  for (const puzzle of puzzles)
    expect(shared.toLowerCase()).not.toContain(puzzle.solutions[0]);
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
  const run = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("loophole.save.v2")!);
    return Object.values(save.runs).find(
      (item) => (item as { mode: string }).mode === "practice",
    ) as { rounds: { puzzle: { solutions: string[] } }[] };
  });
  await submit(page, run.rounds[0].puzzle.solutions[0]);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(
    page.getByRole("heading", { name: "You found your way." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep playing" }).click();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restart round" }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByText("6 attempts left")).toBeVisible();
  await page.goto("./#/stats");
  await expect(
    page.locator(".metric").filter({ hasText: /day streak/ }),
  ).toContainText("0");
});

test("create and play a friend challenge, reject malformed links, and preserve official Daily results", async ({
  page,
}) => {
  await page.goto("./#/create");
  await expect(
    page.getByText("A fair challenge, ready to share."),
  ).toBeVisible();
  const challengeUrl = await page
    .getByLabel("Challenge link", { exact: true })
    .inputValue();
  const encoded = challengeUrl.split("/challenge/")[1];
  const challengeRules = (
    JSON.parse(Buffer.from(encoded, "base64url").toString()) as { r: Rule[] }
  ).r;
  const solutions = commonWords.filter((word) =>
    evaluatePuzzle(word, challengeRules).every(Boolean),
  );
  await page.goto(challengeUrl);
  await expect(page.getByRole("heading", { name: "Your move." })).toBeVisible();
  await page.getByRole("button", { name: "Play Challenge" }).click();
  await submit(page, solutions[0]);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(
    page.getByRole("heading", { name: "You found your way." }),
  ).toBeVisible();
  await page.goto("./#/challenge/malformed");
  await expect(
    page.getByRole("heading", { name: "That challenge doesn’t quite fit." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to the journal" }).click();
  await expect(
    page.getByRole("button", { name: "Play Daily Run" }),
  ).toBeVisible();
});

test("settings persist, export backup, and keyboard access remains available", async ({
  page,
}) => {
  await page.goto("./#/settings");
  await page.getByLabel("Page theme").selectOption("dark");
  await page.getByLabel("Higher contrast").check();
  await page.getByLabel("Gentle motion").uncheck();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Higher contrast")).toBeChecked();
  await expect(page.getByLabel("Gentle motion")).not.toBeChecked();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /loophole-backup-.*\.json$/,
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveCount(1);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "More navigation" })
    .getByRole("link", { name: "Daily Run" })
    .click();
  await page.getByRole("button", { name: "Start Daily Run" }).click();
  await page
    .getByLabel("Your way through", { exact: true })
    .fill(puzzles[0].solutions[0]);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Next round" })).toBeVisible();
});

for (const width of [360, 768, 1440]) {
  test(`responsive layout stays within ${width}px on all main screens`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "",
      "#/practice",
      "#/create",
      "#/stats",
      "#/achievements",
      "#/archive",
      "#/settings",
      "#/help",
    ]) {
      await page.goto(`./${route}`);
      await expect(page.locator("main h1, main h2").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
    }
    await page.goto("./");
    await page.getByRole("button", { name: "Play Daily Run" }).click();
    await expect(
      page.getByRole("button", { name: "Submit word" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  });
}

test("production service worker precaches all content and supports offline Daily and Practice", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active)
      await new Promise<void>((resolve) =>
        registration.addEventListener("statechange", () => resolve(), {
          once: true,
        }),
      );
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Play Daily Run" }).click();
  await submit(page, puzzles[0].solutions[0]);
  await expect(page.getByRole("button", { name: "Next round" })).toBeVisible();
  await page.goto("./#/practice");
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toBeVisible();
});

test("six unsuccessful valid guesses fail the round honestly and allow Daily completion", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Play Daily Run" }).click();
  const incorrect = commonWords
    .filter((word) => !evaluatePuzzle(word, puzzles[0].rules).every(Boolean))
    .slice(0, 6);
  for (const word of incorrect) await submit(page, word);
  await expect(
    page.getByRole("heading", { name: "This one got away." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No attempts left. This round earns 0 points. You can still finish the run.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Verified ways through")).toBeVisible();
  await expect(
    page.getByLabel("Your way through", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next round" }).click();
  await submit(page, puzzles[1].solutions[0]);
  await page.getByRole("button", { name: "Next round" }).click();
  await submit(page, puzzles[2].solutions[0]);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(
    page.getByRole("heading", { name: "Every round, a little wiser." }),
  ).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("400");
  await expect(page.getByText(/1 day completion streak/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/2 of 3 puzzles solved/)).toBeVisible();
});

test("two tabs converge concurrent valid guesses without regaining attempts", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Play Daily Run" }).click();
  const second = await context.newPage();
  await second.clock.install({ time: new Date(`${DAY}T12:00:00Z`) });
  await second.goto("./#/daily");
  const wrong = commonWords
    .filter((word) => !evaluatePuzzle(word, puzzles[0].rules).every(Boolean))
    .slice(0, 2);
  await page.getByLabel("Your way through", { exact: true }).fill(wrong[0]);
  await second.getByLabel("Your way through", { exact: true }).fill(wrong[1]);
  await Promise.all([
    page.getByRole("button", { name: "Submit word" }).click(),
    second.getByRole("button", { name: "Submit word" }).click(),
  ]);
  await expect(page.getByText("4 attempts left")).toBeVisible();
  await expect(second.getByText("4 attempts left")).toBeVisible();
  await Promise.all([page.reload(), second.reload()]);
  await expect(page.getByText("4 attempts left")).toBeVisible();
  await expect(second.getByText("4 attempts left")).toBeVisible();
  await submit(second, wrong[0]);
  await expect(
    second.getByRole("status").filter({ hasText: /already tried/ }),
  ).toBeVisible();
  await expect(second.getByText("4 attempts left")).toBeVisible();
  await submit(page, puzzles[0].solutions[0]);
  await expect(
    second.getByRole("button", { name: "Next round" }),
  ).toBeVisible();
  await expect(second.getByText("3 attempts · 76 points earned")).toBeVisible();
  await second.close();
});

test("UTC midnight preserves the active run and offers an explicit switch to the new day", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Play Daily Run" }).click();
  const wrong = commonWords.find(
    (word) => !evaluatePuzzle(word, puzzles[0].rules).every(Boolean),
  )!;
  await submit(page, wrong);
  await page.clock.setSystemTime(new Date("2026-11-01T00:00:01Z"));
  await page.clock.runFor(1100);
  await expect(
    page.locator(".notice").filter({ hasText: /You’re finishing/ }),
  ).toContainText(DAY);
  await expect(page.locator(".section-kicker")).toContainText(DAY);
  await expect(page.getByText("5 attempts left")).toBeVisible();
  await page.getByRole("button", { name: "Play today’s puzzle" }).click();
  await expect(page.locator(".section-kicker")).toContainText("2026-11-01");
  await expect(page.getByText("6 attempts left")).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem("loophole.save.v2")!) as {
          runs: Record<string, { rounds: { guesses: unknown[] }[] }>;
        };
        return [
          save.runs["daily:2026-10-31"].rounds[0].guesses.length,
          save.runs["daily:2026-11-01"].rounds[0].guesses.length,
        ];
      }),
    )
    .toEqual([1, 0]);
  await page.reload();
  await expect(page.locator(".section-kicker")).toContainText("2026-11-01");
  await expect(page.getByText("6 attempts left")).toBeVisible();
});

test("archive completion and replay preserve the original official record and streak", async ({
  page,
}) => {
  const archivedDate = "2026-10-30";
  const archivePuzzles = ["easy", "medium", "hard"].map(
    (difficulty) => bank.puzzles[difficulty][29],
  );
  await page.clock.setSystemTime(new Date(`${archivedDate}T12:00:00Z`));
  await page.goto("./");
  await page.getByRole("button", { name: "Play Daily Run" }).click();
  for (const [index, puzzle] of archivePuzzles.entries()) {
    await submit(page, puzzle.solutions[0]);
    await page
      .getByRole("button", { name: index < 2 ? "Next round" : "See results" })
      .click();
  }
  await expect(page.locator(".result-score")).toContainText("500");
  const officialBefore = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("loophole.save.v2")!).runs[
        "daily:2026-10-30"
      ],
  );
  await page.clock.setSystemTime(new Date(`${DAY}T12:00:00Z`));
  await page.goto("./#/archive");
  const card = page
    .locator(".archive-card")
    .filter({ has: page.getByRole("heading", { name: "Oct 30, 2026" }) });
  await expect(card).toContainText("Official record: 500 / 500");
  await card.getByRole("button", { name: /Play this edition/ }).click();
  await expect(page.locator(".section-kicker")).toContainText("ARCHIVE");
  for (const [index, puzzle] of archivePuzzles.entries()) {
    await submit(page, puzzle.solutions[0]);
    await page
      .getByRole("button", { name: index < 2 ? "Next round" : "See results" })
      .click();
  }
  await expect(page.locator(".result-score")).toContainText("500");
  await page.goto("./#/archive");
  await expect(card).toContainText("Archive record: 500 / 500");
  await card.getByRole("button", { name: /Replay this edition/ }).click();
  await expect(page.getByText("6 attempts left")).toBeVisible();
  await expect(page.locator(".section-kicker")).toContainText(archivedDate);
  const after = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("loophole.save.v2")!).runs[
        "daily:2026-10-30"
      ],
  );
  expect(after).toEqual(officialBefore);
  await page.goto("./#/stats");
  await expect(
    page.locator(".metric").filter({ hasText: /day streak/ }),
  ).toContainText("1");
  await expect(
    page.locator(".metric").filter({ hasText: /Daily Runs completed/ }),
  ).toContainText("1");
});

test("friend challenges can be replayed with identical rules and independent results", async ({
  page,
}) => {
  await page.goto("./#/create");
  const challengeUrl = await page
    .getByLabel("Challenge link", { exact: true })
    .inputValue();
  const payload = challengeUrl.split("/challenge/")[1];
  const rules = (
    JSON.parse(Buffer.from(payload, "base64url").toString()) as { r: Rule[] }
  ).r;
  const answer = commonWords.find((word) =>
    evaluatePuzzle(word, rules).every(Boolean),
  )!;
  await page.goto(challengeUrl);
  await page.getByRole("button", { name: "Play Challenge" }).click();
  const originalRuleDescriptions = await page
    .locator(".rule-list strong")
    .allTextContents();
  await submit(page, answer);
  await page.getByRole("button", { name: "See results" }).click();
  await expect(
    page.getByRole("heading", { name: "You found your way." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replay challenge", exact: true })
    .click();
  await expect(page.getByText("6 attempts left")).toBeVisible();
  expect(await page.locator(".rule-list strong").allTextContents()).toEqual(
    originalRuleDescriptions,
  );
  await page.reload();
  await expect(page.getByText("6 attempts left")).toBeVisible();
  const challengeRuns = await page.evaluate(
    () =>
      Object.values(
        JSON.parse(localStorage.getItem("loophole.save.v2")!).runs,
      ).filter((run) => (run as { mode: string }).mode === "challenge") as {
        rounds: { status: string }[];
      }[],
  );
  expect(challengeRuns).toHaveLength(2);
  expect(challengeRuns.map((run) => run.rounds[0].status).sort()).toEqual([
    "playing",
    "solved",
  ]);
});
