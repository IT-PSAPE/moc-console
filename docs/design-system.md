# MOC Console design system — density and spacing rules

This is the single rule set for how every component, overlay and page in MOC
Console is sized and spaced. It follows the Untitled UI React library
(https://www.untitledui.com/react/components, source at
github.com/untitleduico/react) at its **"sm" density**, translated onto the
`@moc/ui` tokens in `packages/ui/src/index.css`. When a component here and
Untitled UI disagree, this document wins; when this document is silent, copy
Untitled UI's `sm` size.

Design intent in one line: **slim, quiet, one height for every control, one
radius per role, 4px spacing grid, nothing bigger than it needs to be.**

## 1. Responsive vocabulary

The custom variants are *width tiers*, not device orientation:

| Variant      | Width       | Meaning                                  |
| ------------ | ----------- | ---------------------------------------- |
| (none)       | any         | Desktop values. Write these first.       |
| `tablet:`    | `< 62rem`   | Narrow desktop / tablet.                 |
| `landscape:` | `< 48rem`   | **Phone.** Controls grow to touch size.  |
| `portrait:`  | `< 30rem`   | Small phone. Stack columns.              |

Rule: desktop is the default; add `landscape:` only to raise touch targets
(controls to 44px), stack footers, or go full width. Never change type size or
radius per tier.

## 2. Spacing grid

Everything sits on a 4px grid (`--spacing: 0.25rem`). Allowed step values:
`0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12`. Do not use `3.5`, `7`, `9`,
`11` or arbitrary pixel values for padding, gaps or margins.

| Token / class                           | Value | Use                                             |
| --------------------------------------- | ----- | ----------------------------------------------- |
| `gap-1` / `gap-1.5`                     | 4/6   | Icon ↔ label inside a control; badge internals  |
| `gap-2`                                 | 8     | Between sibling controls; between avatar + text |
| `gap-3`                                 | 12    | Between a section heading and its body          |
| `gap-4`                                 | 16    | Between form fields; card padding               |
| `gap-6`                                 | 24    | Between page sections                           |
| `px-page-gutter` (24 desktop, 12 phone) | –     | Page horizontal gutter                          |
| `pt-page-top` (24)                      | –     | Page top padding                                |

Named control heights (tokens, so `h-control`, `min-h-control`, `size-control` work):

| Token                   | Px | Use                                                        |
| ----------------------- | -- | ---------------------------------------------------------- |
| `--spacing-control-sm`  | 32 | Compact controls inside rows, cards, kanban, table cells   |
| `--spacing-control`     | 36 | **Default** button, input, select, tab, nav item, menu item |
| `--spacing-control-lg`  | 44 | Phone touch target: `landscape:h-control-lg`               |

Every interactive control is **exactly** one of these heights. Use `h-control`
(fixed), not `min-h` + padding, so borders never change the height.

## 3. Radius

| Role                                                   | Class         | Px |
| ------------------------------------------------------ | ------------- | -- |
| Controls: button, input, select, textarea, tab, nav item, segmented container, toggle thumb area | `rounded-lg`  | 8  |
| Nested item inside a control container: menu item, select option, segmented item | `rounded-md`  | 6  |
| Badge, tag, kbd, calendar event chip                   | `rounded-md`  | 6  |
| Checkbox                                               | `rounded`     | 4  |
| Card, table card, grouped list, kanban card            | `rounded-xl`  | 12 |
| Modal panel, drawer panel, toast                       | `rounded-xl`  | 12 |
| Dropdown / popover / select popup                      | `rounded-lg`  | 8  |
| Avatar                                                 | square sizes keep `rounded-lg`; `2xs`/`2xl` keep `rounded-full` |
| Pill (toggle track, status dot, pill badge)            | `rounded-full`| –  |

## 4. Borders and shadows

Two border tokens, two jobs:

