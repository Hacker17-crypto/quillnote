# Quillnote — Product Spec (read this first)

Quillnote is a desktop handwriting/note-taking app for **Windows and macOS**. Its layout,
flows, colours, spacing and feature set follow the reference screenshots in
`C:\Users\atrey\Desktop\goodnotes\.task\screens\` (captured from a GoodNotes install).
Every "premium" feature is unlocked; there is no paywall, no "Unlock" labels, no lock icons.
All AI runs through the user's **local Claude Code CLI** (`claude`), never a cloud API key.

## Originality rules (non-negotiable)
- Name is **Quillnote** everywhere (window title, wordmark, menus, installer). Never the word "Goodnotes".
- Do **not** extract, trace or reuse any file from the GoodNotes install (icons, fonts, images,
  templates, illustrations, sounds). Screenshots are for layout/spacing/colour reference only.
- Icons: **lucide-react** (thin outline, 1.75 stroke) — closest-match mapping is in `01-design.md`.
  Where Lucide has no match, draw an original 24×24 outline SVG in the same style.
- Font: **Figtree** (OFL, `@fontsource-variable/figtree`), bundled locally.
- Empty-state illustrations, covers, paper templates, stickers, marketplace items: create
  **original** ones (SVG / generated in code). No third-party marketplace content.

## Tech stack
- Electron (latest) + **electron-vite** + React 18 + TypeScript + Zustand.
- Ink: HTML canvas, strokes smoothed with `perfect-freehand`; pressure from PointerEvents (pen/touch/mouse).
- PDF: `pdfjs-dist` to render/import, `pdf-lib` to export annotated PDFs.
- Storage: local folder `~/Quillnote/` (configurable). One folder per document:
  `doc.json` (metadata + pages + vector objects), `assets/` (images, audio, imported PDF).
  Library index in `library.json`. Autosave (debounced 500 ms). No account, no cloud.
- Search index: in-memory index rebuilt on launch from typed text, PDF text, and AI-recognised
  handwriting text cached per page (`page.ocrText`).
- Packaging: `electron-builder` → Windows NSIS `.exe`, macOS `.dmg` (universal). Scripts:
  `npm run dev`, `npm run build`, `npm run dist:win`, `npm run dist:mac`.
- Custom frameless title bar on Windows (draw min/max/close to match screenshot 03), native
  traffic lights on macOS (`titleBarStyle: 'hiddenInset'`).

## Spec files
1. `01-design.md` — tokens, colours, typography, icon map, component styles
2. `02-library.md` — home/library, sidebar, New menu, notebook creator, favourites, shared,
   marketplace, trash, settings, search, selection
3. `03-editor.md` — tabs, toolbar, every tool and popover, pages sidebar, page menus, export
4. `04-ai.md` — AI panel and every AI feature via local Claude Code
5. `05-milestones.md` — build order and acceptance checks

## Screenshot index (`.task/screens/`)
| File | Shows |
|---|---|
| 03-library.png | Library / Documents (main reference for home) |
| 04-new-menu.png | "+ New" dropdown |
| 05-new-notebook.png | New notebook dialog (cover, paper, template gallery) |
| 06-editor.png | Editor with pen tool + pen sub-toolbar |
| 07-state.png | AI panel open + Fountain pen settings popover |
| 10-sidebar.png | Page thumbnails sidebar |
| 11-search.png | In-document search panel |
| 12-ai.png | AI assistant panel |
| 14-lasso.png, 15-eraser.png, 16-text.png | Lasso / eraser sub-bar / text tool |
| 17-shapes.png | Stickers & GIFs popover (sticky notes) |
| 18-image.png | Image tool opens file picker |
| 20-sticky.png | Sticky note colour bar |
| 21-laser.png | Laser pointer tool selected |
| 22-audio.png | Audio menu (Record & Summarize, Show Recordings, Show Ruler, Toolbar Customization) |
| 23-addpage.png | Add Page popover |
| 24-share.png | Share & Export popover |
| 25-more.png | Page "…" menu |
| 33-tab-menu.png | Tab dropdown (sync status, rename) |
| 35/36/37/38 | Favorites, Shared, Marketplace (loading + loaded) |
| 39/44-settings-panel.png | Account side panel |
| 45-settings-page.png | Settings list |
| 41-select.png | Library multi-select bar |
| 43-doc-menu.png | Document context menu |

Screenshots are 2518×1614 physical px at 150% scale — divide by 1.5 for CSS px.
Reproduce at CSS px (e.g. 300 px in the image ≈ 200 CSS px).
