# AWS Student Rewards Quest

A local-first, gamified roadmap and tracker for the 21 badges in AWS Builder Center's
**Student Rewards** program — built to answer one question at a glance: *where am I, what
can I do today, what unlocks next, and what am I at risk of losing?*

> **Not affiliated with or endorsed by Amazon Web Services.** This is an independent,
> community-built tracker based on publicly available AWS Builder Center guidance.

**[Live demo →](#)** _(paste your published/hosted link here once you deploy it)_

![status](https://img.shields.io/badge/status-v1-orange) ![no backend](https://img.shields.io/badge/backend-none-blue) ![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What it does

- Tracks progress on all 21 Student Rewards badges — `X / 21`, by phase, with real names and
  paraphrased requirement summaries.
- **Today's Quest**: computes the 3–5 highest-value actions to take right now (streaks at
  risk first, then long-duration streaks worth starting on day 1, then quick wins), with an
  explicit **AT RISK** block for whatever you can still lose before the day or the week closes.
- **Activity section**: today's log, the last 7 days, a 90-day heatmap and recent entries —
  the day-by-day record of truth that streaks and weeks are rebuilt from.
- **Streaks**: sign-in, like, and comment activity tracked as continuous counters, with the
  7 / 30 / 90-day badges read off the same counter as milestones.
- **90-day timeline**: dynamically calculated Day 1 / 7 / 30 / 90 markers from your actual
  start date.
- **Reward tracker**: 7 badges → $10 AWS Credits, 14 badges → +$20 credits, 21 badges → $100
  AWS Foundational Certification exam voucher (confirmed against the official AWS News Blog
  announcement).
- **Sources & Methodology**: every badge links back to the community posts it was
  synthesized from, clearly labeled `official` vs `community`, with a "verification needed"
  note wherever AWS hasn't published exact wording.
- **Personal / Community mode** toggle, manual status overrides, per-badge notes,
  export/import as JSON, and a full reset — all stored in your browser's `localStorage`.
  No account, no server, no data leaves your machine.

## Why it exists

AWS's own program page tells you *that* the badges exist. It doesn't tell you which ones to
start on day one, which streaks quietly reset your progress if you miss a day, or how the
first 6 quick-win badges relate to the 90-day endgame. This tool turns that into an actual
plan.

## Tech stack

HTML, CSS, and vanilla JavaScript as native ES modules — no build step, no framework, no
dependencies besides a Google Fonts request (IBM Plex Sans / IBM Plex Mono). The code lives
in small, single-purpose modules under `src/` and ships as plain static files, so it runs
anywhere that serves static files: a static host, GitHub Pages, or a local server. See
[`AGENTS.md`](./AGENTS.md) for the full rationale, folder conventions, data model, and refactor
path if you want to move it to a component framework later.

```
src/
├── app.js        # entry point: wires events, triggers the first render
├── data/         # static catalog: badges + phases, sources, reward tiers
├── domain/       # DOM-free logic: store (localStorage), status rules, activity, quest engine
├── ui/           # render orchestrator, one view file per section, drawer, events
└── styles/       # design tokens, base, layout, components, overlays, responsive
```

## Running it

There's nothing to install — just serve the files over http (the app uses ES modules, so
opening `index.html` directly from disk won't work):

```bash
git clone https://github.com/SebaJuarez/aws-student-rewards-quest.git
cd aws-student-rewards-quest
npx serve .             # or: python3 -m http.server 8080
```

Then open the printed localhost URL.

## Project status & roadmap

This is v1 — the core loop (track, decide what to do today, don't lose your streak) works
end to end. Deliberately left for later iterations: logging or undoing an arbitrary *past* day
in the activity log, completion micro-animations, a light theme, and (optionally) a
React/TypeScript rewrite once the UI outgrows the current module split. Full backlog and
editing conventions live in [`AGENTS.md`](./AGENTS.md) — start there before opening a PR or
pointing an AI coding agent at this repo.

## Sources

Built from the official AWS announcement plus publicly available AWS Builder Center community
guides, synthesized and paraphrased — not copied. Full list with authors, dates, and links is
inside the app's **Sources & Methodology** section, and in [`AGENTS.md`](./AGENTS.md#5-source-integrity-rules-hard-constraints-not-style-preferences).

## Contributing

Issues and PRs welcome — especially around the backlog items in `AGENTS.md`. If you change
anything about badge requirements or reward tiers, please cite a real source (official or
community) rather than guessing.

## License

MIT — see [`LICENSE`](./LICENSE).

## Disclaimer

"AWS Student Rewards Quest" is an independent, community-built roadmap and tracker. It is not
affiliated with, endorsed by, or sponsored by Amazon Web Services, Inc. AWS, the AWS logo, and
"AWS Builder Center" are trademarks of Amazon.com, Inc. or its affiliates. Reward details may
change — always verify on AWS Builder Center before relying on this tool to redeem anything.
