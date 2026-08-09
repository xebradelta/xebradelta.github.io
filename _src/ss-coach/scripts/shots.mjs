// Quick visual QA: screenshots of key screens into the scratch dir.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4189;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = process.argv[2] || "/tmp";

const preview = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: root,
  stdio: "pipe",
});
await new Promise((res, rej) => {
  preview.stdout.on("data", (d) => String(d).includes("Local:") && res());
  preview.on("exit", () => rej(new Error("preview died")));
  setTimeout(() => rej(new Error("timeout")), 15000);
});

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });

await page.goto(BASE);
await page.getByText("Set me up").waitFor();
await shot("01-onboarding");

// seed a profile + some history via localStorage for richer screens
await page.evaluate(() => {
  const today = new Date();
  const iso = (d) => {
    const x = new Date(today);
    x.setDate(x.getDate() - d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  };
  const mkSession = (daysAgo, w, gw) => ({
    id: `seed-${daysAgo}`,
    dateISO: iso(daysAgo),
    startedAt: Date.now() - daysAgo * 86400000,
    finishedAt: Date.now() - daysAgo * 86400000 + 1800000,
    kind: "practice",
    swings: Array.from({ length: 10 }, (_, i) => ({
      weight: w,
      reps: 10,
      style: "one-arm",
      side: i % 2 ? "R" : "L",
    })),
    getups: Array.from({ length: 10 }, (_, i) => ({ weight: gw, side: i % 2 ? "R" : "L" })),
    warmupDone: true,
    cooldownDone: false,
    crisp: true,
    rpe: 6,
    notes: daysAgo === 3 ? "Felt strong today. Grip is coming along." : "",
  });
  const sessions = [1, 2, 3, 5, 6, 8, 9, 10, 12, 13, 15, 20, 22, 27, 33, 40].map((d, i) =>
    mkSession(d, i < 6 ? 24 : 20, 16)
  );
  localStorage.setItem(
    "ss-coach:state",
    JSON.stringify({
      schemaVersion: 1,
      profile: {
        sex: "male",
        ageRange: "under40",
        condition: "average",
        bells: [16, 24, 32],
        painFlags: [],
        createdAt: Date.now(),
      },
      settings: { units: "kg", sound: true, vibration: true, theme: "dark", trainingDays: [1, 2, 3, 4, 6] },
      swings: { base: 24, next: 32, heavyCount: 4, qualityStreak: 1, owned: [16, 20], checklist: {}, style: "one-arm" },
      getups: { base: 16, next: null, heavyCount: 0, qualityStreak: 2, owned: [8, 12], checklist: { crisp: true, "talk-test": true } },
      sessions,
      active: null,
      celebrated: [],
    })
  );
});
await page.goto(BASE + "#/");
await page.reload();
await page.getByText("Today's practice").waitFor();
await shot("02-today");

await page.goto(BASE + "#/plan");
await page.getByText("Progression").waitFor();
await shot("03-plan");

await page.goto(BASE + "#/history");
await page.getByText("Session log").waitFor();
await shot("04-history");

await page.goto(BASE + "#/learn");
await shot("05-learn");

await page.goto(BASE + "#/settings");
await shot("06-settings");

await page.goto(BASE + "#/test");
await shot("07-test-setup");

// in-session screens
await page.goto(BASE + "#/");
await page.getByText("Start session").click();
await page.getByText("Round 1 of 3").waitFor();
await shot("08-warmup");
await page.getByText("Skip warm-up").click();
await page.getByText("swings done").waitFor();
await shot("09-swings");
await page.getByText("swings done").click();
await page.getByText("I can talk — swing").waitFor();
await shot("10-rest");

await browser.close();
preview.kill();
console.log("shots written");
