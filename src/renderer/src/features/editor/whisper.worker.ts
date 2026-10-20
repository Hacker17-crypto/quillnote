/// <reference lib="webworker" />
/**
 * Local speech-to-text with Whisper (transformers.js, runs on-device). The library and the model
 * are downloaded on first use and cached by the browser; nothing is uploaded.
 */
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm'
const MODEL = 'Xenova/whisper-base'

type Pipe = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string } | { text: string }[]>
let pipe: Promise<Pipe> | null = null

async function load(): Promise<Pipe> {
  const lib = await import(/* @vite-ignore */ LIB)
  lib.env.allowLocalModels = false
  return lib.pipeline('automatic-speech-recognition', MODEL, {
    dtype: 'q8',
    progress_callback: (p: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
      if (p.status === 'progress') postMessage({ type: 'progress', file: p.file, progress: p.progress ?? 0 })
    }
  }) as Promise<Pipe>
}

self.onmessage = async (e: MessageEvent<{ audio: Float32Array; language?: string }>) => {
  try {
    pipe = pipe ?? load()
    const p = await pipe
    postMessage({ type: 'stage', stage: 'transcribing' })
    const out = await p(e.data.audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: false, ...(e.data.language ? { language: e.data.language } : {}) })
    const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text
    postMessage({ type: 'done', text: text.trim() })
  } catch (err) {
    pipe = null
    postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) })
  }
}
