import type { TestBody } from 'claude-code/testing'
import { expect, mock, test } from 'claude-code/testing'
import type { TaskFiles, Work } from '../hooks/core/index'
import {
  addToIndex,
  checkArchive,
  checkLetter,
  checkWork,
  compactInstructions,
  FRESH_GAUGE,
  frontmatter,
  indexLine,
  parseArchiveInput,
  parseHistoryCount,
  parseShiftInput,
  renderAbout,
  renderHistory,
  sections,
  segment,
  shiftDir,
  shiftHint,
  withHint,
} from '../hooks/core/index'

const LETTER = ['## Where I am', 'fixing tests', '## Next', 'claude plugin test', '## Unverified', 'none', '## Hold', 'HOLD-THIS'].join(
  '\n',
)

function boardWith(taskLines: string[]): string {
  return [
    '## Goal',
    'the mod',
    '## Tasks',
    ...taskLines,
    '## Owner decisions',
    'none',
    '## Decisions',
    'none',
    '## Dead ends',
    'none',
  ].join('\n')
}

function taskMd(title: string, extra: string[] = []): string {
  return [
    `# ${title}`,
    ...extra,
    '',
    '## Goal',
    'g',
    '## Done when',
    'd',
    '## Owner decisions',
    'none',
    '## Decisions',
    'none',
    '## Dead ends',
    'none',
  ].join('\n')
}

const BOARD = boardWith(['- [in progress] tests — red'])
const TRACK = '- [in progress] fix the parser\n- [open] cover the archive'
const TESTS: TaskFiles = { name: 'tests', task: taskMd('Green tests'), track: TRACK }
const WORK: Work = { board: BOARD, tasks: [TESTS] }

test('parseShiftInput refuses an empty letter, an unknown after and a bad about', () => {
  expect(parseShiftInput({ letter: ' ', after: 'wait', about: 'a' })).toContain('letter')
  expect(parseShiftInput({ letter: 'l.md', after: 'later', about: 'a' })).toContain('after')
  expect(parseShiftInput({ letter: 'l.md', after: 'wait', about: '' })).toContain('about')
  expect(parseShiftInput({ letter: 'l.md', after: 'wait', about: 'a\nb' })).toContain('one line')
  expect(parseShiftInput({ letter: 'l.md', after: 'wait', about: 'x'.repeat(401) })).toContain('401')
  expect(parseShiftInput({ letter: ' l.md ', after: 'continue', about: ' a ' })).toEqual({ letter: 'l.md', after: 'continue', about: 'a' })
})

test('about.md lists what the tracks closed in this stretch, what was archived and what is open', () => {
  const previous = {
    work: { board: BOARD, tasks: [{ ...TESTS, track: '- [done] schema — applied\n- [in progress] webhooks' }] },
    index: null,
  }
  const now = {
    work: {
      board: boardWith(['- [in progress] tests — red', '- [deferred] refunds — waits for the API']),
      tasks: [{ ...TESTS, track: '- [done] schema — applied\n- [done] webhooks — HMAC\n- [dropped] retries — the provider does it' }],
    },
    index: '# Archive\n\n- [done] [Old](old/) — finished',
  }
  const seg = segment(now, previous)
  expect(seg).toEqual({
    done: ['tests: webhooks — HMAC'],
    dropped: ['tests: retries — the provider does it'],
    archived: ['[done] [Old](old/) — finished'],
    open: ['[in progress] tests — red', '[deferred] refunds — waits for the API'],
  })
  const about = renderAbout({ about: 'webhooks ready', sessionId: 's', at: 0, after: 'wait', segment: seg, result: 'pending' })
  expect(about).toContain('description: webhooks ready')
  expect(about).toContain('## Done\n\n- tests: webhooks — HMAC')
  expect(about).toContain('## Archived\n\n- [done] [Old](old/) — finished')
  expect(about).toContain('tokens: unknown')
})

