import { BOARD, TASKS, TOOL } from './layout'
import { formatK } from './markdown'
import type { Gauge, Reading } from './types'

// Every step is a share of the limit — the harness's own threshold, or the window when it is unknown — so the rhythm is the same on any window.
// Soft hints come every max(100K, 25%) of growth: a shorter stretch does not pay for its own letter and records.
export function softStep(limit: number): number {
  return Math.max(100_000, Math.round(limit / 4))
}

// The final hint comes at 80% of the limit, with room left to finish a stage, and again every 5% after it.
export function finalAt(limit: number): number {
  return Math.round(limit * 0.8)
}

export function finalStep(limit: number): number {
  return Math.round(limit / 20)
}

export const FRESH_GAUGE: Gauge = { base: null, hinted: null, unassisted: false }

// One hint at most per new growth; an ignored one is not repeated until the history grows again.
export function shiftHint(gauge: Gauge, { tokens, window, threshold }: Reading): { gauge: Gauge; text: string | null } {
  if (tokens === undefined) return { gauge, text: null }
  if (gauge.base === null) return { gauge: { ...FRESH_GAUGE, base: tokens }, text: gauge.unassisted ? UNASSISTED_HINT : null }

  const limit = threshold ?? window
  const final = finalAt(limit)
  const grown = tokens - gauge.base
  const since = tokens - (gauge.hinted ?? gauge.base)
  const hinted = { ...gauge, hinted: tokens }
  if (grown < finalStep(limit)) return { gauge, text: null }

  if (tokens >= final) {
    const isFirst = gauge.hinted === null || gauge.hinted < final
    return isFirst || since >= finalStep(limit) ? { gauge: hinted, text: finalHint(tokens, limit) } : { gauge, text: null }
  }
  // No soft hint right before the final one: it would come twice in a row.
  const step = softStep(limit)
  if (since >= step && tokens + step / 2 <= final) return { gauge: hinted, text: softHint(grown) }

  return { gauge, text: null }
}

function softHint(grown: number): string {
  return `Shift hint: the history has grown by ${formatK(grown)} since the last shift. This is not an alarm — running out of room gets a hint of its own. If you are at a stage boundary and the stretch's history is not needed whole any more, shift; if not, go on — the next hint comes after new growth.`
}

function finalHint(tokens: number, limit: number): string {
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
