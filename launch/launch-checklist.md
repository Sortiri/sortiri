# Launch checklist — Sortiri open source

## GitHub org & repo

- [ ] GitHub org exists (`sortiri` / `Sortiri`)
- [ ] Repo public: https://github.com/sortiri/sortiri
- [ ] Code pushed to `main`
- [ ] Branch protection on `main` (requires `open-source-checks`)
- [ ] Topics set: `ai-agents`, `mcp`, `cursor`, `timeline`, `open-source`
- [ ] Repo description: Open-source timeline layer for AI-native companies.
- [ ] Social preview uploaded (`assets/github-social-preview.png`)

## README & docs

- [ ] README polished (timeline-layer positioning above fold)
- [ ] `npx sortiri init` in README quickstart
- [ ] Open Source vs Cloud section clear
- [ ] LICENSE present (Apache-2.0)
- [ ] SECURITY present
- [ ] `docs/quickstart.md` tested
- [ ] `docs/troubleshooting.md` complete

## Demo & assets

- [ ] `npm run demo:oss` passes
- [ ] Demo GIF/video captured (see `launch/demo-shot-list.md`)
- [ ] `assets/readme-hero.png` in README
- [ ] Example project events seeded

## Launch posts

- [ ] `launch/show-hn.md` ready
- [ ] `launch/x-thread.md` ready
- [ ] `launch/reddit-post.md` ready
- [ ] `launch/linkedin-post.md` ready
- [ ] `launch/founder-comment.md` ready
- [ ] `launch/good-first-issues.md` copied to GitHub issues

## Trust & safety

- [ ] `npm run scan:oss-trust` passes
- [ ] No fake GitHub stars
- [ ] No SOC 2 / compliance claims
- [ ] No secrets or private workspace IDs in repo
- [ ] No personal GitHub remote
- [ ] Black box not used as primary positioning

## Validation

- [ ] `npm run sanity:open-source-star-readiness` passes
- [ ] `npm run sanity:open-source-project` passes
- [ ] `npm run assert:no-landing-changes` passes
- [ ] `npm run test:all` passes
- [ ] Landing page untouched

## Post-launch

- [ ] npm publish (only when explicitly approved)
- [ ] Product Hunt (`launch/product-hunt-later.md`)
