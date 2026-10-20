import { readdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const shared = resolve(__dirname, 'src/shared')

/** Ship pdf.js font, cmap, colour-profile and wasm data next to the renderer bundle (./pdfjs/…). */
function pdfjsAssets(): Plugin {
  const root = resolve(__dirname, 'node_modules/pdfjs-dist')
  return {
    name: 'quillnote-pdfjs-assets',
    apply: 'build',
    generateBundle() {
      for (const dir of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) {
        let files: string[] = []
        try {
          files = readdirSync(join(root, dir))
        } catch {
          continue
        }
        for (const f of files) this.emitFile({ type: 'asset', fileName: `pdfjs/${dir}/${f}`, source: readFileSync(join(root, dir, f)) })
      }
    }
  }
}

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared } }
  },
  preload: {
    resolve: { alias: { '@shared': shared } },
    define: { __APP_VERSION__: JSON.stringify(pkg.version) }
  },
  renderer: {
    resolve: { alias: { '@shared': shared, '@': resolve(__dirname, 'src/renderer/src') } },
    plugins: [react(), pdfjsAssets()]
  }
})
