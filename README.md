# Quillnote

Quillnote is an early desktop notebook-library preview for Windows and macOS.

**The page editor is still a placeholder.** Handwriting, annotation, audio recording,
and AI assistance are planned features, not working features in this release.

## What works now

- Create notebooks and folders, choose paper templates and covers.
- Rename, duplicate, move, favorite, trash, and restore library items.
- Save the library locally and reopen it after restarting the app.
- Import documents and export PDF or `.quill` files through the library menus.
- Library search, sorting, selection, appearance settings, and document tabs.

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
of your personal library. The current Claude integration only detects the CLI.

## License

UNLICENSED. Third-party packages retain their respective licenses.