test('the letter needs every section, none empty', () => {
  expect(checkLetter(LETTER)).toBeNull()
  expect(checkLetter('## Where I am\nhere')).toContain('"## Next"')
  expect(checkLetter(LETTER.replace('none', ''))).toContain('"Unverified"')
  expect(sections(LETTER).get('Hold')).toBe('HOLD-THIS')
})

test('the board is a state, not a diary', () => {
  expect(checkWork(WORK, null)).toBeNull()
  expect(checkWork({ ...WORK, board: '## Goal\nmod' }, null)).toContain('"## Tasks"')
  expect(checkWork({ ...WORK, board: boardWith(['- [in progress] tests 2026-10-23']) }, null)).toContain('date')
  expect(checkWork({ ...WORK, board: boardWith(['- tests']) }, null)).toContain('without a status')
  expect(checkWork({ ...WORK, board: boardWith(['- [done] tests']) }, null)).toContain('task_archive')
  const long = boardWith(Array.from({ length: 200 }, (_, i) => `- [deferred] t${i}`))
  expect(checkWork({ ...WORK, board: long }, null)).toContain('diary')
})

test('the board and the task folders match, and each task is whole', () => {
  expect(checkWork({ ...WORK, tasks: [] }, null)).toContain('without a folder')
  expect(checkWork({ ...WORK, tasks: [TESTS, { ...TESTS, name: 'extra' }] }, null)).toContain('missing from the board: extra')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, track: null }] }, null)).toContain('no track.md')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, task: '## Goal\ng' }] }, null)).toContain('title')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, task: '# T\n## Goal\ng' }] }, null)).toContain('"## Done when"')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, track: '- fix it' }] }, null)).toContain('Track items without a status')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, track: '- [done] fixed 23.10.2026' }] }, null)).toContain('date')
})

test('something must change between shifts, on the board or in a task', () => {
  expect(checkWork(WORK, WORK)).toContain('Nothing changed')
  expect(checkWork({ ...WORK, tasks: [{ ...TESTS, track: '- [done] fix the parser' }] }, WORK)).toBeNull()
})

test('archiving: done needs every item closed, the index line carries the title and the links', () => {
  expect(parseArchiveInput({ name: 'Tests!', outcome: 'done', about: 'a' })).toContain('name')
  expect(parseArchiveInput({ name: 'tests', outcome: 'later', about: 'a' })).toContain('outcome')
  const input = { name: 'tests', outcome: 'done' as const, about: 'green' }
  expect(checkArchive(input, TESTS, false)).toContain('Not every item is closed')
  expect(checkArchive({ ...input, outcome: 'dropped' }, TESTS, false)).toBeNull()
  expect(checkArchive(input, TESTS, true)).toContain('already exists')
  expect(checkArchive(input, { ...TESTS, task: null }, false)).toContain('task.md is missing')

  const linked = taskMd('Green tests', ['', 'continues: .infinity-shift/archive/old-tests/', 'continues: archive/parser'])
  const line = indexLine(input, linked)
  expect(line).toBe('- [done] [Green tests](tests/) — green; continues old-tests, parser')
  const index = addToIndex(null, line)
  expect(index).toContain('# Archive')
  expect(addToIndex(index, '- [dropped] [X](x/) — no')).toMatch(/green; continues old-tests, parser\n- \[dropped\]/)
})

test('a hint goes inside the last tool result, whatever its content is', () => {
  const first = { type: 'tool_result', content: [{ type: 'text', text: 'a' }] }
  const blocks = [first, { type: 'tool_result', content: 'b' }]
  expect(withHint(blocks, 'H')).toEqual([first, { type: 'tool_result', content: 'b\n\n<system-reminder>\nH\n</system-reminder>' }])
  expect(withHint([first], 'H')[0]).toEqual({
    type: 'tool_result',
    content: [
      { type: 'text', text: 'a' },
      { type: 'text', text: '<system-reminder>\nH\n</system-reminder>' },
    ],
  })
  expect(withHint([{ type: 'text' }], 'H')).toEqual([{ type: 'text' }])
})

