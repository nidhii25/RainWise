const { chromium } = require("playwright-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const API = "http://127.0.0.1:8000/api/v1";
const BASE = "http://localhost:3000";

(async () => {
  const login = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "livecheck@example.com", password: "monsoon2026rain" }),
  }).then((r) => r.json());

  const assessments = await fetch(`${API}/assessments`, {
    headers: { Authorization: `Bearer ${login.access_token}` },
  }).then((r) => r.json());

  const target = assessments.find((a) => a.system === "storage_and_recharge") ?? assessments[0];
  const id = target.id;
  console.log("assessment", id);

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-gl=angle"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.addInitScript(
    (tokens) => {
      localStorage.setItem("rainwise.access", tokens.access);
      localStorage.setItem("rainwise.refresh", tokens.refresh);
    },
    { access: login.access_token, refresh: login.refresh_token },
  );

  page.on("console", (m) => {
    console.log("CONSOLE", m.type(), m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message.slice(0, 160)));

  await page.goto(`${BASE}/assessments/${id}`, { waitUntil: "networkidle" });
  await page.locator("canvas").waitFor({ timeout: 20000 });
  await page.waitForTimeout(3500);

  const info = await page.evaluate(() => {
    const viewer = document.querySelector(".viewer");
    if (!viewer) return { error: "no viewer" };
    const all = Array.from(viewer.querySelectorAll("div"));
    const labelled = all
      .filter((d) => /Storage tank|Recharge|House|m² roof/i.test(d.textContent || ""))
      .map((d) => {
        const rect = d.getBoundingClientRect();
        const style = getComputedStyle(d);
        return {
          text: (d.textContent || "").trim().slice(0, 40),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          display: style.display,
          opacity: style.opacity,
          transform: style.transform,
        };
      });
    return {
      viewerText: (viewer.textContent || "").slice(0, 300),
      divCount: all.length,
      labelled,
      canvas: viewer.querySelector("canvas")
        ? {
            w: viewer.querySelector("canvas").width,
            h: viewer.querySelector("canvas").height,
          }
        : null,
    };
  });
  console.log("viewerText:", info.viewerText);
  console.log("labels:", (info.labelled || []).map((l) => `${l.text} [${l.w}x${l.h}]`).join(" | "));
  console.log("canvas:", JSON.stringify(info.canvas));

  const viewer = page.locator(".viewer");
  await viewer.screenshot({ path: "C:\\Users\\devni\\AppData\\Local\\Temp\\opencode\\rainwise-viewer.png" });
  console.log("viewer screenshot saved");

  await browser.close();
})().catch((error) => {
  console.error("VIEWER CHECK FAILED:", error.message);
  process.exit(1);
});
