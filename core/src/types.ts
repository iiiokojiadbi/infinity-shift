import type { KINDS } from './layout'

export type ShiftAfter = 'continue' | 'wait'

// The fill the stretch started from, the fill at the last hint, and a harness-made let-go the agent is not told of yet.
export type Gauge = { base: number | null; hinted: number | null; unassisted: boolean }

export type ShiftInput = { letter: string; after: ShiftAfter; about: string }

export type ArchiveInput = { name: string; outcome: 'done' | 'dropped'; about: string }

// `- [status] rest` lines of a block.
export type Item = { status: string; rest: string; line: string }

// The board's tasks: status, folder name and the note after the dash.
export type FocusTask = { status: string; name: string; line: string }

export type TaskFiles = { name: string; task: string | null; track: string | null }

export type Kind = keyof typeof KINDS

// A file of `knowledge/`: its name with `.md` and its text.
export type KnowledgeFile = { name: string; text: string }

export type Work = { board: string; owner: string | null; tasks: TaskFiles[]; knowledge: KnowledgeFile[] }

// What one stretch of work did, from the files against the previous shift's snapshot.
export type Segment = { done: string[]; dropped: string[]; archived: string[]; open: string[] }

export type Snapshot = { work: Work; index: string | null }

export type AboutMeta = {
  about: string
  sessionId: string
  at: number
  after: ShiftAfter
  segment: Segment
  tokensBefore?: number | undefined
  tokensAfter?: number | undefined
  summaryChars?: number | undefined
  result: string
}

export type Reading = { tokens: number | undefined; window: number; threshold: number | undefined }

export type HistoryEntry = { name: string; about: string | null }