test('the summarizer gets the hold and is told not to plan', () => {
  const text = compactInstructions('goal: ship the mod', '/b.md', '/l.md')
  expect(text).toContain('goal: ship the mod')
  expect(text).toContain('Do not write next steps')
})

const AT = Date.UTC(2026, 9, 23, 14, 5, 9)
const DIR = '/proj/.infinity-shift/shifts/20261023-140509'

type On = Parameters<TestBody>[1]

function stubSession(on: On, files: Map<string, string>, logs: string[] = [], tokens = () => 50000) {
  on('session.root', () => ({ value: '/proj' }))
  on('session.id', () => ({ value: 'sess' }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, tokens: tokens() }, rateLimits: [] } }))
  on('fs.write', (_$: unknown, e: { path: string; text: string }) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.read', (_$: unknown, e: { path: string }) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: text }
  })
  on('fs.exists', (_$: unknown, e: { path: string }) => ({
    value: [...files.keys()].some(path => path === e.path || path.startsWith(`${e.path}/`)),
  }))
  on('fs.list', (_$: unknown, e: { path: string }) => {
    const names = new Set<string>()
    for (const path of files.keys()) {
      if (path.startsWith(`${e.path}/`)) names.add(path.slice(e.path.length + 1).split('/')[0] ?? '')
    }
    return { value: [...names].map(name => ({ name, kind: 'dir', size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('process.run', (_$: unknown, e: { argv: readonly string[] }) => {
    const [command, from, to] = e.argv
    if (command === 'mv' && from !== undefined && to !== undefined) {
      for (const [path, text] of [...files]) {
        if (!path.startsWith(`${from}/`)) continue
        files.delete(path)
        files.set(to + path.slice(from.length), text)
      }
    }
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('ui.log', (_$: unknown, e: { text: string }) => {
    logs.push(e.text)
    return { value: undefined }
  })
  on('ui.status', (_$: unknown, e: { text: string | undefined }) => {
    logs.push(`status: ${e.text ?? ''}`)
    return { value: undefined }
  })
}

function project(): Map<string, string> {
  return new Map([
    ['/proj/.infinity-shift/letter.md', LETTER],
    ['/proj/.infinity-shift/board.md', BOARD],
    ['/proj/.infinity-shift/tasks/tests/task.md', TESTS.task ?? ''],
    ['/proj/.infinity-shift/tasks/tests/track.md', TRACK],
  ])
}

test('shiftDir names the folder by UTC time', () => {
  expect(shiftDir('/proj', AT)).toBe(DIR)
})

test('the shift tool snapshots the letter, the board and the tasks, and accepts once', async ($, on) => {
  const files = project()
  stubSession(on, files)
  mock.clock(on, { now: AT })

  const answer = await $.tool.call({
    tool: 'mcp__infinity-shift__shift',
    letter: '.infinity-shift/letter.md',
    after: 'continue',
    about: 'ABOUT',
  })
  expect(answer.deny).toBeUndefined()
  expect(String(answer.result)).toContain('Shift accepted')
  expect(files.get(`${DIR}/letter.md`)).toBe(LETTER)
  expect(files.get(`${DIR}/board.md`)).toBe(BOARD)
  expect(files.get(`${DIR}/tasks/tests/track.md`)).toBe(TRACK)
  expect(files.get(`${DIR}/about.md`)).toContain('result: pending')

  const again = await $.tool.call({
    tool: 'mcp__infinity-shift__shift',
    letter: '.infinity-shift/letter.md',
    after: 'wait',
    about: 'ABOUT',
  })
  expect(again.deny).toContain('already accepted')
})

test('the shift tool refuses without a board or a letter', async ($, on) => {
  const files = new Map([['/proj/.infinity-shift/letter.md', LETTER]])
  stubSession(on, files)
  mock.clock(on, { now: AT })

  const noBoard = await $.tool.call({
    tool: 'mcp__infinity-shift__shift',
    letter: '.infinity-shift/letter.md',
    after: 'wait',
    about: 'ABOUT',
  })
  expect(noBoard.deny).toContain('No board')
  const noLetter = await $.tool.call({ tool: 'mcp__infinity-shift__shift', letter: 'missing.md', after: 'wait', about: 'ABOUT' })
  expect(noLetter.deny).toContain('No letter')
})

test('continue: after the turn the history is let go with the hold, and the letter and the work start a turn', async ($, on) => {
  const files = project()
  const compacted: string[] = []
  const submitted: string[] = []
  stubSession(on, files)
  const clock = mock.clock(on, { now: AT })
  on('session.compact', (_$: unknown, e: { instructions?: string }) => {
    compacted.push(e.instructions ?? '')
    return { messages: [{ role: 'user', text: 'SUMMARY', toolUses: [], toolResults: [] }], tokensBefore: 120000, tokensAfter: 9000 }
  })
  on('prompt.submit', (_$: unknown, e: { text: string }) => {
    submitted.push(e.text)
    return { text: e.text }
  })
  on('turn.complete', () => ({ text: '' }))

  await $.tool.call({ tool: 'mcp__infinity-shift__shift', letter: '.infinity-shift/letter.md', after: 'continue', about: 'ABOUT' })
  await $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 1, isAborted: false, reason: 'answer' })
  expect(compacted).toEqual([])
  await clock.advance(500)

  expect(compacted.length).toBe(1)
  expect(compacted[0]).toContain('HOLD-THIS')
  expect(submitted.length).toBe(1)
  expect(submitted[0]).toContain('Shift done')
  expect(submitted[0]).toContain('fixing tests')
  expect(submitted[0]).toContain('.infinity-shift/tasks/tests/track.md')
  expect(submitted[0]).toContain('cover the archive')
  expect(files.get(`${DIR}/summary.md`)).toContain('SUMMARY')
  expect(files.get(`${DIR}/about.md`)).toContain('continuing')
  expect(files.get(`${DIR}/about.md`)).toContain('tokens: 120K → 50K')
})

test("wait: the letter rides along with the owner's next prompt, once", async ($, on) => {
  const files = project()
  const contexts: (readonly string[] | undefined)[] = []
  const logs: string[] = []
  stubSession(on, files, logs)
  const clock = mock.clock(on, { now: AT })
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [], toolResults: [] }] }))
  on('prompt.submit', (_$: unknown, e: { text: string; context?: readonly string[] }) => {
    contexts.push(e.context)
    logs.push(`entered: ${e.text}`)
    return { text: e.text }
  })
  on('turn.complete', () => ({ text: '' }))

  await $.tool.call({ tool: 'mcp__infinity-shift__shift', letter: '.infinity-shift/letter.md', after: 'wait', about: 'ABOUT' })
  await $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 1, isAborted: false, reason: 'answer' })
  await clock.advance(500)
  await $.prompt.submit({ text: 'a notification', origin: { kind: 'unclassified' }, wait: false })
  await $.prompt.submit({ text: 'owner speaks', origin: { kind: 'composer' }, wait: false })
  await $.prompt.submit({ text: 'owner again', origin: { kind: 'composer' }, wait: false })

  expect(contexts[0] ?? []).toEqual([])
  expect(String(contexts[1])).toContain('fixing tests')
  expect(String(contexts[1])).toContain('fix the parser')
  expect(contexts[2] ?? []).toEqual([])
  expect(logs).toEqual([
    expect.stringContaining('waiting for you, the letter goes with your next message'),
    expect.stringMatching(/^status: .*waiting for you/),
    'entered: a notification',
    'status: ',
    'entered: owner speaks',
    expect.stringContaining('went with your message'),
    'entered: owner again',
  ])
  expect(logs.some(line => line.includes('infinity-shift:'))).toBe(false)
  expect(files.get(`${DIR}/about.md`)).toContain('waiting for the owner')
})

