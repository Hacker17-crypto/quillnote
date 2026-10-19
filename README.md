# Quillnote

Quillnote is a desktop handwriting and note-taking app for Windows and macOS.

## Features

- **Library**: notebooks, folders, covers and paper templates; favorites, trash, sort, select, import and export,
  search across titles and the text inside documents; marketplace of free planners, templates, covers and sticker packs.
- **Editor**: tabs, pages sidebar (grid, list, bookmarks, outline), vertical or horizontal scrolling, zoom
  (Ctrl+scroll, pinch, zoom pill), space-drag panning, page counter, undo/redo, read-only mode, autosave.
- **Writing tools**: fountain, ball and brush pens with pressure (perfect-freehand), pen settings, highlighter,
  tape, shapes (draw a rough shape or draw-and-hold), ruler, eraser (standard / precise / stroke, with
  filters), lasso (free or rectangle: move, resize, recolour, cut/copy/paste, duplicate, screenshot,
  add to Elements), text boxes with formatting, sticky notes, images (crop, rotate, opacity), stickers and
  animated stickers, Elements library, laser pointer, alignment guides, scribble-to-erase.
- **Documents**: notebooks, quick notes, infinite whiteboards, rich text documents, imported PDFs (rendered with
  pdf.js, searchable, clickable links in read-only mode) and images.
- **Pages**: add before/after/last from templates, images or PDF pages; duplicate, rotate, bookmark, outline,
  change template, clear specific items, delete.
- **Export**: PDF (annotations stamped onto the original PDF pages), PNG, Markdown, `.quill`, and print.
- **AI** (through your local Claude Code CLI — no API key in the app): chat about a page, document or
  selection; handwriting to text; summaries; spelling check; maths help; flashcards with a study mode;
  diagrams created as SVG; smart search; title suggestions.
- **Audio**: Record & Summarize with ink playback in sync with the recording. Transcription runs on-device
  with Whisper (transformers.js); the model is downloaded once on first use, so that needs an internet connection.
- **Settings**: theme, default paper and cover, stylus-only drawing, pen gestures, library location,
  automatic `.quill` backups, Claude Code path.

## Downloads

Use the [GitHub releases page](https://github.com/Hacker17-crypto/quillnote/releases).
Windows downloads end in `.exe`; Mac downloads end in `arm64.dmg` for Apple Silicon
or `x64.dmg` for Intel. These preview builds are not developer-signed or notarized.

## Development

Install Node.js 24, then run these commands from the folder containing this file:

```sh
npm ci
npm run dev
```

Opening `src/renderer/index.html` directly in a browser does not run the desktop app.
It requires Electron's preload bridge and the compiled application.

## Checks and packaging

```sh
npm run build
npm run test:persistence
npm run dist:win
# On a Mac:
npm run dist:mac
```

Installers are written to `release/`. Packaging restores the original PNG from
`build/icon.png.base64` and verifies its SHA-256 checksum. The original vector
artwork is also preserved in `build/icon.svg`.
The restart test uses an isolated temporary library, checks saved content, and
removes its own test data. Set `QN_EXECUTABLE` to test a packaged executable.

The GitHub workflow installs locked dependencies with `npm ci`, builds Windows
and both Mac architectures, checks the Windows packaged app, and only publishes
when all three installers exist. Existing published releases are preserved.

## Your data

The default library is `~/Quillnote/`, separate from this source folder.
The index is `library.json`; each document lives at
`documents/<id>/doc.json` with an `assets/` directory beside it.
Settings are stored in Electron's user-data directory.
Keep a separate backup of your notebooks; the source repository is not a backup
of your personal library. AI features need Claude Code installed and signed in (`claude` on your PATH,
or set its location in Settings › Preferences).

## License

UNLICENSED. Third-party packages retain their respective licenses.
