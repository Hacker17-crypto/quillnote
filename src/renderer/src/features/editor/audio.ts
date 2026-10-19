/** Audio recording (MediaRecorder), local transcription and AI summaries for "Record & Summarize". */
import { create } from 'zustand'
import { uid } from '@shared/docs'
import type { Recording } from '@shared/types'
import { session, useEditor } from '../../stores/editor'
import { useUi } from '../../stores/ui'
import { ask, pageImage } from './ai'
import { assetUrl } from './render'

interface Job {
  stage: 'downloading' | 'transcribing' | 'summarizing' | 'error'
  progress?: number
  error?: string
}

export const useAudioJobs = create<{ jobs: Record<string, Job>; set: (id: string, j: Job | null) => void }>((set) => ({
  jobs: {},
  set: (id, j) =>
    set((s) => {
      const jobs = { ...s.jobs }
      if (j) jobs[id] = j
      else delete jobs[id]
      return { jobs }
    })
}))

let active: { docId: string; id: string; recorder: MediaRecorder; stream: MediaStream; chunks: Blob[] } | null = null
const toast = (m: string): void => useUi.getState().toast(m)

export async function startRecording(docId: string): Promise<void> {
  if (active) {
    toast('A recording is already running')
    return
  }
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  } catch {
    toast('Microphone access was denied. Allow it in your system privacy settings and try again.')
    return
  }
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
  const recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
  const id = uid()
  active = { docId, id, recorder, stream, chunks: [] }
  recorder.ondataavailable = (e) => e.data.size && active?.chunks.push(e.data)
  recorder.start(1000)
  useEditor.getState().view(docId, { recording: { id, startedAt: Date.now(), pausedMs: 0, pausedAt: null } })
}

export function togglePause(docId: string): void {
  const r = session(docId)?.recording
  if (!active || !r) return
  if (r.pausedAt) {
    active.recorder.resume()
    useEditor.getState().view(docId, { recording: { ...r, pausedMs: r.pausedMs + Date.now() - r.pausedAt, pausedAt: null } })
  } else {
    active.recorder.pause()
    useEditor.getState().view(docId, { recording: { ...r, pausedAt: Date.now() } })
  }
}

export function stopRecording(docId: string, summarize = true): Promise<void> {
  const cur = active
  const r = session(docId)?.recording
  if (!cur || !r || cur.docId !== docId) return Promise.resolve()
  return new Promise((resolve) => {
    cur.recorder.onstop = async () => {
      cur.stream.getTracks().forEach((t) => t.stop())
      active = null
      const end = r.pausedAt ?? Date.now()
      const duration = Math.max(0, end - r.startedAt - r.pausedMs)
      useEditor.getState().view(docId, { recording: null })
      const blob = new Blob(cur.chunks, { type: 'audio/webm' })
      try {
        const asset = await window.quill.doc.writeAsset(docId, `rec-${cur.id.slice(0, 8)}.webm`, new Uint8Array(await blob.arrayBuffer()))
        const count = (session(docId)?.doc.recordings?.length ?? 0) + 1
        const rec: Recording = { id: cur.id, asset, title: `Recording ${count}`, createdAt: r.startedAt, duration }
        useEditor.getState().edit(docId, (doc) => ({ ...doc, recordings: [...(doc.recordings ?? []), rec] }), { history: false })
        useEditor.getState().view(docId, { panel: 'recordings' })
        if (summarize) void summarizeRecording(docId, rec.id)
      } catch (e) {
        toast(`Couldn't save the recording: ${e instanceof Error ? e.message : 'unknown error'}`)
      }
      resolve()
    }
    cur.recorder.stop()
  })
}

export function patchRecording(docId: string, id: string, p: Partial<Recording>): void {
  useEditor.getState().edit(docId, (doc) => ({ ...doc, recordings: (doc.recordings ?? []).map((r) => (r.id === id ? { ...r, ...p } : r)) }), { history: false })
}

export function deleteRecording(docId: string, id: string): void {
  useEditor.getState().edit(
    docId,
    (doc) => ({
      ...doc,
      recordings: (doc.recordings ?? []).filter((r) => r.id !== id),
      // strokes keep their ink but lose the link to the deleted audio
      pages: doc.pages.map((p) => (p.objects.some((o) => o.type === 'stroke' && o.rec === id) ? { ...p, objects: p.objects.map((o) => (o.type === 'stroke' && o.rec === id ? { ...o, rec: undefined, t: undefined } : o)) } : p))
    }),
    { history: false }
  )
}

let worker: Worker | null = null

/** Decode the recording to 16 kHz mono and run Whisper locally. */
export async function transcribe(docId: string, rec: Recording): Promise<string> {
  const jobs = useAudioJobs.getState()
  jobs.set(rec.id, { stage: 'downloading', progress: 0 })
  const buf = await (await fetch(assetUrl(docId, rec.asset))).arrayBuffer()
  const ctx = new AudioContext({ sampleRate: 16000 })
  const audio = await ctx.decodeAudioData(buf)
  void ctx.close()
  const mono = new Float32Array(audio.length)
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c)
    for (let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels
  }
  worker = worker ?? new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
  const w = worker
  return new Promise((resolve, reject) => {
    const files = new Map<string, number>()
    w.onmessage = (e: MessageEvent<{ type: string; text?: string; error?: string; file?: string; progress?: number; stage?: string }>) => {
      const m = e.data
      if (m.type === 'progress') {
        files.set(m.file ?? '', m.progress ?? 0)
        const avg = [...files.values()].reduce((a, b) => a + b, 0) / Math.max(1, files.size)
        jobs.set(rec.id, { stage: 'downloading', progress: avg })
      } else if (m.type === 'stage') jobs.set(rec.id, { stage: 'transcribing' })
      else if (m.type === 'done') resolve(m.text ?? '')
      else if (m.type === 'error') reject(new Error(m.error))
    }
    w.onerror = (e) => reject(new Error(e.message || 'Transcription failed to start'))
    w.postMessage({ audio: mono }, [mono.buffer])
  })
}

/** Transcribe (if needed) and summarise a recording with Claude. */
export async function summarizeRecording(docId: string, recId: string): Promise<void> {
  const jobs = useAudioJobs.getState()
  let rec = session(docId)?.doc.recordings?.find((r) => r.id === recId)
  if (!rec) return
  try {
    if (!rec.transcript) {
      const transcript = await transcribe(docId, rec)
      patchRecording(docId, recId, { transcript: transcript || '(no speech detected)' })
      rec = { ...rec, transcript }
    }
  } catch (e) {
    jobs.set(recId, { stage: 'error', error: `Transcription unavailable: ${e instanceof Error ? e.message : 'failed'}. Summarising from your notes instead.` })
  }
  try {
    useAudioJobs.getState().set(recId, { stage: 'summarizing' })
    const s = session(docId)
    if (!s) return
    // pages that got ink while this recording was running
    const pages = s.doc.pages.map((p, i) => (p.objects.some((o) => o.type === 'stroke' && o.rec === recId) ? i : -1)).filter((i) => i >= 0).slice(0, 4)
    const images = []
    for (const i of pages) images.push(await pageImage(s.doc, i))
    if (!rec.transcript && !images.length) {
      jobs.set(recId, { stage: 'error', error: 'Nothing to summarise yet: no transcript and no notes were written during this recording.' })
      return
    }
    const summary = await ask({ kind: 'recording', text: rec.transcript, images }).promise
    patchRecording(docId, recId, { summary })
    jobs.set(recId, null)
  } catch (e) {
    jobs.set(recId, { stage: 'error', error: e instanceof Error ? e.message : 'Summary failed' })
  }
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
