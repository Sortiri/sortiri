# Demo shot list — OSS launch capture

Target: 60–90 second GIF or 5-minute Loom. Black terminal + browser split recommended.

| # | Shot | Duration | Notes |
|---|------|----------|-------|
| 1 | Empty git repo + `git init` | 5s | Clean slate |
| 2 | `npx sortiri init --yes` | 8s | Show `.sortiri/` created |
| 3 | `sortiri doctor` | 6s | All checks green |
| 4 | `sortiri record` agent.action | 5s | Title: Updated onboarding flow |
| 5 | `sortiri record` decision.recorded | 5s | Local-first decision |
| 6 | `sortiri record` command.run | 5s | npm run test |
| 7 | `sortiri record` incident.opened | 5s | Checkout validation failed |
| 8 | `sortiri record` rollback.recorded | 5s | Reverted checkout experiment |
| 9 | `sortiri export --out timeline.jsonl` | 5s | Show file size / line count |
| 10 | `sortiri dev` + browser | 15s | Local timeline UI — badges, grouping, export CTA |
| 11 | Scroll event list | 8s | Show replay order |
| 12 | README or GitHub repo | 5s | Star CTA — no fake star count |

## Visual requirements

- Terminal font: monospace, dark theme
- Browser: `http://127.0.0.1:4317` local viewer
- On-screen text overlay (optional): "Open-source timeline layer for AI-native companies"
- Do not show: cloud login, API keys, private workspace IDs, fake SOC 2 badges

## Manual capture

1. Run commands from [demo-terminal-flow.md](demo-terminal-flow.md)
2. Record with macOS Screenshot (GIF) or Loom
3. Save as `assets/demo.gif` (optional; README uses `assets/readme-hero.png`)

## Automated capture (optional)

```bash
npx tsx scripts/capture-oss-demo.ts
```

Uses Playwright to screenshot key steps when terminal recording is unavailable.
