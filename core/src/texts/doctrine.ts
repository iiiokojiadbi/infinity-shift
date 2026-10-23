import {
  ABOUT_MAX,
  ARCHIVE,
  ARCHIVE_TOOL,
  BOARD,
  BOARD_MAX_LINES,
  DIR,
  FOCUS,
  GUIDE_TOOL,
  HISTORY_DEFAULT,
  HISTORY_TOOL,
  INDEX,
  LETTER,
  RESUME_COMMAND,
  STATUSES,
  TASK_SECTIONS,
  TASKS,
  TOOL,
} from '../layout'

const BOARD_RULES = `The board is a state, not a diary:
- lines are rewritten in place, nothing new is appended on top of the old;
- no dates anywhere, in the board or in tasks: each shift's time is recorded by itself;
- no more than ${BOARD_MAX_LINES} lines.

Sections, as \`##\` headings, all required (an empty one says "none"):
- "Goal" — what the project is for and how that changed, briefly;
- "Tasks" — every open task, one line each: \`- [status] <name> — what matters\`, status: ${FOCUS.join(', ')}; deferred and waiting — with the reason;
- "Owner decisions" — verbatim, those in force for the whole project; drop revoked ones;
- "Decisions" — yours, for the whole project, with the reason;
- "Dead ends" — approaches ruled out for the whole project, and why.

A decision or dead end goes on the board only if it outlives any one task; otherwise it belongs to the task.`

const TASK_RULES = `A task is one line of work, split by meaning: a feature, an adapter, a migration. Each lives in \`${TASKS}/<name>/\`, \`<name>\` in lowercase latin with dashes:
- \`task.md\` — what the task is: a \`# <title>\` line; optionally \`continues: ${ARCHIVE}/<name>/\` lines, one per archived task it picks up; then sections ${TASK_SECTIONS.map(s => `"${s}"`).join(', ')}, all required ("none" if empty). Update it as the task changes. Decisions and dead ends that matter only inside this task go here;
- \`track.md\` — the task's tracker: one line per item, \`- [status] item — what matters\`, status: ${STATUSES.join(', ')}. Add items as you go, update their status in place; closed items stay until the task is archived — the track is the task's history.

Every folder in \`${TASKS}/\` is on the board, and every board task has its folder. What is "in progress" on the board is what you are doing now — one task, several, or none.`

export const DOCTRINE = `# Shift

You work in stretches and decide yourself when to shift: the stretch's history is let go, and you continue from where you stopped. You do not change — only what is in front of you does. So everything you need next must be in your records, and a thought you have not written down yet goes into a letter to yourself.

## Board and tasks

\`${BOARD}\` is the state of the work: which tasks are open and which you are doing now. Each task has its own folder with a description and a tracker. Keep them as you go, not before a shift: took a task, finished an item, dropped one, made a decision, heard the owner's decision, hit a dead end — fix the board or the task right away. No board — create it.

${BOARD_RULES}

${TASK_RULES}

A finished or dropped task goes to the archive through \`${ARCHIVE_TOOL}\`; \`${INDEX}\` lists every archived task. A new task may continue an archived one. The project may also have a tracker of its own; it is a different thing — do not link tasks to it.

## When to shift

At a stage boundary: an item or a task is done, a commit is made, the plan moved to its next step — and the stretch's history is not needed whole any more. Not in the middle of a thought that is easier to finish than to write down.

The mod hints with a "Shift hint" line at the end of a tool result or next to a message: when the history has grown noticeably since the last shift, and when room is running out. A hint is not an order: you decide.

## Tools

- \`${GUIDE_TOOL}\` — how to shift properly and how the files are laid out. Read it before the first shift of a session.
- \`${TOOL}\` — make a shift.
- \`${ARCHIVE_TOOL}\` — archive a finished or dropped task.
- \`${HISTORY_TOOL}\` — what happened in past shifts, briefly.`

