# 05 — Build order & acceptance

Project root: `C:\Users\atrey\Desktop\goodnotes\app\` (keep `.task/` untouched).
After each milestone: run `npm run build` (must pass, zero TS errors), launch the app,
screenshot the matching screen and save it to `.task/progress/M<n>-<screen>.png`, compare it
side-by-side with the reference screenshot, fix differences, then report.

| # | Milestone | Done when |
|---|---|---|
| M1 | Scaffold: electron-vite + React + TS, Figtree, Lucide, tokens, custom title bar, component kit (Button, Menu, Popover, Toggle, Slider, Segmented, Dialog, Badge, SidePanel) | App launches on Windows; a `/kit` dev route shows all components |
| M2 | Library: sidebar, Documents grid, New menu, notebook dialog with all procedural paper templates + covers, sort, select mode, doc menu, folders, trash, favourites, storage on disk | Matches 03/04/05/41/43; create/rename/duplicate/move/trash/restore all persist after restart |
| M3 | Editor shell: tabs, toolbar, undo/redo, page counter, zoom, scrolling, add page popover, more menu, share popover, pages sidebar | Matches 06/10/23/24/25/33 |
| M4 | Ink engine: fountain/ball/brush, highlighter, eraser (3 modes + filters), pen settings popover, colours + picker, widths, draw-and-hold shapes, shape tool, ruler | Smooth 60 fps, pressure works with a pen; matches 07 popover |
| M5 | Lasso, text boxes, images, stickers/GIFs, elements library, sticky notes, laser, read-only mode, toolbar customization | All actions in 03-editor work |
| M6 | PDF import/annotate/export, image/markdown export, print, .quill import/export, whiteboard (infinite), text document, quick note | Import a 50-page PDF, annotate, export → annotations visible in Acrobat/Preview |
| M7 | Search (in-doc + library), AI bridge + panel + all 10 AI features, audio record + local Whisper + summary + ink playback | Each AI feature demoed on a sample notebook |
| M8 | Marketplace (local, original items), favourites/shared/trash screens, account panel, settings & preferences, light theme, keyboard shortcuts, empty states | Matches 35–45 |
| M9 | Packaging: icons (original Quillnote logo: quill nib in a rounded square, cyan→blue), electron-builder Win NSIS + mac dmg config, README with run/build steps | `npm run dist:win` produces an installer that installs and runs |

Quality bar: pixel-close to screenshots at 1280×800 and 1920×1080; no console errors;
every menu item does something real (no dead buttons); no paywalls, locks or "Unlock" text.
