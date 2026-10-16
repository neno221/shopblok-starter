# Architecture decision records

An ADR records one decision that the code, the spec or a later task depends on, with the evidence that
made it. M0 has three, one per spike (M0 plan §6), and M1 adds 0004 (S4, M1 plan §6). Write the next
one when a choice is expensive to undo or when someone will ask "why is it like this" in a year; do not
write one for a choice the spec or the plan already makes.

| # | Title | Spike | Status |
|---|---|---|---|
| [0001](0001-cache-components-payload.md) | Cache Components with the embedded Payload admin | S1 | **Accepted** 2026-10-10: keep Cache Components on |
| [0002](0002-search-locale-indexing.md) | Per-locale indexing with the Search Module | S2 | **Accepted** 2026-10-10: one index per locale on Meilisearch (M6), one multilingual index on Postgres (M3) |
| [0003](0003-payload-locale-preloading.md) | Payload preloads 42 languages, and the `markets` global decides which the admin offers | S3 | **Accepted** 2026-10-10: keep the preload; locales only grow |
| [0004](0004-catalog-data-in-the-shell.md) | Catalog pages read their data in the static shell, so a backend outage serves the last good page or a 5xx, never a 200 error page | S4 (M1) | **Accepted** 2026-10-16: D36 as the owner chose it, confirmed by S4's PASS; `ensureStatic = "navigation"`, per-visitor parts read in the browser, `/next/status` |

## Rules

- **File name:** `NNNN-short-title.md`, numbered in the order they are written, never renumbered.
- **Status:** *Proposed* (written, not yet agreed), *Accepted* (agreed: the code and the spec follow it),
  *Superseded by NNNN* (a later ADR replaced it). A spike writes its ADR as *Proposed* and the owner's
  decision, or silence on the readings the ADR lists, makes it *Accepted*. The status row says who
  decided and when.
- **An accepted ADR is not rewritten.** If the decision changes, write a new ADR that supersedes it and
  change the old one's status line to point at it. Corrections of a fact (a wrong number, a broken
  link) and the "In CI since" notes that say where a check now runs are fine.
- **The evidence is part of the decision.** Test results, the mutations that showed the tests can fail,
  and what was *not* tested go in the ADR, not in a chat.
- **Spike code does not merge** (plan D13). The prototype stays in one commit that `main`'s history
  keeps (PRs merge with a merge commit), and the ADR names it. Only the ADR, the tests that encode the
  decision and the configuration change merge.

## Template

```markdown
# ADR NNNN: <the decision, as a sentence>

| | |
|---|---|
| Status | **Proposed** / **Accepted** <date> by <who> / Superseded by NNNN |
| Date | YYYY-MM-DD |
| Spike or task | S1, docs/plans/M0.md §6 |
| Versions | the versions the evidence was measured on |
| Prototype | the commit, and how to reproduce |

## Context
What problem, and what the sources say (checked, with versions). What the spec said before.

## Options
The alternatives that were built or seriously considered, one line each, with the one that was chosen
marked.

## Tests and results
What was run, on what, with the numbers. The mutations that showed each test can fail. What was not
tested.

## Decision
The decision, in one paragraph, then the readings of the plan's rules that the owner confirms. The
fallback that was not taken, if there is one.

## Consequences
What the next milestones have to do, what got harder, what is still open.

## Spec changes
The lines of SPEC.md this changes (section and wording), so the next spec version applies them.
```

ADR 0001 follows this template; 0002 and 0003 add a "Found on the way" or "Reproduce" part where the
spike needed one.