- `border-primary` (#CBCBCB) — **control edges**: input, select, textarea,
  checkbox, secondary button, segmented item when pressed.
- `border-secondary` (#E8E8E8) — **structure**: card, table, divider, overlay
  header/footer rule, popover edge, sidebar edge.

Shadows (Tailwind defaults):

- `shadow-xs` — controls (input, select, secondary button, checkbox), cards,
  kanban cards.
- `shadow-lg` — dropdowns, popovers, select popups.
- `shadow-xl` — modal and drawer panels.
- Nothing else carries a shadow. No `shadow-sm`/`shadow-md`.

Dividers that can be dragged (sidebar edge, list/detail split) are the shared
`ResizeHandle`: always a 1px `border-secondary` line that turns `border-brand`
on hover, focus and drag, with an invisible 12px pointer target. It is the
*only* divider between the two panes (no extra `border-l`/`border-r`), and the
chosen width/ratio is remembered in localStorage.

Focus: buttons/links/tabs use `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand`.
Text controls use `focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/20`.

## 5. Typography

Font stays DM Sans. The role classes (`title-*`, `label-*`, `paragraph-*`) are
the only way to set type. Line heights now follow Untitled UI
(xs 12/16, sm 14/20, md 16/24, lg 18/28, h6 20/28, h5 24/32); labels have no
letter-spacing.

| Role                                        | Class                                   | Spec            |
| ------------------------------------------- | --------------------------------------- | --------------- |
| Page title (`Page.Title`, detail title)     | `title-h6`                              | 20 / 600 / 28   |
| Auth / public hero title                    | `title-h5`                              | 24 / 600 / 32   |
| Page-level section title (Settings "General", Members "Directory") | `Label.md`           | 16 / 600 / 24   |
| Section inside a card, drawer, modal, detail page ("Assignees") | `Label.sm` `text-primary` | 14 / 600 / 20 |
| Overlay title (modal / drawer header)       | `Label.md`                              | 16 / 600        |
| Row title (list row, kanban card, table name cell) | `Label.sm`                       | 14 / 600        |
| Button label, tab, nav item, menu item      | `Label.sm` (buttons inherit colour)     | 14 / 600        |
| Form label                                  | `Label.sm font-medium text-secondary`   | 14 / 500        |
| Body / description / row subtitle           | `Paragraph.sm` (`text-tertiary` when secondary) | 14 / 400 |
| Hint, meta, timestamp, table header, group label | `Paragraph.xs text-tertiary` or `Label.xs text-quaternary` | 12 |
| Badge text                                  | `text-xs font-medium` (inside Badge)    | 12 / 500        |
| Body copy on public/legal pages only        | `Paragraph.md`                          | 16 / 400 / 24   |

Never use `title-h1`–`h4`, `Label.lg/bg`, `Paragraph.lg/bg` inside the app
shell. Never use raw `text-base`, `text-lg`, `text-xl`, `font-bold`.

Colour roles: `text-primary` titles and values, `text-secondary` labels and
button text, `text-tertiary` descriptions/meta, `text-quaternary` placeholders,
disabled, table headers, icons in inputs and menus.

## 6. Icons

- `size-4` (16px) everywhere inside controls, badges, menus, meta rows, alerts,
  row leading icons.
- `size-5` (20px) only in: navigation rail/sidebar items, empty-state featured
  icon, toast icon.
- Icon colour inside controls and menus: `text-quaternary` (or inherit on
  primary buttons). Lucide default stroke.

## 7. Components (atoms)

### Button (`controls/button.tsx`)
- Base: `inline-flex items-center justify-center gap-1.5 rounded-lg h-control px-3 landscape:h-control-lg Label.sm whitespace-nowrap shrink-0 transition-colors`.
- `size="sm"`: `h-control-sm px-2.5`. Icon-only: `size-control` / `size-control-sm` / `landscape:size-control-lg`, `px-0`.
- Variants (Untitled `sm`):
  - `primary`: `bg-brand_solid text-on-brand hover:bg-brand_solid/90`.
  - `secondary`: `bg-primary text-secondary border border-primary shadow-xs hover:bg-secondary`.
  - `ghost` (= Untitled tertiary): `text-tertiary hover:bg-secondary hover:text-secondary`.
  - `danger`: `bg-error_solid text-on-brand hover:bg-error_solid/90`.
  - `danger-secondary`: `bg-primary text-error border border-primary shadow-xs hover:bg-error hover:border-border-error`.
  - `success`: `bg-success text-success hover:bg-success/80`.
  - `link`: `h-auto px-0 gap-1 text-brand hover:underline` (inline text actions).
- Disabled: `disabled:opacity-50 disabled:cursor-not-allowed` on all variants (no colour swaps).
- Button icon slot: `*:size-4 shrink-0`.

### Input / TextArea / Select trigger (`form/*`)
- `h-control landscape:h-control-lg px-3 rounded-lg bg-primary border border-primary shadow-xs text-primary paragraph-sm placeholder:text-quaternary gap-2`.
- Leading icon `size-4 text-quaternary`. Trailing chevron (select) `size-4 text-quaternary`.
- `style="ghost"` (detail-page meta fields, inline edits): `bg-transparent border-transparent shadow-none hover:bg-secondary focus-within:bg-primary focus-within:border-brand`. Same height.
- Textarea: `px-3 py-2 min-h-[4.5rem]` (3 rows), auto-grow stays.
- Disabled: `bg-tertiary text-quaternary cursor-not-allowed`.
- Invalid: `border-error focus-within:ring-border-error/20`.
- Field wrapper (`FormField`): `flex flex-col gap-1.5`; label above; hint/error below as `Paragraph.xs text-tertiary` / `text-error`.

### Select popup / Dropdown menu / Combobox list
- Popup: `min-w-[var(--anchor-width)] rounded-lg border border-secondary bg-primary shadow-lg p-1`.
- Item: `h-control landscape:h-control-lg px-2.5 rounded-md gap-2 Label.sm font-medium text-secondary` → highlighted `bg-secondary text-primary`. Selected indicator: trailing `Check` icon `size-4 text-brand` (no radio dot).
- Item description: `Paragraph.xs text-tertiary`.
- Separator: `my-1 -mx-1 h-px bg-border-secondary`.
- Destructive item: `text-error` text + icon.

### Checkbox / Radio
- Box `size-4 rounded border border-primary bg-primary shadow-xs`; checked `bg-brand_solid border-brand_solid text-on-brand`, icon `size-3`.
- Radio same with `rounded-full`, dot `size-1.5`.
- Label `Label.sm font-medium text-secondary`, hint `Paragraph.xs text-tertiary`, `gap-2`, row `min-h-control-sm` (phone `min-h-control-lg`).

### Toggle
- `sm`: track `h-4 w-7` thumb `size-3`; `md` (default): track `h-5 w-9` thumb `size-4`. Off track `bg-quaternary`, on `bg-brand_solid`. Label `Label.sm font-medium text-secondary gap-2`.

### Badge
- `inline-flex items-center gap-1 h-[22px] px-1.5 rounded-md border text-xs font-medium leading-4 whitespace-nowrap`.
- Filled colours: `bg-{tone} text-{tone} border-{tone}/15` using existing tone tokens (gray, green/success, red/error, blue, yellow, purple, orange/warning). Outline: `bg-primary border-secondary text-tertiary`.
- Icon slot `*:size-3.5`. Optional leading dot `size-1.5 rounded-full bg-current`.
- Badge is the **only** status/tag chip. Kbd/serial monospaced chips use the same metrics with `font-mono`.

### Avatar
- Default in rows: `sm` (32). `md` (40) only in detail headers / account menu. `xs` (24) in dense meta, `2xs` (20) in avatar groups.

### SegmentedControl (view switcher)
- Container `inline-flex h-control p-0.5 gap-0.5 rounded-lg bg-secondary`; item `h-full px-3 rounded-md Label.sm text-tertiary hover:text-primary` pressed `bg-primary text-primary shadow-xs`. Icon `size-4`.
- This is the only control for list/kanban/calendar and scope switching in page toolbars.

### Tabs
- `default` (underline): list `flex gap-4 border-b border-secondary`; tab `h-control px-1 -mb-px border-b-2 border-transparent Label.sm text-tertiary hover:text-primary data-[active]:border-brand data-[active]:text-primary`.
- `pill` (Untitled button-gray): tab `h-control px-3 rounded-lg Label.sm text-tertiary hover:bg-secondary data-[active]:bg-secondary data-[active]:text-primary`.
- Tabs are for content sections (filter drawer, settings, detail). Not for view switching in page toolbars.

## 8. Composites

### Card / GroupedList / DividedList
- Root `rounded-xl border border-secondary bg-primary shadow-xs overflow-hidden`.
- `Card.Header`: `flex items-center gap-2 min-h-12 px-4 py-3 border-b border-secondary`; title `Label.sm`, description `Paragraph.xs text-tertiary`, actions right with `size="sm"` controls.
- Rows: `px-4 py-3 divide-y divide-border-secondary` (`border-t` on siblings). No vertical borders anywhere.
- Group label above a card (status group "Not Started"): `flex items-center gap-2 px-1 pb-2 Label.xs text-quaternary` + status dot `size-2`.

### ListItemCard (list rows)
- Root `flex items-center gap-3 px-4 py-3 min-h-14` (56px for two lines).
- Leading: avatar `sm` or icon tile `size-8 rounded-lg bg-secondary text-tertiary *:size-4`.
- Content: `Title` `Label.sm truncate`, `Subtitle` `Paragraph.sm text-tertiary truncate`. Two lines maximum.
- Meta items (`Paragraph.xs text-tertiary`, icon `size-3.5`, `gap-1`) live in `Trailing` on desktop (`flex items-center gap-3`), and wrap under the title only on phones (`landscape:`).
- Trailing controls use `size="sm"` (32px). Row hover `hover:bg-secondary` when clickable.

### Table
- Wrap in Card. `thead` `h-9 bg-secondary`; `th` `px-4 Label.xs text-quaternary text-left font-semibold whitespace-nowrap`.
- `td` `px-4 py-3 Paragraph.sm text-tertiary align-middle`; first/name column `text-primary Label.sm`.
- Row `border-b border-secondary last:border-b-0 hover:bg-secondary`. **No `border-r` cell borders.**

### Kanban
- Column header `flex items-center gap-2 px-1 pb-2 Label.xs text-quaternary` with count badge.
- Column body `flex flex-col gap-2 rounded-xl bg-secondary p-2`.
- Card `rounded-lg border border-secondary bg-primary shadow-xs p-3 flex flex-col gap-1.5`; title `Label.sm`, meta `Paragraph.xs text-tertiary`.

### SettingsRow
- Inside a Card. `grid grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] items-center gap-6 px-4 py-3 portrait:grid-cols-1 portrait:gap-2`.
- Label `Label.sm text-primary`, description `Paragraph.xs text-tertiary`. Control column `flex justify-end` with `max-w-sm` controls.

### MetaRow (detail label/value)
- `grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3 min-h-control`; label `flex items-center gap-2 Paragraph.xs text-tertiary` with icon `size-4`; value `Paragraph.sm text-primary` or a `style="ghost"` control filling the column.

### EmptyState
- `flex flex-col items-center text-center gap-2 py-12 max-w-sm mx-auto`.
- Featured icon tile `size-10 rounded-lg border border-secondary bg-primary shadow-xs text-tertiary *:size-5 mb-2`.
- Title `Label.sm text-primary`; description `Paragraph.sm text-tertiary`; actions `mt-4 flex gap-2`, buttons `secondary` unless it is the page's single primary action.

### Alert / RetryAlert / Toast
- `flex items-start gap-3 rounded-lg border p-3`; icon `size-4 mt-0.5`; title `Label.sm`, description `Paragraph.sm` (`opacity-80`); action button `size="sm"`; dismiss icon button `size="sm" variant="ghost"`.
- Toast: `w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl shadow-xl border-secondary bg-primary p-3`.

## 9. Overlays

### Modal
- Backdrop `bg-overlay/50 backdrop-blur-[2px]`.
- Panel `w-full max-w-md rounded-xl border border-secondary bg-primary shadow-xl` (`max-w-lg` for forms, `max-w-2xl` for editors; pick via className). Phone: bottom sheet, `rounded-t-xl`.
- `Modal.Header`: `flex items-center gap-3 min-h-14 px-5 py-3 border-b border-secondary`; title `Label.md text-primary` (+ optional `Paragraph.xs text-tertiary` under it); close `Button.Icon size="sm" variant="ghost"` pinned right.
- `Modal.Content`: `px-5 py-4 flex flex-col gap-4`.
- `Modal.Footer`: `flex items-center justify-end gap-2 px-5 py-3 border-t border-secondary landscape:flex-col-reverse landscape:*:w-full`. Primary action last (right-most). Cancel is `secondary`.
- Confirmation dialogs use the same metrics; destructive confirm is `danger`.

### Drawer
- Panel `max-w-md` (filters, detail peeks) or `max-w-xl` (editors) with 8px inset, `rounded-xl border border-secondary shadow-xl`.
- Header/Content/Footer paddings identical to Modal (`px-5`). Header `min-h-14`.
- Filter drawers: group heading `Label.xs text-quaternary pb-2`; option grid `grid-cols-2 gap-x-4 gap-y-1`; checkbox rows `min-h-control-sm`.

### Dropdown / Popover
- See §7 item spec. Trigger is a `Button`/`Button.Icon` (`variant="secondary"` or `"ghost"`), never a bare div.

## 10. Pages

### Page header (`Page.Header`)
- `flex flex-wrap items-center gap-3 pt-page-top pb-4 px-page-gutter min-h-control`.
- Left: `Page.Title` (`title-h6`) + optional `Page.Description` (`Paragraph.sm text-tertiary`) stacked with `gap-1`.
- Right (`Page.Actions`/`Page.Controls`): search `Input` (`w-64 max-w-full`), filter `Button variant="secondary"`, primary action `Button` — all `h-control`, `gap-2`.
- `Page.Toolbar`: `flex items-center gap-2 pb-4` holding the `SegmentedControl` and secondary scope controls.
- Content starts immediately below; no extra top margin.

### Collection pages (Requests, Equipment, Bookings, Venues, Streams, Checklists, Members, Messages)
- Grouped list: group label (§8) → Card with `ListItemCard` rows → `gap-6` to the next group.
- Row height target 56px; never three text lines on desktop.
- Everything in the header/toolbar is 36px tall and aligned on one baseline.

### Detail pages (`DetailPage`)
- Width `standard` (64rem). Back link row `pt-3 px-page-gutter` with `Button variant="ghost" size="sm"`.
- Header `px-page-gutter pt-2 pb-4`: title `title-h6` (inline editable), subtitle/meta `Paragraph.sm text-tertiary`.
- Sections `px-page-gutter py-5` separated by `Divider` with no extra margin. Section title `Label.sm text-primary` with `pb-3`; meta rows use `MetaRow`.
- Actions live in the top bar / header right (`Page.Actions`) as `secondary` and `ghost` icon buttons, overflow in a Dropdown.

### Settings-style pages (Settings, Telegram, Members)
- `Page.Content width="standard"`; sections stacked with `gap-8`; each section: `Label.md` title + `Paragraph.sm text-tertiary` description, `gap-1`, then `pt-3` → Card of `SettingsRow`s or list rows. Section-level save button right-aligned under the card with `pt-3`.

### Auth and public pages
- Card `max-w-sm w-full rounded-xl border border-secondary bg-primary shadow-xs p-6 flex flex-col gap-5`; title `title-h5`; fields `gap-4`; submit full width `h-control`.
- Public documents: `max-w-content-sm`, `title-h5` page title, `Label.md` section titles, `Paragraph.md` body.

### Navigation
- Rail: items `size-control rounded-lg` icon `size-5`, active `bg-brand text-brand`, `gap-1` between items, `p-2` rail padding.
- Secondary sidebar: width `16rem`; header `h-14 px-3 border-b`; group title `px-3 pt-4 pb-1 Label.xs text-quaternary`; items `h-control px-3 gap-2.5 rounded-lg Label.sm text-secondary hover:bg-tertiary` active `bg-brand text-brand`; icon `size-5 text-quaternary` (inherits on active).
- Top bar: `h-header (48px) px-3 gap-2 border-b`; actions are default `h-control` (36) centred in the 48px bar.
- Side panel (`SplitPanel`): collections open their record in a right-hand detail pane rather than a new page. Header `h-14` with close/expand on the left and record actions on the right (all `size="sm"`); content `px-5 py-4 gap-4` with a title block, `MetaRow`s, then `Section.Header size="sm"` sections split by `Divider my-0`. The pane is resizable via the hairline handle and remembers its width; on phones it becomes a bottom drawer.

## 11. Anti-patterns to remove on sight

- `min-h-11` / `py-2` height-by-padding on controls → `h-control`.
- Gray-filled inputs (`bg-secondary`) → white with `border-primary`.
- `rounded-md` buttons or `rounded` cards → per §3.
- Vertical cell borders in tables.
- 40px avatars in list rows → `sm`.
- `title-h5` page titles inside the shell → `title-h6`.
- Three-line list rows on desktop.
- Pill `Tabs` used as a view switcher → `SegmentedControl`.
- Hard-coded colours (`text-neutral-500`, `bg-white`, hex) → tokens.
- Overlay footers with left-aligned or full-width desktop buttons.
- Section gaps other than 24/32px; card paddings other than 12/16px.
