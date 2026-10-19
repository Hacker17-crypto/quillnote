# 02 — Library (home)

Reference: 03-library.png, 04-new-menu.png, 05-new-notebook.png, 34–45.

## Window & tab strip
- Top strip 38px CSS, `--app-titlebar` black. Left: Home tab chip (52px wide, `--sidebar-bg`,
  rounded top corners, `House` icon). Then one tab per open document (see 03-editor).
- When the library is showing, document tabs render dimmed (text `--text-2`, no fill).

## Layout
- Left sidebar 196px `--sidebar-bg`: wordmark "Quillnote" at top (y≈95px), then nav:
  Documents · Favorites · Shared · Marketplace (with sub-caption "50+ items for you" + small
  gift icon) · divider · Trash. Selected row: navy `--nav-selected-bg`, icon filled `--accent-cyan`.
- Content: title (34/700) left; right side `+ New ▾` primary pill, `Date ▾` ghost pill,
  `CircleCheck` select button. Above, far right: `Search` and `Settings` icons.
  1px divider under the title row.
- Grid of items: 115px-wide thumbnails, 28px gaps, title (2 lines, centered) with `ChevronDown`
  that opens the document menu, date caption under it. Star toggle on thumbnail top-right
  (outline → filled white when favourited). Hover = subtle `#2A2727` rounded card behind item.
  Double-click opens; single-click selects (navy highlight card as in 46-reopen.png).
- Folders show as folder thumbnails; double-click navigates in, breadcrumb replaces title.
- Drag & drop: items into folders, files from OS (PDF, images, .quill) onto grid to import.

## Sort (`Date ▾`)
Menu: Date · Name · Type, plus "Ascending/Descending"; also "Grid / List" view toggle.

## Selection mode (41-select.png)
Toolbar replaces title row: `X` close · ○ Select all · Duplicate · Move · Delete (greyed until
something is selected). Thumbnails show a round checkbox at bottom-left.

## Document menu (43-doc-menu.png)
Rename · Duplicate · Export as PDF · Move · Share… · divider · Move to Trash (red).
Add: Export as Quillnote file (.quill zip), Change cover, Add to Favorites.

## "+ New" menu (04-new-menu.png) — all unlocked, no "Unlock" labels
Notebook · Text Document `BETA` · Whiteboard `NEW` · Quick note · Image · Folder ·
divider · Import (PDF, images, .quill, .docx/.pptx via conversion to PDF if LibreOffice present,
otherwise PDF/images only) · Cloud folders (generic "Open from folder…" that links any local
synced folder such as OneDrive/Dropbox/Google Drive desktop folders) ·
footer tip: `Tip: Double-click "+ New" to create a Quick note`.
Double-clicking `+ New` creates a Quick note immediately.

## New Notebook dialog (05-new-notebook.png)
Modal 950×790 CSS, radius 18. Left pane (`--content-bg`, 230px): **Title** input
(placeholder "Untitled Notebook"), **Cover** preview + name, **Paper** preview (blue 2px
selected border) + name. Right pane (`--surface-2`): top pills — template set ▾
("Quillnote Standard"), paper colour ▾ (White / Yellow / Dark), language ▾, portrait/landscape
segmented icons. Below: collapsible sections with horizontally scrolling rows:
- **Essentials**: Blank, Dotted, Ruled Narrow, Ruled Wide, Squared
- **Writing papers**: Cornell, Legal, Single Column, Single Column Mix, Three Column, Two Column
- **Planner**: Daily, Weekly, Monthly, To-do, Habit tracker, Meeting notes
- **Music**: Staff paper, Guitar tab
- **Covers** section when the Cover preview is clicked: 20+ original covers (solid colours,
  linen texture, gradients, minimal geometric patterns — all generated in code).
Footer: `Cancel` ghost · `Create Notebook` primary. Generate every paper template
procedurally (SVG/canvas) at A4, Letter, and widescreen sizes; selected tile = 2px blue border,
label turns blue.

## Other "New" types
- **Text Document**: rich-text editor (TipTap) on a page, same toolbar shell.
- **Whiteboard**: infinite canvas, dotted background, same tools, thumbnail with whiteboard frame.
- **Quick note**: single-page notebook titled with date/time, opens instantly.
- **Image**: pick image → new notebook page sized to it.

## Favorites / Shared / Trash
- Favorites: grid of starred docs + bookmarked pages. Empty: original illustration +
  "Find things quicker with Favorites" + caption "Click ☆ to add documents or folders, or
  bookmark a page with 🔖".
- Shared: local sharing only — documents exported/received as `.quill` files and "Shared
  link" via a local LAN share (optional). Empty: "No shared documents".
- Trash: items kept 30 days; actions Restore / Delete forever / Empty Trash.

## Marketplace (37-marketplace.png) — fully local, original content
Header: title, search field "Search templates, stickers, covers…", `…` menu. Tabs:
Home · Work · Study · Life · `♡ Saved` (blue pill). Home: hero carousel, "Planners for 2027"
row, banner card, "New in" row, "Stickers" row. Cards: preview image, creator line
("Quillnote Studio"), title, tags + heart count, `Get` button (all free). Getting an item adds
it to templates/sticker library. Ship ≥ 30 original generated items (planners, covers,
sticker packs). Skeleton-loading shimmer state as in the first marketplace screenshot.

## Account panel (39-settings.png) — opens from Settings icon, slides from right, 300px
Avatar (initials, pink circle) + name + `Pro` badge · card in `--upsell-card`:
"All features unlocked" · rows: Manage Notebook Templates · Settings · Integrations
(Claude Code status) · Help · About · bottom: (no Sign Out — show "Local profile").

## Settings (45-settings-page.png) → Preferences
Back arrow + "Settings" header, rows with chevrons: Preferences, Acknowledgements (open-source
licences incl. Figtree OFL, Lucide ISC), Privacy (local-only statement).
Preferences page: Appearance (System/Light/Dark), Default template, Default paper colour,
Scrolling direction (Vertical/Horizontal), Stylus & palm rejection ("Only draw with stylus"),
Pen gestures (double-tap to switch eraser, scribble to erase, draw-and-hold for shapes),
Auto-save backups folder, Library location, Claude Code path (auto-detected), Language.

## Library search (`Search` icon)
Full-width search field replacing the title; results grouped: Documents (title matches),
Handwriting & typed text (page snippets with highlighted term + page thumbnail),
Folders. Clicking a result opens the document at that page with the hit highlighted.
