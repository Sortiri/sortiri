# GitHub org privacy

Sortiri is maintained under the [sortiri](https://github.com/sortiri) GitHub organization, not a personal profile.

## Organization repo

- Canonical repository: [github.com/sortiri/sortiri](https://github.com/sortiri/sortiri)
- Use the org repo for issues, PRs, and releases
- Do not fork to a personal repo for official contributions — fork from `sortiri/sortiri`

## Org membership

- Keep org membership private if you prefer
- Maintainers are listed on the org profile, not individual contributor emails in public docs

## Git commit identity

Use a GitHub noreply email for commits to this repo when contributing on behalf of Sortiri:

```bash
git config user.name "Your Name"
git config user.email "<id>+<username>@users.noreply.github.com"
```

Find your noreply address in GitHub → Settings → Emails.

**Do not force global git config.** Set identity per-repo only.

Maintainer scripts may set local author from environment variables when provided:

```bash
export SORTIRI_GIT_AUTHOR_NAME="Sortiri"
export SORTIRI_GIT_AUTHOR_EMAIL="<id>+sortiri@users.noreply.github.com"
```

Scripts apply these only to the local repo, never globally.

## What not to commit

- Personal workspace IDs
- API keys (`sk_sortiri_...`)
- Setup tokens
- Real customer or internal data in examples
- Personal email addresses in README or launch copy

## Launch and docs copy

Use **Sortiri** org identity in README, docs, and launch materials:

- Link to `github.com/sortiri/sortiri`
- Do not reference personal GitHub profiles as the canonical home
- Do not include fake star counts

## Sanity checks

The open-source sanity script checks for personal emails in git config and banned patterns in docs. Run:

```bash
npm run sanity:open-source-project
```

## See also

- [contributing.md](contributing.md)
- [security.md](security.md)
