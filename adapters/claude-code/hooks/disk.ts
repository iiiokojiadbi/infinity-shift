import type { EngineInterface } from 'claude-code'
import type { Snapshot, TaskFiles, Work } from './core/index'
import { DIR } from './core/index'

export async function readOrNull($: EngineInterface, path: string): Promise<string | null> {
  return $.fs.read(path).then(
    text => (typeof text === 'string' ? text : null),
    () => null,
  )
}

async function dirNames($: EngineInterface, path: string): Promise<string[]> {
  const entries = await $.fs.list(path).catch(() => [])

  return entries
    .filter(entry => entry.kind === 'dir')
    .map(entry => entry.name)
    .sort()
}

// The board and every task folder under `base` (the project's `.infinity-shift/` or a shift's snapshot); null without a board.
export async function readWork($: EngineInterface, base: string): Promise<Work | null> {
  const board = await readOrNull($, `${base}/board.md`)
  if (board === null) return null
  const tasks: TaskFiles[] = await Promise.all(
    (await dirNames($, `${base}/tasks`)).map(async name => ({
      name,
      task: await readOrNull($, `${base}/tasks/${name}/task.md`),
      track: await readOrNull($, `${base}/tasks/${name}/track.md`),
    })),
  )

  return { board, tasks }
}

export async function readSnapshot($: EngineInterface, base: string, index: string): Promise<Snapshot | null> {
  const work = await readWork($, base)

  return work === null ? null : { work, index: await readOrNull($, index) }
}

// Shift folder names, oldest first: they are UTC stamps, so they sort by time.
export async function shiftNames($: EngineInterface, root: string): Promise<string[]> {
  return dirNames($, `${root}/${DIR}/shifts`)
}

// The newest earlier shift folder, whose snapshots the new state is checked against.
export async function previousShift($: EngineInterface, root: string): Promise<string | null> {
  const last = (await shiftNames($, root)).at(-1)

  return last === undefined ? null : `${root}/${DIR}/shifts/${last}`
}
