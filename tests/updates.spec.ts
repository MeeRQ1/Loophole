import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

test("an installed update refreshes HTTP-cached HTML and preserves progress until activation", async ({
  page,
}) => {
  const worker = readFileSync("dist/sw.js", "utf8");
  let phase = 1;
  // Two releases use the real generated worker and actual assets. Only this
  // small test shell differs; long-lived HTTP caching reproduces Pages updates.
  const server = createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    const file = url.pathname.replace("/Loophole/", "");
    if (file === "" || file === "index.html") {
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "public,max-age=3600");
      res.end(
        `<!doctype html><title>Release ${phase}</title><h1>Release ${phase}</h1>`,
      );
      return;
    }
    if (file === "sw.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(
        worker.replace(
          /loophole-[a-f0-9]{16}/g,
          `loophole-update-fixture-${phase}`,
        ),
      );
      return;
    }
    const path = resolve("dist", file);
    if (!path.startsWith(resolve("dist") + "/")) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const data = readFileSync(path);
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".woff2")
              ? "font/woff2"
              : "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Test server did not start");
  const base = `http://127.0.0.1:${address.port}/Loophole/`;
  try {
    await page.goto(base);
    await page.evaluate(async () => {
      localStorage.setItem("preserved-progress", "one guess used");
      await fetch("index.html"); // Seed a fresh, long-lived browser HTTP-cache entry.
      await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await expect(page.getByRole("heading")).toHaveText("Release 1");
    phase = 2;
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(
          async () =>
            !!(await navigator.serviceWorker.getRegistration())?.waiting,
        ),
      )
      .toBe(true);
    const cached = await page.evaluate(async () => {
      const cache = await caches.open("loophole-update-fixture-2");
      return (await cache.match(new URL("index.html", location.href)))?.text();
    });
    expect(cached).toContain("Release 2");
    // Installing a new release does not interrupt the currently displayed game.
    await expect(page.getByRole("heading")).toHaveText("Release 1");
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
        r!.waiting!.postMessage("ACTIVATE_UPDATE");
      });
    });
    await page.reload();
    await expect(page.getByRole("heading")).toHaveText("Release 2");
    expect(
      await page.evaluate(() => localStorage.getItem("preserved-progress")),
    ).toBe("one guess used");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
