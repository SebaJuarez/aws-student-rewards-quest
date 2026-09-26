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
  - `src/domain/` — DOM-free logic: `dates.js` (local calendar-date + ISO week helpers),
    `activity.js` (pure streak/week transitions + derived views), `activityLog.js` (the
    activity-log source of truth: normalization, run/week rebuilds, Activity-section models —
    summary, 90-day heatmap), `store.js` (the **only**
    module allowed to touch `localStorage`), `status.js` (`statusOf` / `completedCount`),
    `progress.js` (level / milestone / day selectors + `timelineModel`, the single source of
    journey dates) + `rewardProgress()` (next reward, gap, projected milestone date),
    `quest.js` (the deterministic Today's Quest rule engine: prioritized actions and
    at-risk detection).
  - `src/ui/` — `render.js` (orchestrator), `views/` (one file per page section), `drawer.js`,
    `toast.js`, `events.js` (all DOM event wiring lives here).
  - `src/styles/` — `tokens.css` (design tokens), `base.css`, `layout.css`, `components.css`,
    `overlays.css`, `responsive.css`. Link order in `index.html` is cascade order:
    `responsive.css` must stay last (it overrides rules from the other files).
  - `tests/` — dependency-free domain tests (see §10). The root `package.json` exists **only**
    to declare `"type": "module"` and the `test` script: no dependencies, no build step, and
    the app still runs with zero install.
- No backend, no auth, no database, no paid services. Everything lives in the browser via
  `localStorage`, under the versioned key `aws-student-rewards.quest.v3`. The legacy
  `aws-student-rewards.quest.v2` and `.v1` keys are migrated into v3 on first load and are
  then left in place untouched as backups (they are never deleted, so a failed migration
  never destroys progress).
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
`UserState`, `defaultState()`, `load()`/`save()`/`normalizeState()` → `src/domain/store.js`;
`statusOf` → `src/domain/status.js`; derived streak/week views → `src/domain/activity.js`.

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

