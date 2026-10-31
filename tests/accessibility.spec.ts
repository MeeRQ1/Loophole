import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const theme of ["light", "dark"] as const)
  test(`critical screens meet automated WCAG AA checks in ${theme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./#/settings");
    await page
      .getByRole("radio", {
        name: theme === "dark" ? "Dark" : "Light",
        exact: true,
      })
      .locator("..")
      .click();
    for (const route of [
      "home",
      "create",
      "settings",
      "stats",
      "achievements",
      "archive",
      "help",
      "daily",
    ]) {
      await page.goto(`./#/${route}`);
      if (route === "daily")
        await page.getByRole("button", { name: "Start Daily Run" }).click();
      await expect(page.locator("main h1,main h2").first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  });
