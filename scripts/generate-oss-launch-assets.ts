#!/usr/bin/env tsx
/**
 * Generate OSS launch PNG assets from a deterministic HTML template (not AI-generated).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const LOGO_PATH = path.join(ROOT, "public/sortiri-logo.png");

function socialPreviewHtml(logoDataUri: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1280px; height: 640px;
      background: #0b0d10;
      color: #e8eaed;
      font-family: ui-sans-serif, system-ui, sans-serif;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #2a2f36;
    }
    .card { text-align: center; padding: 48px; max-width: 960px; }
    img { width: 96px; height: 96px; margin-bottom: 24px; }
    h1 { font-size: 48px; margin-bottom: 16px; letter-spacing: -0.02em; }
    p { font-size: 24px; color: #9aa0a6; margin-bottom: 32px; line-height: 1.4; }
    code {
      display: inline-block;
      font-size: 22px;
      background: #12151a;
      border: 1px solid #2a2f36;
      padding: 12px 20px;
      border-radius: 8px;
      color: #8ab4f8;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="${logoDataUri}" alt="Sortiri" />
    <h1>Sortiri</h1>
    <p>Open-source timeline layer for AI-native companies</p>
    <code>npx sortiri init</code>
  </div>
</body>
</html>`;
}

function readmeHeroHtml(logoDataUri: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px; height: 640px;
      background: #0b0d10;
      color: #e8eaed;
      font-family: ui-sans-serif, system-ui, sans-serif;
      padding: 32px;
      border: 1px solid #2a2f36;
    }
    header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    header img { width: 40px; height: 40px; }
    h1 { font-size: 22px; }
    .sub { color: #9aa0a6; font-size: 14px; margin-top: 4px; }
    .event {
      border: 1px solid #2a2f36; border-radius: 8px; padding: 14px;
      margin-bottom: 10px; background: #12151a;
    }
    .badges { display: flex; gap: 6px; margin-bottom: 8px; }
    .badge { font-size: 10px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid #2a2f36; }
    .src { color: #8ab4f8; }
    .type { color: #81c995; }
    .title { font-size: 15px; margin-bottom: 4px; }
    .summary { font-size: 12px; color: #9aa0a6; }
  </style>
</head>
<body>
  <header>
    <img src="${logoDataUri}" alt="Sortiri" />
    <div>
      <h1>Sortiri Local Timeline</h1>
      <div class="sub">Open-source timeline layer for AI-native companies</div>
    </div>
  </header>
  <div class="event">
    <div class="badges"><span class="badge src">cursor</span><span class="badge type">agent.action</span></div>
    <div class="title">Updated onboarding flow</div>
    <div class="summary">Changed onboarding page copy and CTA</div>
  </div>
  <div class="event">
    <div class="badges"><span class="badge src">cli</span><span class="badge type">decision.recorded</span></div>
    <div class="title">Use local-first timeline before cloud sync</div>
    <div class="summary">JSONL journal now; cloud when team needs shared history</div>
  </div>
  <div class="event">
    <div class="badges"><span class="badge src">cli</span><span class="badge type">incident.opened</span></div>
    <div class="title">Checkout validation failed</div>
    <div class="summary">Elevated error rate on /checkout</div>
  </div>
</body>
</html>`;
}

async function screenshotHtml(html: string, outPath: string, width: number, height: number): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: outPath, type: "png" });
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(ASSETS, { recursive: true });
  const logo = fs.readFileSync(LOGO_PATH);
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

  await screenshotHtml(
    socialPreviewHtml(logoDataUri),
    path.join(ASSETS, "github-social-preview.png"),
    1280,
    640,
  );
  await screenshotHtml(
    readmeHeroHtml(logoDataUri),
    path.join(ASSETS, "readme-hero.png"),
    1200,
    640,
  );

  console.log("Generated assets/github-social-preview.png");
  console.log("Generated assets/readme-hero.png");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
