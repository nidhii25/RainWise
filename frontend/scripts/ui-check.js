const { chromium } = require("playwright-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const SHOT = "C:\\Users\\devni\\AppData\\Local\\Temp\\opencode\\rainwise-results.png";

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push("PAGEERROR " + error.message));

  const email = `ui${Date.now()}@example.com`;

  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.getByLabel("Name", { exact: true }).fill("UI Check");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("monsoon2026rain");
  await page.getByLabel("Confirm password", { exact: true }).fill("monsoon2026rain");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  console.log("register+dashboard OK");

  await page.getByRole("button", { name: "Add property" }).first().click();
  await page.getByLabel("Property name", { exact: true }).fill("Pune house");
  await page.getByLabel("Address", { exact: true }).fill("Kothrud, Pune");
  await page.getByLabel("Latitude", { exact: true }).fill("18.5204");
  await page.getByLabel("Longitude", { exact: true }).fill("73.8567");
  await page.getByRole("button", { name: "Save property" }).click();
  await page.getByRole("link", { name: /Pune house/ }).click();
  await page.waitForURL("**/properties/**", { timeout: 20000 });
  console.log("property OK");

  await page.getByRole("link", { name: "New assessment" }).click();
  await page.waitForURL("**/assessments/new", { timeout: 20000 });

  await page.getByLabel("Assessment label", { exact: true }).fill("Baseline");
  await page.getByLabel("Area (m²)", { exact: true }).fill("200");
  await page.locator('input[type="checkbox"]').check();

  const monthly = [5, 5, 5, 5, 10, 140, 300, 250, 130, 35, 10, 5];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < months.length; i += 1) {
    await page.getByLabel(months[i], { exact: true }).fill(String(monthly[i]));
  }

  await page.getByLabel("Infiltration rate (mm/h)", { exact: true }).fill("25");
  await page.getByLabel("Depth to water table (m)", { exact: true }).fill("12");
  await page.getByLabel("Distance to contamination (m)", { exact: true }).fill("30");
  await page.getByLabel("Free space for recharge (m²)", { exact: true }).fill("20");
  await page.getByLabel("Ground slope (%)", { exact: true }).fill("2");

  await page.getByRole("button", { name: "Run assessment" }).click();
  await page.waitForURL("**/assessments/**", { timeout: 30000 });
  await page.getByText("Recommended system").waitFor({ timeout: 30000 });
  console.log("assessment OK");

  const body = await page.locator("body").innerText();
  const checks = [
    "Storage + recharge",
    "1,43,412 L",
    "RCC rectangular 6 x 3 x 2.5 m",
    "Recharge decision",
    "Piping schedule",
    "Quantities",
    "3D layout",
  ];
  for (const check of checks) {
    console.log(`${body.includes(check) ? "PASS" : "MISS"} ${check}`);
  }

  await page.waitForTimeout(2500);
  const canvases = await page.locator("canvas").count();
  const canvasBox = canvases ? await page.locator("canvas").first().boundingBox() : null;
  console.log("canvas count", canvases, "size", canvasBox ? `${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)}` : "none");

  await page.getByRole("button", { name: "Generate concept image" }).click();
  await page.getByText(/AI concept images are disabled/).waitFor({ timeout: 15000 });
  console.log("AI disabled path OK");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT, fullPage: true });
  console.log("screenshot", SHOT);

  console.log("console errors:", consoleErrors.length);
  for (const error of consoleErrors.slice(0, 8)) console.log(" -", error.slice(0, 200));

  await browser.close();
})().catch((error) => {
  console.error("UI CHECK FAILED:", error.message);
  process.exit(1);
});