test('task_archive moves the folder and writes the index line', async ($, on) => {
  const files = project()
  files.set('/proj/.infinity-shift/tasks/tests/track.md', '- [done] fix the parser')
  stubSession(on, files)

  const answer = await $.tool.call({ tool: 'mcp__infinity-shift__task_archive', name: 'tests', outcome: 'done', about: 'green' })
  expect(answer.deny).toBeUndefined()
  expect(String(answer.result)).toContain('remove "tests" from the board')
  expect(files.has('/proj/.infinity-shift/tasks/tests/task.md')).toBe(false)
  expect(files.get('/proj/.infinity-shift/archive/tests/track.md')).toBe('- [done] fix the parser')
  expect(files.get('/proj/.infinity-shift/archive/index.md')).toContain('- [done] [Green tests](tests/) — green')

  const again = await $.tool.call({ tool: 'mcp__infinity-shift__task_archive', name: 'tests', outcome: 'done', about: 'green' })
  expect(again.deny).toContain('already exists')
})

test('hints: soft every max(100K, 25%) of the limit, none right before the final, final at 80% and every 5% after', () => {
  let gauge = FRESH_GAUGE
  const step = (tokens: number | undefined, window: number, threshold?: number) => {
    const hint = shiftHint(gauge, { tokens, window, threshold })
    gauge = hint.gauge
    return hint.text
  }
  const big = (tokens: number | undefined) => step(tokens, 1_000_000)

  expect(big(undefined)).toBeNull()
  expect(big(20_000)).toBeNull()
  expect(big(200_000)).toBeNull()
  expect(big(270_000)).toContain('grown by 250K')
  expect(big(300_000)).toBeNull()
  expect(big(520_000)).toContain('grown by 500K')
  expect(big(770_000)).toBeNull()
  expect(big(800_000)).toContain('800K of 1000K used')
  expect(big(820_000)).toBeNull()
  expect(big(850_000)).toContain('850K of 1000K')

  gauge = FRESH_GAUGE
  const mid = (tokens: number) => step(tokens, 272_000)
  expect(mid(9_000)).toBeNull()
  expect(mid(109_000)).toContain('grown by 100K')
  expect(mid(209_000)).toBeNull()
  expect(mid(218_000)).toContain('218K of 272K')

  gauge = FRESH_GAUGE
  const small = (tokens: number) => step(tokens, 200_000, 128_000)
  expect(small(9_000)).toBeNull()
  expect(small(100_000)).toBeNull()
  expect(small(103_000)).toContain('103K of 128K')

  gauge = FRESH_GAUGE
  expect(big(850_000)).toBeNull()
  expect(big(855_000)).toBeNull()
  expect(big(900_000)).toContain('900K of 1000K')

  gauge = { ...FRESH_GAUGE, unassisted: true }
  expect(big(undefined)).toBeNull()
  expect(big(40_000)).toContain('without your shift')
  expect(big(41_000)).toBeNull()
})

