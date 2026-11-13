/**
 * The only proof that matters for this tool: a browser, the real model, the
 * example data, and the numbers that come out. Runs the built site from dist.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const PORT = 4173;
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  cwd: "/workspace/promi/work/ssa",
  stdio: "ignore",
});

await new Promise((resolve) => setTimeout(resolve, 2500));

const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text().slice(0, 200)}`);
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "load" });
 console.log("title:", await page.title());

await page.getByRole("button", { name: "Load example" }).click();
await page.getByRole("button", { name: "Analyze" }).click();

// The first run downloads the model; give it a real window on a real network.
await page.locator("section.results").waitFor({ timeout: 240_000 });

const stats = await page.$$eval(".stat", (nodes) =>
  nodes.map((node) => ({
    key: node.querySelector(".k")?.textContent?.trim(),
    value: node.querySelector(".v")?.textContent?.trim(),
  })),
);
console.log("stats:", JSON.stringify(stats));

const rows = await page.$$eval("table tbody tr", (nodes) =>
  nodes
    .filter((node) => node.children.length > 3)
    .slice(0, 6)
    .map((node) => [...node.children].map((cell) => cell.textContent.trim()).slice(0, 5)),
);
console.log("first rows:", JSON.stringify(rows, null, 0));

const gaps = await page.$$eval(".card ul.plain li", (nodes) => nodes.slice(0, 5).map((n) => n.textContent.trim()));
console.log("gaps/clusters:", JSON.stringify(gaps));

await page.screenshot({ path: "/workspace/promi/work/ssa/shot-top.png", fullPage: false });
await page.locator("section.results").screenshot({ path: "/workspace/promi/work/ssa/shot-results.png" });
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

await browser.close();
server.kill("SIGTERM");
