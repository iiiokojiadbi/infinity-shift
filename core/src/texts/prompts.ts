import { ARCHIVE, BOARD, DIR, GUIDE_TOOL, HISTORY_TOOL, INDEX, KNOWLEDGE, OWNER, TASKS } from '../layout'
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
export function renderWork(work: Work | null): string {
  if (work === null) return `There is no board at ${BOARD}.`
  const doing = new Set(
    boardTasks(work.board)
      .filter(t => t.status === 'in progress')
      .map(t => t.name),
  )
  const tasks = work.tasks
    .filter(t => doing.has(t.name))
    .map(t =>
      [`### ${TASKS}/${t.name}/task.md`, '', (t.task ?? '').trim(), '', `### ${TASKS}/${t.name}/track.md`, '', (t.track ?? '').trim()].join(
        '\n',
      ),
    )

  return [
    `### ${BOARD}`,
    work.board.trim(),
    `### ${OWNER}`,
    (work.owner ?? 'none').trim(),
    ...(tasks.length === 0 ? ['No task is in progress.'] : tasks),
    `### ${KNOWLEDGE}/ — read a file when its topic comes up`,
    knowledgeMap(work.knowledge),
  ].join('\n\n')
}

function letterAndWork(opening: string, letter: string, work: Work | null, dir: string): string[] {
  return [
    opening,
    '',
    letter.trim(),
    '',
    "The board, the owner's decisions, the tasks in progress and the map of knowledge, as they are now:",
    '',
    renderWork(work),
    '',
    `The letter and the snapshots of this shift: ${dir}/.`,
  ]
}

export function continuePrompt(letter: string, work: Work | null, dir: string): string {
  return [
    ...letterAndWork('Shift done. You continue from where you stopped. Your letter to yourself:', letter, work, dir),
    'Continue from "Next".',
  ].join('\n')
}

export function waitContext(letter: string, work: Work | null, dir: string): string {
  return letterAndWork(
    "You shifted and waited for the owner; the owner's message is above. Your letter to yourself:",
    letter,
    work,
    dir,
  ).join('\n')
}

export function resumePrompt(letter: string, work: Work | null, dir: string): string {
  return [
    ...letterAndWork(
      'You pick up the work from the last shift: this is a new session, you have no history of the previous one, only the records. Your letter to yourself:',
      letter,
      work,
      dir,
    ),
    `Past shifts — ${HISTORY_TOOL}; archived tasks — ${INDEX}; how a shift works — ${GUIDE_TOOL}.`,
    'Check "Next" against what is on disk now and continue from the first step not done.',
  ].join('\n')
}

export const ACCEPTED = (dir: string) =>
  `Shift accepted, the letter and the snapshots: ${dir}/. End the turn with one line and do nothing more: after the turn the stretch's history is let go, and you continue from the letter.`

export const NOT_IGNORED = `${DIR}/ is not ignored by this project's git. The records are yours, not the project's: add "/${DIR}/" to the project's .gitignore and call again.`
