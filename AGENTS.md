# AGENTS.md

Context file for AI coding agents (opencode, Claude Code, Cursor, etc.) working on this repo.
Read this fully before editing. It supersedes generic assumptions about stack, style, or scope.

## 1. What this project is

**AWS Student Rewards Quest** is a local-first, gamified roadmap and tracker for the 21 badges
in AWS Builder Center's *Student Rewards* program. It helps a student answer, at a glance:
"Where am I, what can I do today, what unlocks next, and what am I at risk of losing?"

It is an **independent community project**. It is **not** an official AWS product, is **not**
affiliated with or endorsed by Amazon Web Services, and must never present itself as such.
This constraint is not cosmetic — see §5 before touching any copy about badges, requirements,
or rewards.

## 2. Current state (v1)

- Static multi-file app: `index.html` holds the markup; all behavior lives in native ES
  modules under `src/`; all styling lives in split stylesheets under `src/styles/`. No build
  step, no bundler, no dependencies — serve it over http(s) (see §10).
- Folder layout:
  - `src/app.js` — entry point: wires events, triggers the first render.
  - `src/data/` — static catalog only: badge definitions + phases (`badges.js`), cited
    sources (`sources.js`), reward tiers (`rewards.js`).
  - `src/domain/` — DOM-free logic: `dates.js`, `store.js` (the **only** module allowed to
    touch `localStorage`), `status.js` (`statusOf` / `completedCount`), `progress.js`
    (level / milestone / day selectors), `quest.js` (Today's Quest suggestions).
  - `src/ui/` — `render.js` (orchestrator), `views/` (one file per page section), `drawer.js`,
    `toast.js`, `events.js` (all DOM event wiring lives here).
  - `src/styles/` — `tokens.css` (design tokens), `base.css`, `layout.css`, `components.css`,
    `overlays.css`, `responsive.css`. Link order in `index.html` is cascade order:
    `responsive.css` must stay last (it overrides rules from the other files).
- No backend, no auth, no database, no paid services. Everything lives in the browser via
  `localStorage`, under the versioned key `aws-student-rewards.quest.v1`.
- Ships with the author's real starting state hardcoded as the *default* (2/21 badges:
  Hello, World! + Photo Finisher) — but nothing is hardcoded into the UI; every number is
  derived from state at render time. Never reintroduce hardcoded progress into a component.
- Was authored and is currently hosted as a published Claude Artifact (self-contained HTML,
  fonts loaded from Google Fonts, no other external calls). Keep it deployable as a static
  site (GitHub Pages, Netlify, or any static host) — do not add anything that requires a
  server. Note: because the app now uses ES modules, opening `index.html` via `file://` does
  not work; a local http server is required (§10).

## 3. Why vanilla HTML/CSS/JS instead of React/TS/Vite

