// Generated from core/src by scripts/sync-core.ts — edit the source, not this copy.
export const TOOL = 'shift'

export const GUIDE_TOOL = 'shift_guide'

export const HISTORY_TOOL = 'shift_history'

export const ARCHIVE_TOOL = 'task_archive'

export const RESUME_COMMAND = 'shift-resume'

// Consecutive self-continued shifts before the mod stops and waits for the owner.
export const MAX_AUTO_STREAK = 3

// The board is the state of the work; past this it has turned into a diary.
export const BOARD_MAX_LINES = 150

export const DIR = '.infinity-shift'

export const BOARD = `${DIR}/board.md`

export const LETTER = `${DIR}/letter.md`

export const TASKS = `${DIR}/tasks`

export const ARCHIVE = `${DIR}/archive`

export const INDEX = `${ARCHIVE}/index.md`

export const BOARD_SECTIONS = ['Goal', 'Tasks', 'Owner decisions', 'Decisions', 'Dead ends'] as const

export const TASK_SECTIONS = ['Goal', 'Done when', 'Owner decisions', 'Decisions', 'Dead ends'] as const

export const LETTER_SECTIONS = ['Where I am', 'Next', 'Unverified', 'Hold'] as const

// Where a task stands on the board; closing it is archiving it.
export const FOCUS = ['in progress', 'deferred', 'waiting for owner'] as const

// Where an item of a task's track stands.
export const STATUSES = ['in progress', 'open', 'done', 'dropped'] as const

export const CLOSED = new Set(['done', 'dropped'])

// The description of a shift, as `about.md` and the history show it; an archived task's line, as the index shows it.
export const ABOUT_MAX = 400

export const HISTORY_DEFAULT = 10

export const HISTORY_MAX = 50

export const NAME = /^[a-z0-9][a-z0-9-]*$/
