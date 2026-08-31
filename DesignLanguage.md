# TithiMiti Design Language — "Hundred Studios"

A complete, portable specification of the visual and interaction language used by
TithiMiti. Everything needed to replicate the look and feel in another app (native
or web) is in this document. In the codebase the tokens live in
`src/ui/theme/hundred.ts`; core components carry a legacy `Nothing*` prefix
(`NothingText`, `NothingButton`, `NothingTextInput`) from an earlier design era —
the prefix is historical, the styling is entirely Hundred Studios.

---

## 1. Philosophy

Three principles drive every decision: **unique design, deliberate use of color,
consistency.**

1. **Paper & ink, not white & black.** Every neutral is warm — cream paper
   backgrounds, ink-brown text, sand-toned borders. Pure `#FFFFFF` appears only as
   the card color in light mode; pure black never appears.
2. **One vivid brand accent, three supporting hues.** A sindoor-vermilion red is
   the identity color. It is supported by exactly three secondary hues — marigold,
   teal, iris — and each hue is permanently assigned to a feature domain (§2.3).
   Colors are never decorative or arbitrary; a hue always *means* something.
3. **Serif display over sans UI.** Fraunces (a warm, high-contrast serif) for
   headlines and big numerals; Inter for everything else. The contrast between an
   expressive serif and a neutral sans is the typographic identity.
4. **Soft tonal fills instead of hard borders.** Emphasis comes from filling a
   container with a pale "soft" tint of its semantic hue, not from outlining it.
   Borders, when used, are 1px hairlines in a low-contrast sand tone.
5. **Generous, soft geometry.** Corner radii are large (14–28px on containers),
   action buttons are full pills, and even tiny dots are squircles (§6.1).

The overall feel: a warm, printed Nepali patro (almanac) rendered as a calm,
modern mobile app.

---

## 2. Color

### 2.1 Palette tokens

Both themes define the **same token set**; dark mode is a first-class re-mix of
the palette (deep coffee neutrals, brightened hues), not an inversion.

| Token           | Light     | Dark      | Role |
|-----------------|-----------|-----------|------|
| `background`    | `#FAF5EC` | `#171210` | Screen ground — warm paper / warm near-black |
| `card`          | `#FFFFFF` | `#211B16` | Raised containers: cards, tab bar, sheets, modals |
| `surface`       | `#F1E8DA` | `#2C241D` | Inset/neutral fills: inputs, chips, neutral detail cards |
| `text`          | `#241C14` | `#F5EDE1` | Primary text — ink brown / warm cream |
| `textSecondary` | `#6E624F` | `#A2937F` | Secondary text, inactive icons, placeholders |
| `border`        | `#E7DCC9` | `#3B3128` | Hairline borders, dividers, drag handles |
| `accent`        | `#D93822` | `#FF6B4F` | Brand vermilion: primary actions, selection, holidays |
| `accentSoft`    | `#FAE5DE` | `#3D2019` | Pale vermilion fill for tinted containers |
| `onAccent`      | `#FFF8EF` | `#26110B` | Text/icons placed on solid `accent` |
| `marigold`      | `#B97C0A` | `#F0B64A` | Gold/sun hue |
| `marigoldSoft`  | `#F7ECD2` | `#3A2D15` | Pale marigold fill |
| `teal`          | `#0F766E` | `#4FC7B4` | Forex/season/user-content hue |
| `tealSoft`      | `#DCEEE8` | `#14302A` | Pale teal fill |
| `iris`          | `#5356C5` | `#9B9DF0` | Horoscope/moon hue |
| `irisSoft`      | `#E8E8F8` | `#282A4A` | Pale iris fill |

Additional fixed values:

- **Modal scrim:** `rgba(23, 14, 8, 0.6)` — a *warm-tinted* dark overlay, never
  neutral `rgba(0,0,0,…)`.
- **Shadow color:** `#000` (used sparingly, see §5.3).

### 2.2 The soft-pair rule

Every hue ships as a **pair**: a saturated tone and a pale "soft" fill.
The pattern for tinted containers is always:

> soft tone as `backgroundColor` + saturated tone for the label/heading text +
> normal `text` color for values.

