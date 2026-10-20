# Design system — Len Bible

<!-- impeccable:design-schema 1 -->

## World

**Mode:** Operate (app shell) with Read (chapter surface) and Persuade (signed-out marketing).

**Identity:** Dark sanctuary — deep indigo night (`#0f0f1a` / `#1a1a2e`), warm parchment text (`#f0ebe3`), gold primary (`#d4a853`), muted purple accent (`#6b4c9a`). Refine, do not rebrand to purple-on-white SaaS.

**Emotional register:** Warm, calm, confident. Celebrate mastery; keep reading quiet.

## Typography

- UI / chrome: Geist Sans (`--font-geist-sans`)
- Scripture body: Literata (`--font-bible`) via `.prose-bible`
- Display emphasis: solid `text-primary` preferred; `.gradient-text` reserved for brand wordmark only
- Tabular nums for streaks, points, ranks

## Surfaces

- `.glass-card` — frosted panel for interactive containers
- `.glow-primary` — soft gold glow for primary CTA cards
- Avoid carding everything; use cards when elevation marks an interactive block

## Motion

- Quiz transitions: Framer Motion, honor `prefers-reduced-motion`
- Confetti on quiz pass (CSS `confetti-fall`)
- Level-up toast; streak pulse on home when at risk
- No continuous animation on reading text

## Core loop UX

1. Continue CTA → Read
2. Scroll + dwell → chapter read points
3. Primary CTA → Quiz (streak on pass)
4. Review highlights correct option
5. Next chapter after pass

## Accessibility

- Skip link, `aria-current` nav, quiz radiogroup, live regions on load/result
- Focus-visible rings via browser defaults + primary borders on inputs
- WCAG AA contrast target on body and primary CTAs

## Tokens

See `:root` in `src/app/globals.css`.
