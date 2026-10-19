# 01 — Design system

Dark theme is the default and must match the screenshots. Also ship a light theme
(Settings → Preferences → Appearance: System / Light / Dark) using the same structure.

## Colour tokens (sampled from screenshots)
```css
--app-titlebar:      #000000;  /* top tab strip in library */
--sidebar-bg:        #2E2B2B;  /* library left column, home tab chip */
--content-bg:        #1E1B1B;  /* library content, editor canvas surround, menus, popovers */
--surface-2:         #2B2828;  /* pen sub-toolbar pill, dialog right pane */
--surface-3:         #2E2B2B;  /* cards inside panels */
--divider:           #302D2D;
--nav-selected-bg:   #1F2E58;  /* selected sidebar row (navy) */
--accent-cyan:       #81E3FA;  /* selected nav icon fill, folder icon */
--primary:           #0C8CF3;  /* "+ New", primary buttons, toggles, links */
--primary-hover:     #2A9BF5;
--editor-tabbar:     #20325F;  /* editor tab strip */
--editor-toolbar:    #294C7F;  /* editor toolbar + active tab */
--tool-selected-bg:  #C9D2DF;  /* selected main-toolbar tool chip (icon turns dark) */
--subtool-selected:  #2E7385;  /* teal chip for selected pen sub-type */
--slider-fill:       #86C7F9;
--paper-yellow:      #F8F7E9;  /* "Yellow Paper" */
--paper-white:       #FFFFFF;
--grid-line:         #E3E2D5;
--cover-tan:         #B09F86;  /* default "Simple" cover */
--badge-new-bg:      #B6C174;  --badge-new-fg: #1E1B1B;
--badge-beta-bg:     #CBC8DB;  --badge-beta-fg: #1E1B1B;
--danger:            #F2504B;  /* Move to Trash, Clear Page */
--success:           #3CCB7F;  /* "Synced" */
--text-1:            #FFFFFF;
--text-2:            #B7B4B4;  /* secondary labels, dates */
--text-3:            #8A8686;  /* placeholders, captions, ALL-CAPS section labels */
--ai-gradient:       linear-gradient(135deg,#7FD6F7,#5B8CFF); /* sparkle send button */
--upsell-card:       #4FC3DE;  /* account panel promo card (reuse as "Quillnote Pro – all unlocked") */
```

## Typography — Figtree
| Use | Size / weight |
|---|---|
| Sidebar wordmark "Quillnote" | 34px / 400, letter-spacing -0.5px |
| Page title ("Documents") | 34px / 700 |
| Nav items, menu items, buttons | 15px / 500 |
| Document title under thumbnail | 14px / 500, centered, 2 lines max |
| Dates / captions | 11px / 400, `--text-2` |
| ALL-CAPS section labels (TIP SHARPNESS) | 11px / 500, `--text-3`, letter-spacing 0.3px |
| AI greeting | 26px / 700, `--text-2` |

## Shape & spacing
- Radius: buttons/pills 999px; menus & popovers 12px; dialogs 18px; nav rows 8px; thumbnails 6px.
- Menus: `--content-bg`, 1px `--divider` border, shadow `0 12px 32px rgba(0,0,0,.45)`,
  row height 36px, icon 18px + 12px gap, 16px side padding, separators full-width `--divider`.
- Popovers have a small caret (8px) pointing to the trigger.
- Library sidebar width 196px CSS; editor side panels 300px CSS.
- Motion: 150ms ease-out for menus (fade + 4px slide), 200ms for panels (slide), page turn none.

## Icon map (lucide-react)
| UI element | Lucide icon |
|---|---|
| Home tab | `House` |
| Documents (nav) | `Folder` (filled cyan when selected) |
| Favorites | `BookmarkCheck` → use `Star` inside bookmark: original SVG (bookmark outline + small star) |
| Shared | `Users` |
| Marketplace | `Store` |
| Trash | `Trash2` |
| Search | `Search` |
| Settings | `Settings` |
| Select mode | `CircleCheck` |
| New: Notebook / Text doc / Whiteboard / Quick note / Image / Folder / Import | `Notebook`, `FileText`, `LayoutGrid`(dotted), `SquarePen`, `Image`, `Folder`, `Download` |
| Editor: pages sidebar | `PanelLeft` |
| AI | `Sparkles` (original: curved arrow + sparkle, see 06-editor.png) |
| Outline / read-only | `NotebookText` |
| Lasso | `LassoSelect` |
| Pen | `PenLine` |
| Eraser | `Eraser` |
| Text box | `Type` inside rounded square (original SVG) |
| Stickers | `Sticker` |
| Image | `ImagePlus` |
| Elements / shapes library | `Shapes` |
| Sticky note | `StickyNote` |
| Laser pointer | `Wand` |
| Audio | `Mic` + `ChevronDown` |
| Add page | `FilePlus2` |
| Share | `Share` |
| More | `CircleEllipsis` |
| Undo / Redo | `Undo2` / `Redo2` |
| Fountain / Ball / Brush pen | `PenTool`, `Pen`, `Brush` |
| Highlighter | `Highlighter` |
| Ruler | `Ruler` |
| Shape tool | `Shapes` |
| Add colour | dashed circle + plus (original SVG) |
| Zoom | `ZoomOut` / `ZoomIn` |

Third-party brand logos (Google Drive, OneDrive, Dropbox, Box) — use simple generic cloud icons
(`Cloud`, `HardDrive`), not their logos.

## Components to build once and reuse
`Button` (primary pill / ghost pill / icon), `Menu` + `MenuItem` (icon, label, badge, right hint,
danger), `Popover` (with caret), `Toggle` (blue, 44×24), `Slider` (ticked, blue fill, white-ringed knob),
`SegmentedControl` (Before/After/Last page), `Badge` (NEW/BETA), `Dialog`, `SidePanel`,
`Tooltip`, `EmptyState` (illustration + title + caption), `Thumbnail` (notebook cover with spine
shadow / whiteboard frame / PDF first page).

Original empty-state illustrations: draw simple line-art SVGs in plum `#5A2347` fill + pink
`#E58BC4` outline (same mood as screenshots 35/36, but your own drawings: e.g. a heart-folder
for Favorites, two linked chat bubbles for Shared, a magnifier over pages for Search).
