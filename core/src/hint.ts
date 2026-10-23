import { BOARD, TASKS, TOOL } from './layout'
import { formatK } from './markdown'
import type { Gauge, Reading } from './types'

// Growth since the last shift that is worth one: there is something to let go.
export const SOFT_GROWTH = 50_000

// Below this growth a shift buys nothing, however full the window is: max(5K, 1% of the window).
export function benefit(window: number): number {
  return Math.max(5_000, Math.round(window / 100))
}

// How close to the harness's own threshold the hard hint starts: max(30K, 10% of it).
export function hardMargin(limit: number): number {
  return Math.max(30_000, Math.round(limit / 10))
}

export const FRESH_GAUGE: Gauge = { base: null, hinted: null, unassisted: false }

// One hint at most per new growth; an ignored one is not repeated until the history grows again.
export function shiftHint(gauge: Gauge, { tokens, window, threshold }: Reading): { gauge: Gauge; text: string | null } {
  if (tokens === undefined) return { gauge, text: null }
  if (gauge.base === null) return { gauge: { ...FRESH_GAUGE, base: tokens }, text: gauge.unassisted ? UNASSISTED_HINT : null }

  const grown = tokens - gauge.base
  const since = tokens - (gauge.hinted ?? gauge.base)
  const step = benefit(window)
  if (grown < step) return { gauge, text: null }

  const limit = threshold ?? window
  const hinted = { ...gauge, hinted: tokens }
  if (limit - tokens <= hardMargin(limit) && since >= step) return { gauge: hinted, text: hardHint(tokens, limit) }
  if (since >= SOFT_GROWTH) return { gauge: hinted, text: softHint(grown) }

  return { gauge, text: null }
}

function softHint(grown: number): string {
  return `Shift hint: the history has grown by ${formatK(grown)} since the last shift. This is not an alarm — running out of room gets a hint of its own. If you are at a stage boundary and the stretch's history is not needed whole any more, shift; if not, go on — the next hint comes after new growth.`
}

function hardHint(tokens: number, limit: number): string {
  return `Shift hint: ${formatK(tokens)} of ${formatK(limit)} used — close to the point where the harness lets the history go by itself, without your letter. Shift at the nearest stage boundary: board, tasks, letter, \`${TOOL}\`.`
}

// A hint goes inside the last tool result, framed as a system note: a block of its own would show as the owner's words.
export function withHint<Block extends { type: string }>(content: readonly Block[], hint: string): Block[] {
  const note = `<system-reminder>\n${hint}\n</system-reminder>`
  const at = content.map(block => block.type).lastIndexOf('tool_result')
  if (at === -1) return [...content]
  const block = content[at] as Block & { content?: unknown }
  const inner = block.content
  const merged =
    typeof inner === 'string' || inner === undefined
      ? `${inner ?? ''}\n\n${note}`.trimStart()
      : [...(inner as readonly unknown[]), { type: 'text', text: note }]

  return content.map((each, index) => (index === at ? ({ ...block, content: merged } as Block) : each))
}

export const UNASSISTED_HINT = `The harness let the history go by itself, without your shift: there is no letter, only its digest is in memory. Before going on, read the board \`${BOARD}\` and the tasks in progress in \`${TASKS}/\`, and check where you stand against them.`