// Persisted user state -> localStorage["aws-student-rewards.quest.v3"]
UserState = {
  version: 3,                          // STATE_VERSION — bump together with STORAGE_KEY
  startedAt: "YYYY-MM-DD",             // local calendar date
  mode: "personal" | "community",
  completed: { [badgeId]: true },       // quick + community badge completion
  overrides: { [badgeId]: "not_started"|"active"|"completed" }, // manual force-status
  streaks: {
    signin: {
      current: number,   // length of the run AT THE TIME OF `last` (not a live value)
      longest: number,   // best run ever recorded (never reset)
      startedAt: "YYYY-MM-DD"|null,  // first day of the current run
      last: "YYYY-MM-DD"|null        // day the run was last logged (the identity of the run)
    },
    like:   { ... same shape },
    comment:{ ... same shape }
  },
  weekly: {
    wishVote:       { weeks: ["2026-W39", ...], longest: number },
    articlePublish: { weeks: ["2026-W39", ...], longest: number }
  },
  // THE activity log — what the user actually did, day by day (source of truth;
  // streaks/weekly above are derived from it and rebuilt on every load/import)
  activityLog: {
    "YYYY-MM-DD": {                    // only days with something logged; no empty days
      signin?: true, like?: true, comment?: true,   // only `true` is ever stored,
      wishVote?: true, articlePublish?: true        // key order = ACTIVITY_KEYS
    }                                 // an invalid date key throws (never guessed)
  },
  notes: { [badgeId]: string }
}
```

Key design decision: the three "streak" families (sign-in / like / comment) are **one
continuous counter each**, not nine independent trackers. The 7-day / 30-day / 90-day badges
of the same family are just milestones read off the same counter (`current >= target`). This
matches how the real program works — do not split them back into per-badge counters.

Second key decision: `activityLog` is the record of truth; `streaks`/`weekly` are caches
derived from it (`rebuildStreaks` / `rebuildWeekly` in `src/domain/activityLog.js` run at the
end of every `normalizeState`, i.e. on every load and import). The caches also carry what the
log cannot know — `longest` records and legacy `weeks` that predate day-level logging.

### 4.1 Streak and week rules (the domain's source of truth)

All of this lives in `src/domain/dates.js` (date/week primitives),
`src/domain/activity.js` (pure transitions + derived views),
`src/domain/activityLog.js` (log normalization, run/week rebuilds, Activity-section models) and
`src/domain/quest.js` (the rule engine: prioritized actions, at-risk detection).
`store.js` only persists what those functions return; nothing in `src/ui/` may re-derive any
of it.

- **Dates are local calendar dates** (`"YYYY-MM-DD"` built from local components). Never use
  `toISOString().slice(0,10)` and never `new Date("YYYY-MM-DD")` (UTC parsing) — use
  `todayStr()`, `parseLocalDate()`, `addDays()`, `daysBetween()`, `formatDate()`. Arithmetic
  (`addDays` / `daysBetween` / week math) runs on UTC-normalized midnights so DST cannot
  shift a date.
- **Daily streak**: `nextStreak(state, today)` returns a new streak only when
  `daysBetween(last, today) === 1` (continue) or there is no `last` (start at 1). Same day →
  `logged:false` (idempotent); any other gap → restart at 1; `longest` is only ever raised.
  An out-of-order date (before `last`) is refused.
- **Live reads**: `streakView(state, today)` derives `current = last is today or yesterday ?
  stored current : 0`, plus `alive`, `loggedToday`, `atRisk` (last was yesterday) and
  `expired` (gap > 1 day). Stored `current` is "as of `last`"; the derived value is what the
  UI and `statusOf` show, so a counter can never look alive after a gap.
- **Weekly streak**: weeks are stored as ISO week keys (`"2026-W39"`, Mon–Sun, week 1 = the
  week containing Jan 4). `nextWeek()` adds the current week key only if it is not already in
  `weeks`. `weekView(state, today)` derives `current` (consecutive weeks ending at the last
  registered week, only while that week is the current or previous one), `loggedThisWeek`,
  `atRisk`, `expired` and `longest` (max run over `weeks`).
- **Activity log**: `activityLog[date][key] = true` records what actually happened;
  `logStreak`/`logWeek` write today's key (idempotent) and then rebuild the caches from the
  log, `resetStreak`/`resetWeek` delete that key's days (`longest` survives). A day is only
  written for dates `>= last`, so history is never backfilled or invented.
- **Derived models**: `activitySummary()` + `heatmapModel()` (`activityLog.js`) and
  `timelineModel()` (`progress.js`) are the only sources the Activity section and the
  timeline may read — views must not compute day windows, milestone dates or week columns
  themselves. Heatmap cells are `<button>`s with a full `aria-label`; red is reserved for
  lost/risk, green for done, orange rings for milestones.
- **Today's Quest engine**: `getNextBestActions(state, today)` (`quest.js`) ranks rule-based
  actions through fixed `PRIORITY` tiers — daily streak at risk (100) → long-runway start of an
  unstarted 90-day family (90) → weekly window still open (80) → one-time quick win (70) →
  community goal (60) — deduped by id, stably sorted, capped at `MAX_ACTIONS` (5). Each action
  carries WHAT/WHY/TIME/AFFECTS (`title`, `description`, `estimatedMinutes`, `deadline`,
  `relatedBadges`) plus the personal `status`, the AWS `requirement` paraphrase and
  `basis:'recommended'`: copy must never speak as an AWS mandate (tests enforce this).
  `getAtRiskItems(state, today)` returns only objective exposure — a live daily run not logged
  today (deadline = today) and a live weekly run whose current week is open (deadline = the
  coming Sunday via `weekEndDate()` in `dates.js`) — never "not started": nothing can be lost
  yet. `rewardProgress(state, today)` (`progress.js`) feeds the quest summary line: next
  reward, badges to go, and the earliest projected milestone date — projected only from runs
  already logged today/this week, never from a lapsed run, and skipping badges pinned by an
  override. Views render from these three functions only; they must not re-derive priorities,
  deadlines or projections.
- **`statusOf(badge, state, today?)`** stays the only source of displayed status. Precedence:
  manual `override` → `completed`/`not_started` for quick & community → milestone for streak
  (`current >= target` → completed, `current > 0` → active) and weekly (same, in weeks).
  The optional `today` parameter exists for tests only; UI call sites rely on the default.
- **Community Mode is read-only.** `getViewState()` returns the demo state when
  `mode === 'community'`; every view and the drawer must render from the state they are
  handed (never from `getState()`), and demo-state actions (log/reset/override/note) are
  disabled so demo progress can never mix with personal counters.

Assumptions / limitations worth knowing before you change any of this:

- A milestone reflects the **current** run, not `longest`: breaking a 30-day streak makes the
  30-day badge show `not_started` again (the risk framing is intentional). Use a manual
  override to pin a badge the real AWS program already granted you.
- The v1→v2 migration cannot reconstruct day-by-day history: a v1 counter that was still
  alive at migration keeps its value (it may be optimistic, because the old code incremented
  across gaps); a v1 counter whose `last` was more than a day old is reset to 0 with
  `longest` preserved. The v2→v3 step then seeds an `activityLog` only from counters that
  were **alive** at migration (at most 365 days back); anything older, any lapsed counter and
  any pre-day-logging `weeks` entry stays baseline data with no invented days.
- Logging is refused when the date is before `last` (clock moved backwards / timezone travel
  westwards); the streak view keeps showing the run until `last` catches up.
- `weekly.*.longest` is persisted, so a reset of `weeks` never erases the record.

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
  `save()` plus intent-level mutations (`logStreak`, `resetStreak`, `logWeek`, `resetWeek`,
  `setOverride`, `clearOverride`, `setNote`, `setMode`, `resetAll`, `replaceState`,
  `importState`) and the readers `getState()` (raw) / `getViewState()` (personal state, or
  the demo state in Community Mode). Never call `localStorage.getItem/setItem` from a view,
  render function, or event handler directly — views render from the state they are handed.
- Bump `STORAGE_KEY` (e.g. `...v3`) **together with `STATE_VERSION`** and write a migration
  in `load()` inside `src/domain/store.js` if you change the shape of `UserState` — don't
  silently break existing users' saved progress. `normalizeState()` is the validation gate:
  structural problems throw (so `importState` rejects the file), while coercible values are
  sanitized. The v1→v2 migration is the reference implementation of both.
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

1. **Per-day activity log editing** — the log, streak identities and week keys exist, and the
   Activity section now shows today, the last 7 days, a 90-day heatmap and recent entries, but
   there is still no UI to log or undo an arbitrary *past* day (logging only accepts today;
   history is never backfilled, on purpose).
2. **Subtle completion micro-interactions** (badge pop, XP gain animation) — currently instant
   state updates with no animation.
3. **Per-badge unique source mapping** — all badges currently cite the same pool of 5
   community sources; a more precise mapping (which specific article covers which badge) would
   strengthen the "Sources" drawer.
4. **Accessibility pass**: current build has semantic HTML, focus-visible states, `sr-only`
   text, aria-labelled heatmap cells, and `prefers-reduced-motion`, but has not had a full
   screen-reader/keyboard-only walkthrough.
5. **Light theme** — only dark theme exists today.
6. **React + TypeScript + Vite migration** (see §3) — only worth doing once UI complexity
   justifies component boundaries; keep the data model from §4 intact if you do this.
7. **Shareable progress image / leaderboard / cloud sync** — explicitly deferred until there's
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

Tests are dependency-free and run on Node's built-in test runner (no install needed):

```bash
npm test            # == node --test "tests/*.test.js"
```

They cover the domain only (`src/domain/*`): local-date math, daily streak rules, ISO week
rules, milestone status, the activity log (normalization, rebuilds, summary, 90-day heatmap),
the Today's Quest rule engine (priorities, ranking, at-risk honesty, no-mandate copy,
`rewardProgress` projections), v1→v2→v3 migration, import validation, and localStorage
persistence (via a fake
`localStorage` in a child process). No DOM/browser test lives in the repo — if you touch UI
code, verify manually with a static server (§10) or a headless browser; the v3 work was
validated with a Chrome DevTools Protocol smoke script (render, log/reset, Community Mode,
quest priorities/AT RISK, import/export, migration, zero console errors) plus desktop/mobile
screenshots.
