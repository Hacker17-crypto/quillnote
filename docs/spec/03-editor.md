# 03 — Editor

Reference: 06-editor.png, 07-state.png, 10–33, plus the user's pen-settings screenshot
(same as 07-state.png).

## Chrome
- **Tab strip** 38px `--editor-tabbar`. Home chip, then document tabs (max 260px, active tab
  `--editor-toolbar` fill, rounded top, title + `ChevronDown` + `X`). `+` at far right opens the
  library picker. Multiple documents open as tabs; drag to reorder; middle-click closes.
- **Tab ▾ menu** (33): document title header, Sync status → "Saved" (green), Saved for offline
  → "Ready", divider, Rename, Show in folder, Export.
- **Toolbar** 56px `--editor-toolbar`, icons 22px white, 44px hit area, selected tool =
  `--tool-selected-bg` rounded-10 chip with dark icon.
  Left: Pages sidebar · Search · AI · Read-only/Outline toggle.
  Center: Lasso | Pen · Eraser · Text · Stickers · Image · Elements · Sticky note · Laser |
  Audio ▾. (Pen/eraser/highlighter etc. share one "Pen" button; sub-types live in the sub-bar.)
  Right: Add page · Share · More.
- **Undo/Redo** floating pill top-left of canvas (rounded 14, `--content-bg` border).
- **Page counter** bottom-left pill "2 of 2". **Zoom** pill bottom-right: `−` · "85%" · `+`.
- Canvas surround `--content-bg`; pages centered, 12px gap between pages, vertical scroll
  (horizontal page-flip option in More → Scrolling Direction). Pinch / Ctrl+wheel zoom 25–400%.
- **Read-only mode** (Outline button): toolbar collapses to left icons + "Read Only" label;
  no editing; links in PDFs clickable.

## Pen sub-toolbar (06-editor.png)
Floating pill `--surface-2`, radius 16, centered at top of page, 52px tall:
`Fountain/Ball/Brush pen ▾` · `Highlighter` · `Eraser-pen` (shape eraser) · `Ruler` ·
`Shape tool` | three stroke widths (thin/medium/thick lines, selected = darker chip) |
colour swatches (3 favourites; current colour has ring + `ChevronDown`) · `Add colour`.
Selected sub-type = teal chip `--subtool-selected`.

### Pen settings popover (07-state.png) — opens on second click of the selected pen
Title "Fountain Pen", live stroke preview (S-curve), 3 type tiles (Fountain Pen / Ball Pen /
Brush Pen), sliders: TIP SHARPNESS (0–100, 5 ticks), PRESSURE SENSITIVITY, STROKE
STABILIZATION (no ticks), section SETTINGS: "Draw and Hold" toggle (hold at end of stroke →
snaps to perfect line/shape), "Pen Gestures" › (scribble-to-erase, circle-to-lasso).
- Fountain: width varies with pressure + direction. Ball: uniform. Brush: strong taper.

### Highlighter
Translucent (35% alpha) flat-tip, renders *under* ink. Options: straight-line mode, colours
(yellow/green/pink/blue/orange presets), widths.

### Eraser (15-eraser.png)
Sub-bar: `Standard ▾` (Standard / Precise / Stroke eraser) · "erase only" filters toggle
(Pen, Highlighter, Shapes, Text, Images) · 3 sizes · "Auto-deselect" toggle.
First-use tip popover: "Erase only what you intend to — erase a specific content type without
affecting the rest of your page" + `Got it`.

### Ruler
Draggable/rotatable on-canvas ruler (two-finger/Alt+wheel rotate) with angle readout; strokes
near the edge snap straight.

### Shape tool
Drawn shapes auto-recognised: line, arrow, rectangle, ellipse/circle, triangle, polygon, star.
Options: stroke colour, fill colour, width, dash. Shapes stay editable (handles).

### Colour picker (swatch ▾)
Popover with tabs Presets / Custom (HSB square + hue + opacity + hex input). "Add colour"
adds to the 3–10 favourites row; right-click a swatch to remove.

## Other tools
- **Lasso** (14): free-form or rectangle (sub-bar). Selection gets dashed outline + menu:
  Cut · Copy · Duplicate · Delete · Colour · Resize · Convert handwriting to text (AI) ·
  Take screenshot · Add to Elements · Ask AI about selection. Drag to move, handles to scale/rotate.