Examples: the Tithi card is `accentSoft` with `accent` text; gold price cards are
`marigoldSoft` with `marigold` labels; the horoscope card is `irisSoft`; the
season card is `tealSoft` with `teal` text. Never place saturated hue on
saturated hue, and never use a soft tone for text.

### 2.3 Semantic hue assignments (fixed, never remixed)

| Hue | Owns |
|-----|------|
| **Vermilion** (`accent`) | The calendar itself: selected day fill, holidays and Saturdays, "Today" pill, FAB, primary buttons, API event dots, brand kickers, retry actions, errors/destructive text, links, refresh spinners |
| **Marigold** | Gold prices, sun (sunrise/sunset), tithi kicker line, the **today ring** on the calendar grid, "stale data" warnings, auspicious-moment (muhurat) cards |
| **Teal** | Currency exchange, season (ritu), and **user-created content** (custom-event dots) |
| **Iris** | Horoscope/zodiac, moon (moonrise/moonset), rashi cards |

When porting the language, keep the rule even if the features differ: *the brand
red owns core content and primary actions; each auxiliary feature gets exactly one
of the three support hues and keeps it everywhere it appears* (section tick,
spinner, chips, selected states, tinted cards, caption labels).

### 2.4 Contrast rules

- `textSecondary` must hold **≥ 4.5:1 against `background`** — it is used at
  9–11px sizes where WCAG AA large-text allowances don't apply. (The palette was
  specifically corrected for this; don't "lighten it for elegance.")
- Anything rendered on solid `accent` uses `onAccent`, never white/black
  literals.

---

## 3. Typography

### 3.1 Typefaces

| Role | Family | Weights loaded |
|------|--------|----------------|
| Display (headlines, large numerals) | **Fraunces** (serif) | 600 SemiBold, 700 Bold |
| UI (body, labels, buttons, numbers in rows) | **Inter** (sans) | 400, 500, 600, 700 |

Both are free Google Fonts, so the language ports anywhere. Rule of thumb: if the
text is ≥ ~20px or is a hero numeral (the big day number in a badge), it's
Fraunces; everything else is Inter.

Implementation note (native): ship static per-weight font files and select the
file by weight — never rely on synthetic `fontWeight`, which fake-bolds or falls
back to the system font on Android.

### 3.2 Type scale

| Variant | Family / weight | Size | Case & tracking | Use |
|---------|-----------------|------|-----------------|-----|
| `h1` | Fraunces 700 | 30 (32 for screen titles) | none | Screen titles ("Bhadra 2083", "Events"), hero day numerals |
| `h2` | Fraunces 600 | 22 (19–20 for card numerals) | none | Selected-date heading, sheet date, prices, date-box numerals |
| `h3` | Inter 600 | 17 | none | Section headings, converter results |
| `body` | Inter 400 | 16 (14–14.5 in dense rows) | none | Body copy, event titles, dropdown values |
| `caption` | Inter 500 | 11 (9–10 when nested) | **UPPERCASE, letter-spacing 1.4** | Kickers, field labels, metadata, secondary date numerals |
| `dot` (label) | Inter 600 | 13 (11–12.5 in buttons/chips) | letter-spacing 1.2, rendered UPPERCASE in buttons | Buttons, toggles, weekday headers, "RETRY" |

Line-height is default except long-form paragraph blocks (horoscope text:
13.5/21).

### 3.3 The kicker pattern

Every screen opens with a **brand row**: an 8×8 accent squircle tick + an
uppercase `caption` in `accent` (e.g. `▪ CALENDAR`, `▪ THIS MONTH`), followed by
the `h1` Fraunces title. Section headings inside a screen use the same tick +
`h3`, with the tick painted in the section's semantic hue (§2.3). This tick/label
pairing is the most recognizable signature of the language.

### 3.4 Text conventions

- Micro-labels, buttons, and field labels are UPPERCASE with wide tracking;
  everything else is sentence case.
- Metadata strings join fragments with a spaced middot: `Gold · Tola`,
  `1 USD = ₨… · NRB · 2083-05-14`, `2083/5/14  ·  Today`.
