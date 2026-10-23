// Generated from core/src by scripts/sync-core.ts — edit the source, not this copy.
import { ARCHIVE, BOARD, DIR, GUIDE_TOOL, HISTORY_TOOL, INDEX, KNOWLEDGE, MOD, OWNER, TASKS } from '../layout'
import { boardTasks, knowledgeMap } from '../records'
import type { Work } from '../types'

export const ARCHIVED = (name: string) =>
  `Archived to ${ARCHIVE}/${name}/, its line is in ${INDEX}. Now remove "${name}" from the board's Tasks, and lift to the board any of its decisions that still bind beyond it.`

// What the engine's summarizer is told; the model never sees this framing.
export function compactInstructions(hold: string, board: string, letter: string): string {
  return [
    'The agent is shifting: it continues this same work right after, from its own letter.',
    `Its work board (${board}), the owner's decisions (${OWNER}), its task folders (${TASKS}/), its knowledge (${KNOWLEDGE}/) and its letter (${letter}) are on disk and will be delivered to it, so do not repeat tasks, statuses, rules, lessons or next steps.`,
    'Keep, as precisely as possible, what it asked to hold below, and the reasoning behind its current approach; everything else in this history may be dropped or reduced to one line.',
    'Do not write next steps or a plan.',
    '',
    'What the agent asked to hold:',
    hold,
  ].join('\n')
}

// Added to an automatic compaction the agent did not ask for.
export const UNASSISTED_INSTRUCTIONS = `The agent did not shift before this point, so there is no letter. Its work board may be on disk at ${BOARD}, the owner's decisions at ${OWNER}, its tasks in ${TASKS}/. Keep the overall goal and how it evolved, open tasks with their status, decisions with their reasons, exact paths, commands, error texts and values. End with a short "Where to continue" section.`

// The board, the owner's decisions and the tasks in progress, whole, and the map of knowledge: what the agent stands on after a shift.
// Each file goes in a tag with its path: the records carry headings and code blocks of their own, so neither can mark where a file ends.
export function renderWork(work: Work | null): string {
  if (work === null) return `There is no board at ${BOARD}.`
  const tasks = inProgress(work).flatMap(t => [
    file(`${TASKS}/${t.name}/task.md`, t.task ?? 'missing'),
    file(`${TASKS}/${t.name}/track.md`, t.track ?? 'missing'),
  ])

  return [
    file(BOARD, work.board),
    file(OWNER, work.owner ?? 'none'),
    ...(tasks.length === 0 ? ['No task is in progress.'] : tasks),
    `<knowledge path="${KNOWLEDGE}/" note="read a file when its topic comes up">\n${knowledgeMap(work.knowledge)}\n</knowledge>`,
  ].join('\n\n')
}

function file(path: string, text: string): string {
  return `<file path="${path}">\n${text.trim()}\n</file>`
}

function inProgress(work: Work): Work['tasks'] {
  const doing = new Set(
    boardTasks(work.board)
      .filter(t => t.status === 'in progress')
      .map(t => t.name),
  )

  return work.tasks.filter(t => doing.has(t.name))
}

// What a shift hands back, as paths inside the records folder: the owner's row names them.
export function deliveredFiles(work: Work | null): string[] {
  if (work === null) return ['letter.md']
  const owner = work.owner === null ? [] : ['owner.md']
  const tasks = inProgress(work).map(t => `tasks/${t.name}/`)
  const knowledge = work.knowledge.length === 0 ? [] : ['knowledge/ (the map)']

  return ['letter.md', 'board.md', ...owner, ...tasks, ...knowledge]
}

// Everything a shift hands back, in one tag that names the mod: the agent sees at once what came from where.
function shiftMessage(opening: string, letter: string, work: Work | null, dir: string, closing: string[] = []): string {
  return [
    `<${MOD} shift="${dir}/">`,
    opening,
    '',
    `<letter path="${dir}/letter.md">`,
    letter.trim(),
    '</letter>',
    '',
    "The board, the owner's decisions, the tasks in progress and the map of knowledge, as they are now:",
    '',
    renderWork(work),
    '',
    `The letter and the snapshots of this shift: ${dir}/.`,
    ...closing,
    `</${MOD}>`,
  ].join('\n')
}

export function continuePrompt(letter: string, work: Work | null, dir: string): string {
  return shiftMessage('Shift done. You continue from where you stopped. Your letter to yourself:', letter, work, dir, [
    'Continue from "Next".',
  ])
}

export function waitContext(letter: string, work: Work | null, dir: string): string {
  return shiftMessage("You shifted and waited for the owner; the owner's message is above. Your letter to yourself:", letter, work, dir)
}

export function resumePrompt(letter: string, work: Work | null, dir: string): string {
  return shiftMessage(
    'You pick up the work from the last shift: this is a new session, you have no history of the previous one, only the records. Your letter to yourself:',
    letter,
    work,
    dir,
    [
      `Past shifts — ${HISTORY_TOOL}; archived tasks — ${INDEX}; how a shift works — ${GUIDE_TOOL}.`,
      'Check "Next" against what is on disk now and continue from the first step not done.',
    ],
  )
}

export const ACCEPTED = (dir: string) =>
  `Shift accepted, the letter and the snapshots: ${dir}/. End the turn with one line and do nothing more: after the turn the stretch's history is let go, and you continue from the letter.`

export const NOT_IGNORED = `${DIR}/ is not ignored by this project's git. The records are yours, not the project's: add "/${DIR}/" to the project's .gitignore and call again.`