test('a hint rides on a tool result and on a prompt, and a let-go starts a new stretch', async ($, on) => {
  const files = project()
  let tokens = 20000
  const prompts: (readonly string[] | undefined)[] = []
  stubSession(on, files, [], () => tokens)
  on('prompt.submit', (_$: unknown, e: { text: string; context?: readonly string[] }) => {
    prompts.push(e.context)
    return { text: e.text }
  })
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [], toolResults: [] }] }))
  const toolResult = () =>
    $.session.append({
      message: { type: 'user', role: 'user', content: [{ type: 'tool_result', tool_use_id: 'x', content: 'ok' }] },
      door: 'tool-result',
      origin: { kind: 'tool', tool: 'Bash' },
      uuid: 'u',
    })

  await toolResult()
  tokens = 165000
  const hinted = (await toolResult()).message?.content
  expect(hinted?.length).toBe(1)
  expect(JSON.stringify(hinted?.[0])).toContain('"content":"ok\\n\\n<system-reminder>\\nShift hint')
  tokens = 170000
  expect(JSON.stringify(await toolResult())).not.toContain('Shift hint')
  tokens = 175000
  await $.prompt.submit({ text: 'owner', origin: { kind: 'composer' }, wait: false })
  expect(String(prompts[0])).toContain('175K of 200K used')

  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'long history', toolUses: [], toolResults: [] }] })
  tokens = 30000
  await $.prompt.submit({ text: 'owner', origin: { kind: 'composer' }, wait: false })
  expect(String(prompts[1])).toContain('without your shift')
})