- Errors are calm, sentence-case, and pair the problem with the remedy using an
  em dash: *"Events didn't load — tap to retry."* Every error state offers an
  inline pill `RETRY` action.
- Cap OS font scaling at **1.4×** on text inside fixed containers (calendar
  cells, date boxes) so accessibility scaling never clips.

---

## 4. Spacing & radius tokens

```
spacing: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
radius:  xs 8 · sm 10 · md 14 · lg 20 · xl 26 · round 9999
```

Usage map:

| Radius | Where |
|--------|-------|
| 2 | Squircle dots/ticks (§6.1) |
| 8 (`xs`) | Small inline badges (modal date badge) |
| 14 (`md`) | Inputs, detail cards, info rows, icon buttons (square type), day cells, date boxes, notice bars |
| 18 | FAB |
| 20 (`lg`) | Feature cards (prices, horoscope, event list rows, error cards) |
| 28 | Bottom sheets & bottom modals (top corners only) |
| `round` | All text buttons (pills), chips, circular icon buttons |

Screen padding is 16 (`md`); grids/rows gap at 8–12; sections separate by 32
(`xl`); related sub-elements by 4–8.

---

## 5. Surfaces, borders, elevation

### 5.1 Surface hierarchy

`background` (paper) → `card` (raised, hairline-bordered) → `surface` (inset
neutral fill) → `*Soft` (inset tinted fill). Depth comes from these tonal steps,
not shadows.

### 5.2 Borders

- Hairlines only: **1px `border`** on cards, event rows, tab bar top, weekday
  header underline, sheet header divider.
- **1.5px** on inputs (focus swaps the border to `accent` and the fill from
  `surface` to `card`) and on outline buttons.
- Tinted (soft-filled) containers get **no border at all**.

### 5.3 Shadows — rare and soft

Only two elements cast shadows:

- **FAB:** offset (0, 3), opacity 0.25, radius 6, elevation 5.
- **Bottom sheet:** offset (0, −4), opacity 0.15, radius 12, elevation 10.

Everything else is flat.

---

## 6. Signature motifs

### 6.1 The squircle dot

The recurring mark of the language is a tiny **rounded square** (never a circle):

- Brand/section tick: **8×8, radius 2**
- Event indicator in list rows: 8×8, radius 2 (accent = API/holiday events,
  teal = user events)
- Event dot inside a calendar cell: 5×5, radius 1.5

### 6.2 Dual-calendar day cell

Each grid cell is square (aspect 1), radius 14, and stacks: primary date numeral
(Inter 500, 16) → optional 5×5 event dot → secondary calendar's numeral
(caption 9, `textSecondary`). Whichever calendar mode is active supplies the big
number; the other system rides along small. States:

- **Holiday / Saturday:** numeral in `accent`.
- **Today:** a 2px **marigold ring** — always visible, even when selected.
- **Selected:** the cell fills with `accent` (spring-animated, §8) and all cell
  text flips to `onAccent`; the event dot flips too.
- Sunday–Friday weekday headers are `textSecondary`; **Sat** is `accent`.

### 6.3 The date box

Anywhere a date anchors a row (event lists, sheet header), it appears as a
~48–56px `radius.md` box: `surface` or `accentSoft` fill, a Fraunces numeral
(20–26), and a 9px uppercase month/context caption beneath.

---

## 7. Component recipes

**Text button (pill).** Border-radius `round`; padding 13 vertical / 22
horizontal; label = uppercase Inter 600 at 12.5, tracking 1.2.
Variants: *primary* — `accent` fill, `onAccent` text; *secondary* — `surface`
fill + 1px `border`; *outline* — transparent + 1.5px `border`, `text`-colored
label. Pressed: opacity 0.85 + scale 0.98. Disabled: opacity 0.45.

**Icon button.** 42×42, 1px `border`, `card` fill, 22px outline icon in `text`.
Round (`radius.round`) for prev/next month arrows; square-ish (`radius.md`) for
header toggles (theme, BS/AD). Always `hitSlop` ~10.

**FAB.** 56×56, radius 18 (soft square, not a circle), `accent` fill, 30px "+"
in `onAccent`, bottom-right, shadow per §5.3.