- **Text** (16): click to create text box; floating format bar: font (Figtree, Serif, Mono,
  Handwriting-style open font e.g. "Caveat"), size, bold/italic/underline, colour, align,
  background, list.
- **Stickers** (17): popover with tabs `Stickers` | `GIFs` (GIFs = local animated packs);
  category icons row (recent clock, sticky notes, …); grid of original stickers incl.
  "Sticky Notes" paper squares. Click/drag to place.
- **Image** (18): native file picker (png, jpg, jfif, gif, webp, heic if supported, svg);
  placed image has crop, rotate, opacity, bring-forward/back.
- **Elements** (19): user library of saved lasso selections, grouped into collections;
  ships with original starter collections (arrows, dividers, banners, icons).
- **Sticky note** (20): colour bar of 9 pastel squares + more ▾; places a resizable sticky
  note with typed/handwritten content; can be collapsed to an icon.
- **Laser pointer** (21): sub-bar choose Dot / Trail; trail fades after 1s; not saved.
- **Audio ▾** (22): menu `Record & Summarize` (red mic) · `Show Recordings` · divider ·
  `Show Ruler` · divider · `Toolbar Customization`. Recording bar with timer/pause/stop;
  strokes written during recording are time-linked → playback highlights ink as audio plays.
  Transcription + summary in 04-ai.md.

## Right-side popovers
- **Add Page** (23): title "Add Page", segmented `Before | After | Last page`,
  "Recent templates" (caption: "Templates shown here inherit current page attributes whenever
  possible"), template tiles (Current template first), then rows: `More from templates…`,
  `Image`, `Import` (PDF pages).
- **Share and Export** (24): `Share…` (sub: "Export as .quill file to send") · `Export as PDF`
  (options: current page / all pages / range, include backgrounds, flatten) · `Export as
  Image` (PNG per page) · `Export as Markdown` (uses AI handwriting text) · `Print`.
- **More …** (25): header "Page N": Bookmark Page · Copy Page · Duplicate Page · Rotate Page › ·
  Add page to Outline · Change Template · Go to Page (right hint "2 of 2"); section
  "Clear or Trash Page": Delete Specific Items · Clear Page (red) · Move to Trash (red);
  section "Object Alignment": Align Objects (toggle on); section "Settings": Show resolved
  comments (toggle) · Scrolling Direction › "Vertical" · Toolbar Customization.

## Left panels (300px, slide-in)
- **Pages** (10): header icons: select-mode, Grid / List / Bookmarks / Outline tabs.
  Grid of page thumbnails with number + `…` menu; current page blue border; drag to reorder;
  `+ Add page` tile. Outline tab: editable hierarchical outline (also imports PDF outline).
- **Search** (11): header "Search" + close; search field with blue focus ring; filter
  "All Results ▾" (Handwriting / Typed text / PDF text); empty state original illustration +
  "Find everything you need" / "Search handwritten notes, typed notes, and PDF text inside
  this document." Results list with page number + snippet; hits highlighted yellow on page.
- **AI** (12): see 04-ai.md.

## Toolbar Customization
Modal listing all tools with drag handles + show/hide toggles; changes persist.

## Keyboard shortcuts (Win Ctrl / Mac Cmd)
P pen, H highlighter, E eraser, L lasso, T text, S shape, Ctrl+Z/Ctrl+Shift+Z, Ctrl+C/V/D,
Delete, Ctrl+F search, Ctrl+N new notebook, Ctrl+W close tab, Ctrl+Tab next tab, Ctrl+= / − zoom,
Space-drag pan, PgUp/PgDn pages, Ctrl+Shift+A AI panel.

## Input
Pointer Events with `pointerType`: pen gives pressure/tilt; touch = pan/zoom when
"Only draw with stylus" is on; mouse draws. Palm rejection: ignore touch while pen is active.
Render: committed strokes to an offscreen canvas per page (tile cache), live stroke on an
overlay canvas — must stay at 60 fps with 5,000+ strokes per page.

## Imported PDFs
Render with pdf.js at device pixel ratio, lazy per visible page; annotations stored as
vector objects over the page; PDF text selectable with the Text-select mode in lasso sub-bar;
hyperlinks and PDF outline supported. Export flattens ink into the original PDF (pdf-lib).
