import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function setupDom() {
  document.body.innerHTML = `
    <div id="header"></div>
    <div id="timer"></div>
    <div id="startScreen"></div>
    <div id="questionScreen"></div>
    <div id="summaryScreen"></div>
    <select id="corpusSelect">
      <option data-type="json" value="/data/test.json" selected>JSON</option>
    </select>
    <input id="corpusFileInput" type="file" />
    <select id="testOrderSelect">
      <option value="progressive" selected>progressive</option>
      <option value="random">random</option>
    </select>
    <button id="loadCorpusBtn"></button>
    <button id="startBtn"></button>
    <div id="corpusStatus"></div>
    <div id="stopBtn"></div>
    <div id="headerRestartBtn"></div>
    <div id="loadError" class="hidden"></div>
    <div id="questionCounter"></div>
    <div id="questionContent"></div>
    <div id="answers"></div>
    <div id="progressFill"></div>
    <div id="timingPosition"></div>
    <div id="timingPositionText"></div>
    <div id="summaryStats"></div>
    <div id="categoryControls"></div>
    <div id="summaryContainer"></div>
    <div id="modalBackdrop"></div>
    <button id="prevReviewBtn"></button>
    <button id="nextReviewBtn"></button>
    <button id="closeModalBtn"></button>
    <button id="googleSearchBtn"></button>
    <button id="copyPromptBtn"></button>
    <div id="copyStatus"></div>
    <div id="modalTitle"></div>
    <div id="modalBadges"></div>
    <div id="modalQuestionContent"></div>
    <div id="modalAnswers"></div>
  `
}

function makeQuestion(index, category = 'Numeric / Logic', extras = {}) {
  return {
    id: `Q${index}`,
    category,
    type: 'text',
    prompt: `Prompt ${index}`,
    choices: ['A', 'B', 'C', 'D'],
    answer: 'B',
    ...extras,
  }
}

describe('parsing.js behavior coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDom()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads selected corpus from fetch and updates UI status', async () => {
    const payload = [
      makeQuestion(1, 'Numeric / Logic'),
      makeQuestion(2, 'Verbal'),
      makeQuestion(3, 'Spatial'),
      makeQuestion(4, 'Numeric / Logic'),
    ]

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(payload) }))
    )

    const parsing = await import('../utils/parsing.js')
    const state = await import('../utils/state.js')

    await parsing.loadSelectedCorpus()

    expect(state.questions.length).toBe(4)
    expect(state.els.startBtn.disabled).toBe(false)
    expect(state.els.corpusStatus.textContent).toContain('Loaded 4 questions')
  })

  it('loads from uploaded file branch when file input has content', async () => {
    const fileLike = {
      name: 'custom.json',
      text: async () => JSON.stringify([makeQuestion(1)]),
    }

    const fileInput = document.getElementById('corpusFileInput')
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      get: () => [fileLike],
    })

    const parsing = await import('../utils/parsing.js')
    const state = await import('../utils/state.js')

    await parsing.loadSelectedCorpus()

    expect(state.questions.length).toBe(1)
    expect(state.els.startBtn.disabled).toBe(false)
  })

  it('handles load errors and shows sanitized message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }))
    )

    const parsing = await import('../utils/parsing.js')
    const state = await import('../utils/state.js')

    await parsing.loadSelectedCorpus()

    expect(state.questions.length).toBe(0)
    expect(state.els.startBtn.disabled).toBe(true)
    expect(state.els.loadError.classList.contains('hidden')).toBe(false)
    expect(state.els.loadError.innerHTML).toContain('Unable to load corpus')
    expect(state.els.loadError.innerHTML).toContain('HTTP 404')
  })

  it('covers difficulty helpers and rationale branches', async () => {
    const parsing = await import('../utils/parsing.js')

    const json = JSON.stringify([
      {
        prompt: 'Test',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
        difficulty: 2,
      },
    ])

    const result = parsing.parseJsonCorpus(json)
    expect(result[0].difficulty).toBe(2)
    expect(result[0].difficultyRationale).toBe('')
  })

  it('covers parseTextCorpus error branch for missing choices', async () => {
    const parsing = await import('../utils/parsing.js')

    const badText = `1. Category\nPrompt only no choices\n\nANSWER KEY: A`
    expect(() => parsing.parseTextCorpus(badText)).toThrow('missing choices')
  })
})