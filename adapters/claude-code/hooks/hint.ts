import type { EngineInterface } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type { Gauge } from './core/index'
import { FRESH_GAUGE, shiftHint } from './core/index'

// The engine lists a module's state from atoms declared in the same file, so each file declares the ones it touches.
const gauge = atom({ plugin: 'infinity-shift', key: 'gauge' } as const, FRESH_GAUGE)
const pending = atom({ plugin: 'infinity-shift', key: 'pending' } as const, null)
const threshold = atom({ plugin: 'infinity-shift', key: 'threshold' } as const, null)

// The harness's own threshold, read once the window is half full: the breakdown that names it is an estimate over everything.
async function compactLimit($: EngineInterface, tokens: number, window: number): Promise<number | undefined> {
  const known: number | null = await read($, threshold)
  if (known !== null || tokens < window / 2) return known ?? undefined
  const { breakdown } = (await $.session.usage({ breakdown: 'summary' })).context
  const limit = breakdown?.autoCompactThreshold ?? window
  await update($, threshold, () => limit)

  return limit
}

// A hint for the agent if the fill since the last shift calls for one; none while a shift is pending.
export async function takeHint($: EngineInterface): Promise<string | null> {
  if ((await read($, pending)) !== null) return null
  const { tokens, window } = (await $.session.usage()).context
  const reading = { tokens, window, threshold: tokens === undefined ? undefined : await compactLimit($, tokens, window) }
  let text: string | null = null
  await update($, gauge, (current: Gauge) => {
    const hint = shiftHint(current, reading)
    text = hint.text

    return hint.gauge
  })

  return text
}
