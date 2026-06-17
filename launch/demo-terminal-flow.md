# Demo terminal flow — deterministic 12-step capture

Run these commands in order from a clean temp directory. Use for GIF/video capture or `scripts/capture-oss-demo.ts` reference.

```bash
# 1. Clean repo
mkdir /tmp/sortiri-demo && cd /tmp/sortiri-demo
git init

# 2. Init
npx sortiri init --yes

# 3. Doctor
sortiri doctor

# 4–8. Record demo events
sortiri record --type agent.action --title "Updated onboarding flow"
sortiri record --type decision.recorded --title "Use local-first timeline before cloud sync"
sortiri record --type command.run --title "npm run test"
sortiri record --type incident.opened --title "Checkout validation failed"
sortiri record --type rollback.recorded --title "Reverted checkout experiment"

# 9. Export
sortiri export --out timeline.jsonl

# 10. Dev (local timeline)
sortiri dev
# Open http://127.0.0.1:4317 — show grouped events, badges, export CTA

# 11. Replay-style review
cat .sortiri/events.jsonl | head -5

# 12. Optional — publish-equivalent before npm publish
cd /path/to/sortiri/packages/cli && npm pack
cd /tmp/sortiri-demo-2 && git init
npm exec --package ./sortiri-0.1.0.tgz sortiri -- init --yes
```

**Note:** Replace `npx sortiri` with `npx tsx /path/to/packages/cli/src/index.ts` when testing from the monorepo before npm publish.

**Positioning line for voiceover:** "Open-source timeline layer for AI-native companies."
