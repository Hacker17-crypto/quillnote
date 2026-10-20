/**
 * Prompt templates for every AI feature. Each asks for a strict output format so the renderer can
 * insert results directly. `files` are the image paths written into the request's temp folder.
 */
import type { AiRequest } from '@shared/api'

const SYSTEM = `You are the assistant built into Quillnote, a handwriting and note-taking app. You only read the files you are pointed to; never try to edit files or run commands.`

function contextBlock(req: AiRequest, files: string[]): string {
  const parts: string[] = []
  if (req.scope) parts.push(`The user's context is ${req.scope}.`)
  if (req.text?.trim()) parts.push(`Text from the notes (typed, recognised handwriting and PDF text):\n<notes>\n${req.text.trim()}\n</notes>`)
  if (files.length)
    parts.push(
      `Images of the note pages (they may contain handwriting, drawings and diagrams). Read each one with the Read tool before answering:\n${files.map((f) => `- ${f}`).join('\n')}`
    )
  if (!parts.length) parts.push('There is no note content attached.')
  return parts.join('\n\n')
}

function history(req: AiRequest): string {
  if (!req.history?.length) return ''
  return `Conversation so far:\n${req.history.map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n\n')}\n\n`
}

/** Whether the answer must be JSON (validated and retried once by the bridge). */
export const JSON_KINDS = new Set(['quiz', 'search'])

export function buildPrompt(req: AiRequest, files: string[]): string {
  const ctx = contextBlock(req, files)
  switch (req.kind) {
    case 'chat':
      return `${SYSTEM}

${ctx}

${history(req)}User: ${req.prompt ?? ''}

Answer the user helpfully and concisely in Markdown (headings, lists and tables are fine). Base your answer on the notes when they are relevant.`
    case 'ocr':
      return `${SYSTEM}

${ctx}

Transcribe the handwriting in the image(s) exactly as written. Keep line breaks and list structure, fix nothing, add nothing. If a word is illegible write [?]. Write mathematical expressions in plain text. Output only the transcription — no preamble, no code fences.`
    case 'summarize':
      return `${SYSTEM}

${ctx}

Write a clear summary of these notes in Markdown: a one-sentence overview, then "## Key points" as bullets, then "## Action items" (only if there are any). Output only the Markdown.`
    case 'spell':
      return `${SYSTEM}

${ctx}

Read the handwriting and check it for spelling and grammar mistakes. Output Markdown in exactly this shape:
## Corrected text
<the full corrected text>
## Corrections
- **wrong** → **right** — short reason
(or "No mistakes found." if there are none)`
    case 'math':
      return `${SYSTEM}

${ctx}

The user wrote a maths problem or equation. Identify it, solve it and show the working step by step in Markdown. End with a line "**Answer:** …".`
    case 'quiz':
      return `${SYSTEM}

${ctx}

Create between 6 and 15 flashcards that test the important facts and ideas in these notes.
Respond with JSON only, no code fences, matching exactly: {"cards":[{"q":"question","a":"short answer"}]}`
    case 'create':
      return `${SYSTEM}

${ctx}

The user wants you to create: ${req.prompt ?? ''}

Draw it as a single clean, standalone SVG suitable for placing on a notebook page: include xmlns and a viewBox, no width/height attributes, no scripts, no external images or fonts (use font-family="Figtree, Segoe UI, sans-serif"), legible text of at least 14px, a transparent background, dark strokes (#1f2430) and soft accent fills. Output only the <svg>…</svg> markup.`
    case 'recording':
      return `${SYSTEM}

${req.text?.trim() ? `Transcript of an audio recording:\n<transcript>\n${req.text.trim()}\n</transcript>` : 'No transcript is available.'}
${files.length ? `\nNotes written during the recording (read each with the Read tool):\n${files.map((f) => `- ${f}`).join('\n')}` : ''}

Summarise the recording in Markdown: a short overview paragraph, "## Key points" as bullets, and "## Action items" (only if any). Output only the Markdown.`
    case 'search':
      return `${SYSTEM}

The user is searching their notebook for: "${req.prompt ?? ''}"

Here are page snippets, one per line as "<page number>: <text>":
<pages>
${req.text ?? ''}
</pages>

Pick the pages that best match the meaning of the search (not just the words), best first, at most 8.
Respond with JSON only, no code fences, matching exactly: {"results":[{"page":3,"why":"one short sentence"}]}`
    case 'title':
      return `${SYSTEM}

${ctx}

Suggest a short, specific title (2–6 words) for this notebook based on its content. Output only the title, without quotes.`
  }
}
