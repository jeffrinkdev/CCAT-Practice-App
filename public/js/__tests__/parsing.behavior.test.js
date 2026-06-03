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

    const parsing = await import('../parsing.js')
    const state = await import('../state.js')

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

    const parsing = await import('../parsing.js')
    const state = await import('../state.js')

    await parsing.loadSelectedCorpus()

    expect(state.questions.length).toBe(1)
    expect(state.els.startBtn.disabled).toBe(false)
  })

  it('handles load errors and shows sanitized message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, text: async () => '' }))
    )

    const parsing = await import('../parsing.js')
    const state = await import('../state.js')

    await parsing.loadSelectedCorpus()

    expect(state.questions.length).toBe(0)
    expect(state.els.startBtn.disabled).toBe(true)
    expect(state.els.loadError.classList.contains('hidden')).toBe(false)
    expect(state.els.loadError.innerHTML).toContain('Unable to load corpus')
    expect(state.els.loadError.innerHTML).toContain('HTTP 404')
  })

  it('covers difficulty helpers and rationale branches', async () => {
    const parsing = await import('../parsing.js')

    const qNumeric = { category: 'Numeric / Logic', prompt: 'workers working together', visual: null }
    const qVerbal = { category: 'Verbal', prompt: 'What is the opposite relationship?', visual: null }
    const qSpatial = { category: 'Spatial', prompt: 'x', visual: { kind: 'dot-sequence' } }
    const qGeneral = { category: 'General', prompt: 'x', visual: null }

    expect(parsing.estimateDifficulty(qNumeric)).toBe(7)
    expect(parsing.estimateDifficulty(qVerbal)).toBe(5)
    expect(parsing.estimateDifficulty(qSpatial)).toBe(5)
    expect(parsing.estimateDifficulty(qGeneral)).toBe(4)

    expect(parsing.difficultyClass(8)).toBe('diff-very-high')
    expect(parsing.difficultyClass(6)).toBe('diff-high')
    expect(parsing.difficultyClass(4)).toBe('diff-mid')
    expect(parsing.difficultyClass(1)).toBe('diff-low')

    expect(parsing.difficultyLabel(5)).toBe('Difficulty 5/10')
    expect(parsing.difficultyRationale(qSpatial)).toContain('Visual template')
    expect(parsing.difficultyRationale(qNumeric)).toContain('Numeric reasoning')
    expect(parsing.difficultyRationale(qVerbal)).toContain('Verbal reasoning')
    expect(parsing.difficultyRationale(qGeneral)).toContain('General heuristic')

    const qNeedsDifficulty = { ...qNumeric, difficulty: null, difficultyRationale: '' }
    expect(parsing.ensureDifficulty(qNeedsDifficulty)).toBeGreaterThan(0)
    expect(parsing.difficultyBadge(qNeedsDifficulty)).toContain('difficulty-badge')
  })

  it('covers clone/shuffle and buildTestQuestions for both ordering modes', async () => {
    const parsing = await import('../parsing.js')
    const state = await import('../state.js')

    const corpus = []
    for (let i = 1; i <= 20; i += 1) corpus.push(makeQuestion(i, 'Numeric / Logic', { difficulty: 3 + (i % 4) }))
    for (let i = 21; i <= 40; i += 1) corpus.push(makeQuestion(i, 'Verbal', { difficulty: 3 + (i % 4) }))
    for (let i = 41; i <= 60; i += 1) corpus.push(makeQuestion(i, 'Spatial', { difficulty: 3 + (i % 4), visual: { kind: 'odd-one-out' } }))

    state.setQuestions(parsing.parseJsonCorpus(JSON.stringify(corpus)))

    const cloned = parsing.cloneQuestionWithShuffledChoices({
      id: 'T',
      category: 'Numeric / Logic',
      prompt: 'x',
      choices: ['A1', 'B1', 'C1', 'D1'],
      correctIndex: 1,
    })

    expect(cloned.choices).toHaveLength(4)
    expect(cloned.correctIndex).toBeGreaterThanOrEqual(0)
    expect(cloned.correctIndex).toBeLessThan(4)

    state.els.testOrderSelect.value = 'progressive'
    const progressive = parsing.buildTestQuestions()
    expect(progressive).toHaveLength(50)
    for (let i = 1; i < progressive.length; i += 1) {
      expect(progressive[i - 1].difficulty).toBeLessThanOrEqual(progressive[i].difficulty)
    }

    state.els.testOrderSelect.value = 'random'
    const random = parsing.buildTestQuestions()
    expect(random).toHaveLength(50)
  })

  it('covers parseTextCorpus error branch for missing choices', async () => {
    const parsing = await import('../parsing.js')

    const badText = `1. Category\nPrompt only no choices\n\nANSWER KEY: A`
    expect(() => parsing.parseTextCorpus(badText)).toThrow('missing choices')
  })
})