test('the shift tool refuses a bad call', async $ => {
  const answer = await $.tool.call({ tool: 'mcp__infinity-shift__shift', letter: '', after: 'wait', about: 'ABOUT' })
  expect(answer.deny).toContain('letter')
})

test('history: count defaults to 10, entries read oldest first, the last one shows what is open', () => {
  expect(parseHistoryCount({})).toBe(10)
  expect(parseHistoryCount({ count: 0 })).toContain('count')
  const seg = { done: ['tests: webhooks'], dropped: [], archived: ['[done] [Old](old/) — finished'], open: ['[in progress] refunds'] }
  const about = renderAbout({ about: 'webhooks ready', sessionId: 's', at: 0, after: 'wait', segment: seg, result: 'pending' })
  expect(frontmatter(about).get('description')).toBe('webhooks ready')
  const text = renderHistory(
    [
      { name: 'a', about: null },
      { name: 'b', about },
    ],
    7,
  )
  expect(text).toContain('2 of 7')
  expect(text).toContain('### b · wait · pending')
  expect(text).toContain('Done: tests: webhooks')
  expect(text).toContain('Archived: [done] [Old](old/) — finished')
  expect(text).toContain('Open: [in progress] refunds')
  expect(renderHistory([], 0)).toContain('No shifts')
})

test('the history and guide tools answer', async ($, on) => {
  const files = project()
  stubSession(on, files)
  const clock = mock.clock(on, { now: AT })
  on('session.compact', () => ({ messages: [{ role: 'user', text: 'summary', toolUses: [], toolResults: [] }] }))
  on('prompt.submit', (_$: unknown, e: { text: string }) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))

  const guide = await $.tool.call({ tool: 'mcp__infinity-shift__shift_guide' })
  expect(String(guide.result)).toContain('strict structure')

  await $.tool.call({ tool: 'mcp__infinity-shift__shift', letter: '.infinity-shift/letter.md', after: 'wait', about: 'ABOUT' })
  await $.turn.complete({ turnId: 't1', answer: 'ok', durationMs: 1, isAborted: false, reason: 'answer' })
  await clock.advance(500)
  const history = await $.tool.call({ tool: 'mcp__infinity-shift__shift_history' })
  expect(String(history.result)).toContain('20261023-140509')
  expect(String(history.result)).toContain('ABOUT')
})

test('/shift-resume hands the last letter, the board and the tasks in progress to a fresh session', async ($, on) => {
  const files = project()
  files.set(`${DIR}/letter.md`, LETTER)
  const submitted: string[] = []
  stubSession(on, files)
  const clock = mock.clock(on, { now: AT })
  on('prompt.submit', (_$: unknown, e: { text: string }) => {
    submitted.push(e.text)
    return { text: e.text }
  })

  const run = await $.command.run({
    command: 'shift-resume',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(run.text).toContain('20261023-140509')
  await clock.advance(200)
  expect(submitted.length).toBe(1)
  expect(submitted[0]).toContain('fixing tests')
  expect(submitted[0]).toContain('## Goal')
  expect(submitted[0]).toContain('# Green tests')
})