**Text input.** Height 50, `radius.md`, 1.5px `border`, `surface` fill, Inter
400/16, placeholder in `textSecondary`, selection/caret in `accent`. Focus:
border → `accent`, fill → `card`. Label above: uppercase caption with 8 gap.
Error: border and helper caption in `accent`.

**Chip.** Pill, `surface` fill, ~12px padding all round (≈40pt target), Inter
11 label. Selected: fill with the section's semantic hue, label flips to `card`.
Chips live in wrapping grids with 8 gap, min-width ~22% for four-across.

**Segmented mode selector.** Two equal-width pills, 8 gap; inactive `surface`,
active `accent` with `onAccent` uppercase label.

**Dropdown trigger.** `surface` fill, `radius.md`, value in body 14, trailing
chevron (up/down) in the section's semantic hue; expands into a chip grid rather
than a floating menu.

**Card / list row.** `card` fill, 1px `border`, `radius.lg`, padding 12–16,
horizontal layout with 10–14 gap: [date box or dot] + content + optional
trailing dot. A row representing *today* swaps to `accentSoft` fill
(border matched) with its date box inverted to `card` + `accent` numeral.

**Info card (label/value row).** Soft-tinted fill, `radius.md`, padding 13–14,
space-between: 13px/600 label and 16px/700 value, both in the saturated hue.

**Detail card (stat tile).** Two-column grid (width 48%, gap 8), `surface` or
soft fill, `radius.md`, padding 13: 11px/600 label in the semantic hue,
14px/600 value in `text`, optional 10px caption ("Until 14:02") in
`textSecondary`.

**Bottom sheet.** Anchored, 85% of screen height, top radius 28, `card` fill,
shadow §5.3. A 90px "peek" stays visible when collapsed. Drag handle: 48×5,
radius 3, `border` color, centered. Header: date box + Fraunces date + secondary
metadata lines, divided from content by a 1px `border` line. Draggable and
tappable; snaps open/closed (§8).

**Modal (form).** Slides from the bottom over the warm scrim; `card` fill, top
radius 28, 1px border, padding 24 (40 bottom). Header row: `h2` title +
`accentSoft` date badge (radius 8). Actions: two equal pills — outline CANCEL,
primary SAVE.

**Tab bar.** `card` fill, 1px top `border`, height 62 + bottom safe inset,
26px icons, Inter 600/11 labels (tracking 0.4). Active = `accent`, inactive =
`textSecondary`. Tab presses fire light haptics.

**Notice bar.** Inline, non-blocking degradation notice: `accentSoft` fill,
`radius.md`, 10/14 padding, sentence-case caption in `accent`, tappable to
retry.

**Error card.** Centered `accentSoft` (or `surface`) card, `radius.lg`, padding
20–24: `h3` problem statement, caption guidance, then a primary `RETRY` pill.
Content areas degrade in place — the page chrome (header, grid) never blanks.

---

## 8. Motion

Motion is quick, springy, and purposeful — nothing decorative.

| Interaction | Spec |
|-------------|------|
| Day selection fill | Spring: damping 15, stiffness 150 — scale+fade the accent fill in/out |
| Month change | FadeOut 300ms → FadeIn 300ms on the whole grid, with layout transition |
| Selected-day details | FadeIn 400ms with 100ms delay (arrives just after the grid settles) |
| Bottom sheet snap | 300ms timing, ease-out cubic; drag follows the finger, release snaps to nearer position, a flick > 500 px/s velocity wins over distance |
| Converter result | ZoomIn 200ms |
| Button press | Opacity → 0.85, scale → 0.98 (instant) |
| Modal | System slide-up |
| Month navigation | Horizontal swipe (≥50px) pages prev/next |
| Tab press | Light impact haptic |

Loading is a plain `ActivityIndicator` tinted with the owning section's hue;
pull-to-refresh spinners are `accent`.

---

## 9. Iconography

- **Ionicons, outline style** (`moon-outline`, `sunny-outline`, `chevron-*`,
  `swap-horizontal`, `add`): 22px inside 42px buttons, 16px inline chevrons,
  30px in the FAB.
