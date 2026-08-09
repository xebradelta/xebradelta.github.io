/**
 * Simulated user journey against the built app (run `npm run build` first):
 * onboarding → three practice sessions (different weights) → an interrupted
 * and resumed session → a timed test → export → wipe → import → offline test.
 *
 * Usage: node scripts/journey.mjs
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4188;
const BASE = `http://127.0.0.1:${PORT}/`;
const EXECUTABLE = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";

let passed = 0;
function ok(name, cond) {
  if (!cond) {
    console.error(`✗ FAIL: ${name}`);
    process.exitCode = 1;
    throw new Error(`journey failed at: ${name}`);
  }
  passed++;
  console.log(`✓ ${name}`);
}

const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: root,
  stdio: "pipe",
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("preview server didn't start")), 20000);
  preview.stdout.on("data", (d) => {
    if (String(d).includes("Local:")) {
      clearTimeout(t);
      resolve();
    }
  });
  preview.on("exit", () => reject(new Error("preview exited early")));
});

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "allow",
});
const page = await context.newPage();
const clickText = async (text, { nth = 0 } = {}) => {
  await page.getByText(text, { exact: true }).nth(nth).click();
};

try {
  /* ——— onboarding ——— */
  await page.goto(BASE);
  await page.getByText("Set me up").waitFor({ timeout: 10000 });
  ok("onboarding welcome renders", true);
  await clickText("Set me up");
  await clickText("Continue"); // defaults: male, <40, average
  await page.getByRole("button", { name: "16 kg" }).click();
  await page.getByRole("button", { name: "24 kg" }).click();
  await clickText("Continue");
  await page.getByText("Your starting point").waitFor();
  ok("starting weights recommended", await page.getByText("24 kg").first().isVisible());
  await clickText("Looks right");
  await clickText("Start practicing");
  await page.getByText("Today's practice").waitFor();
  ok("today screen after onboarding", true);

  /* ——— helper: run one full guided session ——— */
  async function runSession({ overrideFirstSetKg = null } = {}) {
    await clickText("Start session");
    await page.getByText("Skip warm-up").waitFor();
    await clickText("Skip warm-up");
    for (let set = 0; set < 10; set++) {
      if (set === 0 && overrideFirstSetKg) {
        await clickText("change bell");
        await page
          .getByRole("group", { name: "Bell weight" })
          .getByRole("button", { name: `${overrideFirstSetKg} kg` })
          .click();
      } else {
        await page.getByText("swings done").click();
      }
      if (set < 9) {
        await page.getByText("I can talk — swing").waitFor();
        await clickText("I can talk — swing");
      }
    }
    await page.getByText("Start get-ups").waitFor();
    await clickText("Start get-ups");
    for (let rep = 0; rep < 10; rep++) {
      await page.getByText("Rep done").click();
    }
    await page.getByText("Skip cooldown").waitFor();
    await clickText("Skip cooldown");
    await clickText("Yes, all crisp");
    await clickText("Save session");
    await page.getByText("Today's practice").waitFor();
  }

  /* ——— session 1: as prescribed (24 kg swings / 16 kg get-ups) ——— */
  await runSession();
  ok("session 1 saved", await page.getByText("✓ trained").isVisible());

  /* ——— session 2: first set overridden to 16 kg ——— */
  await runSession({ overrideFirstSetKg: 16 });
  ok("session 2 (override weight) saved", true);

  /* ——— session 3: interrupted mid-swings, resumed, then finished ——— */
  await clickText("Start session");
  await page.getByText("Skip warm-up").waitFor();
  await clickText("Skip warm-up");
  for (let set = 0; set < 3; set++) {
    await page.getByText("swings done").click();
    await page.getByText("I can talk — swing").waitFor();
    await clickText("I can talk — swing");
  }
  // simulate an interruption: full reload mid-session
  await page.reload();
  await page.getByText("Set 4 of 10", { exact: false }).waitFor();
  ok("interrupted session resumed at set 4", true);
  for (let set = 3; set < 10; set++) {
    await page.getByText("swings done").click();
    if (set < 9) {
      await page.getByText("I can talk — swing").waitFor();
      await clickText("I can talk — swing");
    }
  }
  await page.getByText("Start get-ups").waitFor();
  await clickText("Start get-ups");
  for (let rep = 0; rep < 10; rep++) await page.getByText("Rep done").click();
  await clickText("Skip cooldown");
  await clickText("Yes, all crisp");
  await clickText("Save session");
  await page.getByText("Today's practice").waitFor();
  ok("session 3 (resumed) saved", true);

  /* ——— timed test ——— */
  await page.goto(BASE + "#/test");
  await page.getByText("Start the clock").waitFor();
  await clickText("Start the clock");
  for (let i = 0; i < 10; i++) await page.getByText("+10 swings").click();
  await page.getByText("One minute. Breathe.").waitFor();
  ok("test: swings done, rest started", true);
  console.log("  (waiting out the 1:00 test rest…)");
  await page.getByText("Get-up done").waitFor({ timeout: 70000 });
  for (let i = 0; i < 10; i++) await page.getByText("Get-up done").click();
  await page.getByText("Test result").waitFor();
  ok(
    "test evaluated",
    (await page.getByText("Not this time").count()) + (await page.getByText("passed").count()) > 0
  );
  await clickText("Done");

  /* ——— history shows 4 sessions ——— */
  await page.goto(BASE + "#/history");
  await page.getByText("Session log").waitFor();
  const logCount = await page.locator("details.learn-item").count();
  ok(`history lists 4 sessions (got ${logCount})`, logCount === 4);

  /* ——— export ——— */
  await page.goto(BASE + "#/settings");
  const dlDir = mkdtempSync(join(tmpdir(), "ss-journey-"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByText("Export backup (JSON)").click(),
  ]);
  const backupPath = join(dlDir, "backup.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(readFileSync(backupPath, "utf8"));
  ok("export contains 4 sessions", backup.state.sessions.length === 4);

  /* ——— guarded wipe ——— */
  await page.getByText("Erase all data…").click();
  await page.locator("#reset-phrase").fill("ERASE");
  await page.getByRole("button", { name: "Erase all data", exact: true }).click();
  await page.getByText("Set me up").waitFor();
  const stored = await page.evaluate(() => localStorage.getItem("ss-coach:state"));
  ok("wipe cleared sessions", !stored || JSON.parse(stored).sessions.length === 0);

  /* ——— import restores everything ——— */
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByText("Restore from a backup file").click(),
  ]);
  await chooser.setFiles(backupPath);
  await page.getByText("Today's practice").waitFor();
  await page.goto(BASE + "#/history");
  await page.getByText("Session log").waitFor();
  ok("import restored 4 sessions", (await page.locator("details.learn-item").count()) === 4);

  /* ——— corrupted import is rejected safely ——— */
  await page.goto(BASE + "#/settings");
  const [chooser2] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByText("Import backup…").click(),
  ]);
  const badPath = join(dlDir, "bad.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(badPath, "{not json at all");
  await chooser2.setFiles(badPath);
  await page.getByText("isn't valid JSON", { exact: false }).waitFor();
  await page.goto(BASE + "#/history");
  ok(
    "corrupt import rejected, data intact",
    (await page.locator("details.learn-item").count()) === 4
  );

  /* ——— offline: airplane-mode reload after first visit ——— */
  await page.goto(BASE);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  // give the SW a moment to finish precaching
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await page.getByText("Today's practice").waitFor({ timeout: 10000 });
  ok("app works offline after first visit", true);
  await context.setOffline(false);

  console.log(`\nJourney complete: ${passed} checks passed.`);
} finally {
  await browser.close();
  preview.kill();
}