export const GUIDE = `# Shift: how it works and how to do it right

A shift is the boundary between stretches of work. You prepare your records, call \`${TOOL}\`, the stretch's history is let go, and you continue from your letter. You do not change: you write the letter to yourself, not to a successor.

## Files

\`\`\`
${DIR}/
├── board.md          the board — which tasks are open, what you do now, project-wide decisions
├── letter.md         the letter to yourself — written anew before every shift
├── tasks/
│   └── <name>/
│       ├── task.md   what the task is, its decisions and dead ends
│       └── track.md  the task's tracker
├── archive/          written by ${ARCHIVE_TOOL}; do not edit
│   ├── index.md      one line per archived task
│   └── <name>/       the task's folder as it was
└── shifts/           history, written by the mod; do not edit
    └── <YYYYMMDD-hhmmss UTC>/
        ├── about.md      the shift in brief — strict structure below
        ├── letter.md     a copy of the letter
        ├── board.md      a snapshot of the board
        ├── index.md      a snapshot of the archive index
        ├── tasks/        snapshots of the open tasks
        └── summary.md    what stayed in memory after the shift
\`\`\`

## Board — \`${BOARD}\`

${BOARD_RULES}

## Tasks — \`${TASKS}/\`

${TASK_RULES}

## Archive — \`${ARCHIVE}/\`

When a task is finished or dropped, call \`${ARCHIVE_TOOL}\`:
- \`name\` — the task's folder name;
- \`outcome\` — \`done\` (every track item is done or dropped) or \`dropped\` (the reason goes into \`about\`);
- \`about\` — one line up to ${ABOUT_MAX} characters: what the task was and how it ended. This is the index line you will look the task up by.

The tool moves the folder to \`${ARCHIVE}/<name>/\` and adds \`- [<outcome>] [<title>](<name>/) — <about>\` to \`${INDEX}\`, with \`; continues <name>, …\` if the task continued archived ones. Then remove the task's line from the board, and lift to the board any of its decisions that still bind beyond it.

To come back to an archived topic, open a new task and put \`continues: ${ARCHIVE}/<name>/\` in its \`task.md\`; read the archived folder first.

## Letter — \`${LETTER}\`

Written anew, whole, before every shift. Sections \`##\`, all required and non-empty (nothing to say — "none"):
- "Where I am" — what you were doing at this moment, the thought you did not finish;
- "Next" — steps: a command or a file and what you expect;
- "Unverified" — and what not to trust;
- "Hold" — what from this stretch must stay in memory exactly: paths, commands, error texts, values, the line of reasoning. Only this section steers what stays in memory; do not repeat the board, the tasks or the letter — they come back to you whole.

## How to shift

1. Board and tasks: every open task on the board with its focus status, each touched task's track up to date, decisions recorded where they belong, finished tasks archived.
2. The letter — by the sections above.
3. Call \`${TOOL}\`:
   - \`letter\` — the path to the letter, usually \`${LETTER}\`;
   - \`after\` — \`continue\` if there is work to do without the owner; \`wait\` if the owner is needed or the work is over;
   - \`about\` — one line up to ${ABOUT_MAX} characters: what the stretch did and where you stand. This is the history line you will look the stretch up by.
4. End the turn with one line, no further actions.

After the shift, the first message is "Shift done" with the letter, the board and the tasks in progress, whole; continue from "Next". With \`wait\` they come together with the owner's next message. Three \`continue\` in a row without the owner — the mod then waits for the owner itself.

## When the mod refuses

A refusal names the reason; fix it and call again:
- no letter at the path, a section missing or empty;
- no board, a section missing, more than ${BOARD_MAX_LINES} lines;
- a date (\`YYYY-MM-DD\` or \`DD.MM.YYYY\`) on the board or in a task;
- a board task with an unknown status or name, a task folder missing from the board, a board task without a folder;
- a task without \`task.md\` or \`track.md\`, without a title or a section, a track item without a status;
- nothing changed on the board or in the tasks since the last shift;
- \`about\` empty, multi-line or longer than ${ABOUT_MAX} characters.

## about.md — strict structure

\`\`\`
---
description: <about from the call>
at: <ISO time of the shift, UTC>
after: continue | wait
result: pending | shifted (<before> → <after>), continuing | shifted (…), waiting for the owner | shifted (…), waiting: … in a row without the owner | not shifted: <reason>
tokens: <before> → <after>
summary_chars: <size of summary.md>
session: <session id>
---

## Done
- <task>: <item — what matters>      or "none"

## Dropped
- <task>: <item — reason>            or "none"

## Archived
- <the index line>                   or "none"

## Open
- [<focus>] <task> — what matters    or "none"
\`\`\`

How to read it: frontmatter — \`key: value\` lines between \`---\`; sections — by \`## \` headings, items — lines starting with \`- \`. "Done" and "Dropped" — track items closed during this stretch (not closed in the previous shift's snapshot); "Archived" — index lines added during this stretch; "Open" — the board's tasks at the moment of the shift. The mod derives all of it from the files, not you. \`result: pending\` on an old folder means the session broke off before the shift finished.

## History and a new session

- \`${HISTORY_TOOL}\` with \`count\` (default ${HISTORY_DEFAULT}) — the last shifts in brief: time, outcome, description, what was done, dropped and archived, and for the last one what is open. The stretch in detail — \`letter.md\`, \`board.md\` and \`tasks/\` of its folder.
- \`${INDEX}\` — every archived task, one line each.
- In a new session the owner calls \`/${RESUME_COMMAND}\`: the last shift's letter, the board and the tasks in progress come to you; continue from "Next".`