- Tab icons are custom duotone SVGs at 26px, tinted via the active/inactive
  colors.
- Icons are always monochrome, tinted with `text`, `textSecondary`, or the
  contextual semantic hue — never multicolored.

---

## 10. Theming behavior

- Both themes are complete first-class palettes; users can follow the system or
  toggle in-app (the toggle is an icon button in the screen header, not buried
  in settings).
- Navigation chrome (headers, status bar, screen backgrounds, tab bar) must be
  themed from the same tokens — no default-blue nav artifacts.
- Status bar: light content on dark theme, dark content on light.
- Hold the splash screen until the persisted theme/mode hydrates, so users never
  see a light/BS flash before their saved dark/AD preference applies (with a
  ~2s safety timeout).

---

## 11. Accessibility checklist

- Every pressable: `accessibilityRole="button"` + a descriptive
  `accessibilityLabel`; stateful controls also set `accessibilityState`
  (`selected` / `expanded` / `disabled`).
- Calendar cells compose their label from date, "today", holiday name, and
  "has events".
- Touch targets ≥ ~40pt (pills pad to it; small icon buttons add `hitSlop` 10).
- `textSecondary` ≥ 4.5:1 on `background` (§2.4); `onAccent` on `accent`
  likewise.
- Font scaling supported but capped at 1.4× inside fixed-size containers.
- Color is never the sole signal: holidays are red *and* named in the detail
  view; today gets a ring *and* a "Today" text tag in lists.

---

## 12. Porting quick-start (CSS custom properties)

```css
:root {
  --background: #FAF5EC; --card: #FFFFFF; --surface: #F1E8DA;
  --text: #241C14; --text-secondary: #6E624F; --border: #E7DCC9;
  --accent: #D93822; --accent-soft: #FAE5DE; --on-accent: #FFF8EF;
  --marigold: #B97C0A; --marigold-soft: #F7ECD2;
  --teal: #0F766E; --teal-soft: #DCEEE8;
  --iris: #5356C5; --iris-soft: #E8E8F8;
  --scrim: rgba(23, 14, 8, 0.6);
  --font-display: 'Fraunces', Georgia, serif;
  --font-ui: 'Inter', system-ui, sans-serif;
  --r-xs: 8px; --r-sm: 10px; --r-md: 14px; --r-lg: 20px; --r-xl: 26px;
  --r-sheet: 28px; --r-pill: 9999px; --r-dot: 2px;
  --s-xs: 4px; --s-sm: 8px; --s-md: 16px; --s-lg: 24px; --s-xl: 32px; --s-xxl: 48px;
}
[data-theme="dark"] {
  --background: #171210; --card: #211B16; --surface: #2C241D;
  --text: #F5EDE1; --text-secondary: #A2937F; --border: #3B3128;
  --accent: #FF6B4F; --accent-soft: #3D2019; --on-accent: #26110B;
  --marigold: #F0B64A; --marigold-soft: #3A2D15;
  --teal: #4FC7B4; --teal-soft: #14302A;
  --iris: #9B9DF0; --iris-soft: #282A4A;
}
```

### Do / Don't

**Do**
- Open every screen with the tick + uppercase kicker + Fraunces title.
- Give each feature one semantic hue and use its soft/saturated pair everywhere
  that feature surfaces.
- Use pills for text actions, squircle dots for indicators, tonal fills for
  emphasis, hairlines for structure.
- Keep both themes warm; brighten hues for dark mode instead of desaturating.

**Don't**
- Introduce a fifth hue, or reuse a hue outside its domain.
- Use pure black, cool grays, or neutral scrims.
- Outline a tinted container, or shadow anything besides the FAB and sheet.
- Set text in the soft tones, put saturated-on-saturated color, or fake bold
  weights.
- Replace inline, retryable error states with blocking alerts or blank screens.

---

*Appendix — known off-palette surfaces in the current app (not part of the
language, pending alignment): the splash screen background is `#000000`. The
Android home-screen widgets were rebuilt in this language (warm `card` surfaces,
semantic hues, Fraunces heroes, day/night token pairs in
`android/app/src/main/res/values{,-night}/widget_colors.xml`).*
