// The contract must be self-contained: these two mirror the core's types of the same name.
export type ShiftAfter = 'continue' | 'wait'
export type Gauge = { base: number | null; hinted: number | null; unassisted: boolean }

export type PendingShift = {
  after: ShiftAfter
  letter: string
  hold: string
  dir: string
  board: string
  sessionId: string
  about: string
  at: number
  segment: { done: string[]; dropped: string[]; archived: string[]; open: string[] }
}

// The letter waiting for the owner's next message, and the shift folder it came from.
export type WaitNote = { context: string; dir: string; files: string[] }

declare module 'claude-code' {
  interface PluginState {
    'infinity-shift': {
      pending: PendingShift | null
      waitNote: WaitNote | null
      autoStreak: number
      gauge: Gauge
      threshold: number | null
    }
  }
}
