// Generated from core/src by scripts/sync-core.ts — edit the source, not this copy.
import { ARCHIVE_TOOL, BOARD_MAX_LINES, BOARD_SECTIONS, FOCUS, LETTER_SECTIONS, NAME, STATUSES, TASK_SECTIONS, TASKS } from './layout'
import { findDate, itemsOf, missingSections, quote, sections } from './markdown'
import type { FocusTask, TaskFiles, Work } from './types'

export function checkLetter(text: string): string | null {
  const missing = missingSections(text, LETTER_SECTIONS, 'The letter')
  if (missing !== null) return missing
  const found = sections(text)
  const empty = LETTER_SECTIONS.filter(name => found.get(name) === '')
  if (empty.length > 0) return `The letter has empty sections: ${quote(empty)}. Nothing to say — write "none".`

  return null
}

export function boardTasks(board: string): FocusTask[] {
  return itemsOf(sections(board).get('Tasks') ?? '').map(item => ({
    status: item.status,
    name: item.rest.split(/\s+/)[0] ?? '',
    line: item.line,
  }))
}

export function taskTitle(task: string): string | null {
  return /^# +(.+?)\s*$/m.exec(task)?.[1] ?? null
}

export function continues(task: string): string[] {
  return [...task.matchAll(/^continues: *(?:\S*\/)?archive\/([a-z0-9-]+)\/?\s*$/gm)].map(match => match[1] ?? '')
}

// The whole state of the work as one text, to tell whether anything moved since the last shift.
export function workText(work: Work): string {
  const tasks = [...work.tasks].sort((a, b) => a.name.localeCompare(b.name))

  return [work.board.trim(), ...tasks.map(t => `${t.name}\n${(t.task ?? '').trim()}\n${(t.track ?? '').trim()}`)].join('\n\n')
}

export function checkWork(work: Work, previous: Work | null): string | null {
  const { board } = work
  const boardMissing = missingSections(board, BOARD_SECTIONS, 'The board')
  if (boardMissing !== null) return boardMissing

  const lines = board.trimEnd().split('\n').length
  if (lines > BOARD_MAX_LINES) {
    return `The board is ${lines} lines, the limit is ${BOARD_MAX_LINES}: it has become a diary. Move what belongs to one task into that task, keep only decisions in force.`
  }

  const date = findDate(board)
  if (date !== null) return `A date on the board: "${date}". The board has no dates — each shift's time is recorded by itself. Remove it.`

  const focus = boardTasks(board)
  const badStatus = focus.filter(t => !(FOCUS as readonly string[]).includes(t.status))
  if (badStatus.length > 0) {
    return `Board tasks without a status (${FOCUS.join(', ')}): ${badStatus.map(t => `"${t.line}"`).join('; ')}. A finished task is archived with ${ARCHIVE_TOOL}, not marked on the board.`
  }
  const badName = focus.filter(t => !NAME.test(t.name))
  if (badName.length > 0) {
    return `Board tasks must start with the task's folder name: ${badName.map(t => `"${t.line}"`).join('; ')}.`
  }

  const onBoard = new Set(focus.map(t => t.name))
  const folders = new Set(work.tasks.map(t => t.name))
  const unlisted = [...folders].filter(name => !onBoard.has(name))
  if (unlisted.length > 0)
    return `Task folders missing from the board: ${unlisted.join(', ')}. Put each on the board with its status, or archive it.`
  const homeless = [...onBoard].filter(name => !folders.has(name))
  if (homeless.length > 0)
    return `Board tasks without a folder in ${TASKS}/: ${homeless.join(', ')}. Create the folder, or remove the line if the task is archived.`

  for (const task of work.tasks) {
    const problem = checkTask(task)
    if (problem !== null) return problem
  }

  if (previous !== null && workText(previous) === workText(work)) {
    return 'Nothing changed on the board or in the tasks since the last shift. Update the tracks, statuses and decisions, then shift.'
  }

  return null
}

function checkTask({ name, task, track }: TaskFiles): string | null {
  const where = `${TASKS}/${name}/`
  if (task === null) return `${where} has no task.md.`
  if (track === null) return `${where} has no track.md.`
  if (taskTitle(task) === null) return `${where}task.md has no "# <title>" line.`
  const missing = missingSections(task, TASK_SECTIONS, `${where}task.md`)
  if (missing !== null) return missing
  const date = findDate(task) ?? findDate(track)
  if (date !== null) return `A date in ${where}: "${date}". Tasks have no dates. Remove it.`
  const bad = itemsOf(track).filter(item => !(STATUSES as readonly string[]).includes(item.status))
  if (bad.length > 0)
    return `Track items without a status (${STATUSES.join(', ')}) in ${where}track.md: ${bad.map(i => `"${i.line}"`).join('; ')}.`

  return null
}