The original brief asked for React + TypeScript + Vite + Tailwind. That stack was deliberately
swapped for dependency-free vanilla HTML/CSS/JS because the first deliverable needed to run
as a shareable static page with zero build step and no external JS module loading. The code
was later split into native ES modules under `src/` — still with zero build step and zero
dependencies. This is a **valid future refactor**, not a mistake — see the backlog in §8. If
you do migrate:
- Keep it statically exportable (e.g. Vite's `build` output as plain files) — no server-only
  features.
- Preserve the data model in §4 as the source of truth; don't redesign it from scratch.
- Keep bundle size and dependency count low; this app has no real need for a component
  framework's overhead, so justify the migration cost against actual UI complexity growth.

## 4. Data model (as implemented under `src/`)

Locations: `Badge` and `Source` shapes → `src/data/badges.js`, `src/data/sources.js`;
`UserState`, `defaultState()`, `load()`/`save()` → `src/domain/store.js`;
`statusOf` → `src/domain/status.js`.

```js
// A badge definition (static, in-code — not user data)
Badge = {
  id: string,            // slug, e.g. "streak-signin-30"
  n: number,              // 1–21, the official badge number
  name: string,
  phase: string,          // one of PHASES — recommended-path grouping, NOT an AWS sequence
  type: "quick" | "streak" | "weekly" | "community",
  req: string,            // paraphrased requirement summary — never copied verbatim from a source
  // type === "streak" only:
  key: "signin" | "like" | "comment",
  target: 7 | 30 | 90,
  // type === "weekly" only:
  key: "wishVote" | "articlePublish",
  target: 4,
  // type === "quick" only:
  dur?: string            // rough effort estimate, e.g. "~5 min"
}

// A cited source (static, in-code)
Source = {
  id: string, title: string, author: string, url: string,
  pub: "YYYY-MM-DD", upd?: "YYYY-MM-DD",
  type: "official" | "community"
}

// Persisted user state -> localStorage["aws-student-rewards.quest.v1"]
UserState = {
  version: 1,
  startedAt: "YYYY-MM-DD",
  mode: "personal" | "community",
  completed: { [badgeId]: true },       // quick + community badge completion
  overrides: { [badgeId]: "not_started"|"active"|"completed" }, // manual force-status
  streaks: {
    signin: { current: number, longest: number, startedAt: string|null, last: string|null },
    like:   { ... same shape },
    comment:{ ... same shape }
  },
  weekly: {
    wishVote:       { current, longest, startedAt, last },
    articlePublish: { current, longest, startedAt, last }
  },
  notes: { [badgeId]: string }
}
```

Key design decision: the three "streak" families (sign-in / like / comment) are **one
continuous counter each**, not nine independent trackers. The 7-day / 30-day / 90-day badges
of the same family are just milestones read off the same counter (`current >= target`). This
matches how the real program works — do not split them back into per-badge counters.

`statusOf(badge, state)` is the single source of truth for a badge's displayed status.
`overrides` always wins, so a user can always manually correct a badge the tracker got wrong.
Never compute status a second way in a new component — call `statusOf`.

## 5. Source-integrity rules (hard constraints, not style preferences)

AWS is the sole source of truth for which badges exist and what they require. This app's
"Recommended Path" (phases, ordering, day-1 suggestions) is an opinionated layer on top —
**never blur that line in copy**.

- Never invent a badge requirement, threshold, or reward detail. If it isn't confirmed by an
  actual source, the UI must say so ("Verification needed") instead of guessing.
- Never copy article text, marketing copy, or images from Builder Center posts or the AWS
  News Blog. Requirement strings (`Badge.req`) must stay original paraphrases.
- Keep the distinction visible in the UI: **AWS requirement** vs **recommended path** vs
  **personal progress**. Don't merge these concepts to simplify a component.
- Every badge's source-of-record note ("community interpretation, not official AWS wording")
  in the detail drawer must stay — do not remove it as "clutter."
- Keep the non-affiliation disclaimer in the footer, unedited in meaning, on every screen the
  app can land on.
- If a future refactor adds new badges, phases, or reward tiers, add real `Source` entries for
  them (id, author, url, published date, `official`/`community`) before writing copy — don't
  ship a badge without a citation.

Confirmed-official facts (safe to state as fact, verified against the AWS News Blog post,
25 Sep 2026): the program requires SheerID student verification + a completed Builder Center
profile, grants 12 months of AWS Skill Builder Premium, and pays out at 7 badges ($10 AWS
Credits), 14 badges (+$20 credits), and 21 badges ($100 AWS Foundational Certification exam
voucher). Everything else (exact per-badge wording, whether badges have hard prerequisites) is
a community-sourced synthesis and should keep being labeled as such.

## 6. Design system

The look is intentionally **not** a generic AI-generated dashboard: no violet/blue gradients,
no glassmorphism, no repeated identical shadow-cards, no Tailwind-template feel, minimal
emoji. Single dark theme (this is a deliberate identity choice, not an oversight — there is no
light mode yet, see backlog).

- Palette (CSS custom properties at `:root` in `src/styles/tokens.css`):
  `--bg:#0a0d12` `--bg2:#11161d` `--card:#151b23` `--border:#232b36`
  `--text:#e7edf3` `--dim:#8f9aa6` `--faint:#576270`
  `--accent:#ff9900` (AWS orange — used as a highlight, never a fill) `--green:#3fb950`
  `--yellow:#d9a441` `--red:#f0605a` `--locked:#3a424d`
- Type: IBM Plex Sans for body/UI, IBM Plex Mono for numbers, labels, and status pills
  (console/developer-tooling feel). Loaded from Google Fonts — the only external network
  dependency.
- Icons are plain Unicode glyphs (✓ ▶ ⚠ ↗ ✕) styled with CSS, not an icon library. Keep it
  that way unless a real need for illustrative icons appears; it fits the terminal aesthetic
  and avoids an extra dependency.
- Status colors: green = completed, orange = active/available, gray = not started, red =
  risk/streak-loss only. Don't repurpose red for anything else.
- Numbered badge markers (`01`–`21`) are legitimate here because the badges genuinely have an
  official sequence number — don't remove them, and don't add numbering elsewhere without the
  same justification.

## 7. Conventions when editing

- Centralize all `localStorage` access in `src/domain/store.js`. That module exposes
  `save()` plus intent-level mutations (`logStreak`, `resetStreak`, `setOverride`,
  `clearOverride`, `setNote`, `setMode`, `resetAll`, `replaceState`). Never call
  `localStorage.getItem/setItem` from a view, render function, or event handler directly —
  views read state through `getState()` and change it through those mutations.
- Bump `STORAGE_KEY` (e.g. `...v2`) and write a migration in `load()` inside
  `src/domain/store.js` if you change the shape of `UserState` — don't silently break
  existing users' saved progress.
- Every derived number in the UI (`completedCount`, level, next milestone, day count) must be
  computed from `state`/`BADGES` at render time — never hardcode a count.
- Keep `render()` (in `src/ui/render.js`) idempotent and cheap enough to call after every
  state mutation; the whole app currently just calls `render()` on any change rather than
  diffing. That's fine at this size — don't add a virtual-DOM layer for it without a real
  performance reason. New page sections = new file in `src/ui/views/` + one call in
  `render.js`.
- Respect `prefers-reduced-motion` (already handled globally) if you add any new animation.
- Keep the split buildless: native ES modules + linked stylesheets, no bundler, no
  `package.json` scripts required to run. If a build step is ever introduced, it must still
  emit plain static files (no SSR, no API routes), and the no-build path must keep working.

## 8. Known simplifications / backlog for iteration

Left out of v1 deliberately to ship a working core first. In rough priority order:

1. **90-day contribution heatmap** (90 individual day-cells, gray/orange/green/red) described
   in the original brief — currently replaced by a 4-point timeline strip (Day 1/7/30/90).
2. **Per-day activity log** (visit/like/comment/wish-vote/article, selectable by calendar day)
   — currently only aggregate streak counters exist, not a day-by-day log.
3. **Subtle completion micro-interactions** (badge pop, XP gain animation) — currently instant
   state updates with no animation.
4. **Per-badge unique source mapping** — all badges currently cite the same pool of 5
   community sources; a more precise mapping (which specific article covers which badge) would
   strengthen the "Sources" drawer.
5. **True calendar-week tracking** for the two 4-week badges — currently a simple "log this
   week" counter (0–4), not tied to actual ISO week boundaries.
6. **Accessibility pass**: current build has semantic HTML, focus-visible states, and
   `prefers-reduced-motion`, but has not had a full screen-reader/keyboard-only walkthrough.
7. **Light theme** — only dark theme exists today.
8. **React + TypeScript + Vite migration** (see §3) — only worth doing once UI complexity
   justifies component boundaries; keep the data model from §4 intact if you do this.
9. **Shareable progress image / leaderboard / cloud sync** — explicitly deferred until there's
   a backend; do not add a backend without discussing it first, per §9.

## 9. Guardrails — do not do these without being explicitly asked

- Do not add a backend, database, authentication, or any paid service.
- Do not add tracking/analytics scripts.
- Do not remove or water down the AWS non-affiliation disclaimer.
- Do not present community-sourced badge requirements as official AWS fact.
- Do not add external script/style dependencies beyond Google Fonts unless there's a strong
  reason — this app's whole value proposition includes "runs anywhere, no install."

## 10. Running / previewing locally

No build step — but the app uses ES modules, so it must be served over http(s) (browsers
block module loading from `file://`):

```bash
npx serve .
python3 -m http.server 8080
```

Then open the printed localhost URL. GitHub Pages / Netlify / any static host work the same
way with no extra configuration.

There is no test suite yet. If you add one (recommended before a big refactor), prefer
something dependency-light (e.g. Playwright for a couple of smoke tests: load app, toggle a
badge, export, import, reset) over a heavy framework.
