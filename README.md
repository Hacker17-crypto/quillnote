# Quillnote

A desktop handwriting and note-taking app for **Windows and macOS**, built with Electron, React and TypeScript.

Quillnote is a clean-room re-implementation of the layout and flows of GoodNotes — every "premium" feature is unlocked, there is no paywall, no "Unlock" labels and no lock icons. All AI features run through your **local Claude Code CLI**; no cloud API key is required and no data leaves the machine.

![Quillnote](https://img.shields.io/badge/Electron-44-47848F?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square) ![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey?style=flat-square)

## Features

- **Library** — documents grid, folders, notebooks with procedurally generated paper templates and original covers, sort, multi-select, favourites, trash, and everything persisted to disk.
- **Editor** — tabbed notebooks, custom title bar, page thumbnails sidebar, zoom, add-page popover, share/export popover and per-page menus.
- **Ink engine** — fountain, ball and brush pens with pressure support, highlighter, three eraser modes, colour picker, stroke widths, draw-and-hold shapes, ruler and laser pointer.
- **Objects** — lasso select, text boxes, images, sticky notes, an original elements library, audio recording and local transcription.
- **Documents** — PDF import/annotate/export, image and Markdown export, print, `.quill` import/export, whiteboard, text documents and quick notes.
- **Search & AI** — in-document and library search, AI panel with ten AI features, and handwriting playback of recorded audio.

## Requirements

- Node.js 20+ (24 recommended)
- The [Claude Code CLI](https://claude.com/claude-code) installed and signed in — only needed for the AI features.

## Getting started

```bash
npm install
npm run dev        # run the app in development
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Type-check main, preload and renderer projects |
| `npm run build` | Type-check and bundle to `out/` |
| `npm run start` | Preview the production build |
| `npm run dist:win` | Build the Windows NSIS installer into `release/` |
| `npm run dist:mac` | Build the macOS disk images into `release/` |

## Storage

Everything is stored locally in `~/Quillnote/` (configurable in Settings). One folder per document:

```
doc.json     metadata, pages and vector objects
assets/      images, audio and imported PDFs
```

The library index lives in `library.json`. Saves are debounced (500 ms). There is no account and no cloud sync.

## Project layout

```
src/
  main/        Electron main process — window, storage, import/export, AI bridge
  preload/     context bridge API exposed to the renderer
  renderer/    React UI (library, editor, component kit, styles)
  shared/      types and helpers shared by both processes
scripts/       screenshot and persistence-check helpers
```

## Releases

Pushes to `main` run the `Build and release` GitHub Actions workflow, which produces a Windows
installer (`.exe`) and macOS disk images (`.dmg`) and publishes them on the
[Releases page](https://github.com/<owner>/quillnote/releases). Builds are unsigned — on macOS,
right-click the app and choose **Open** the first time.

## License

UNLICENSED. All artwork, icons, covers, paper templates and marketplace items in this repository
are original and created in code — no third-party assets are bundled.
