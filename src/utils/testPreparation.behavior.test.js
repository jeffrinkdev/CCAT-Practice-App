import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function setupDom() {
  document.body.innerHTML = `
    <select id="corpusSelect">
      <option data-type="json" value="/data/test.json" selected>JSON</option>
    </select>
    <input id="corpusFileInput" type="file" />
    <select id="testOrderSelect">
      <option value="progressive" selected>progressive</option>
      <option value="random">random</option>
    </select>
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

describe('testPreparation.js behavior coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDom()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('covers difficulty helpers and rationale branches', async () => {
    const preparation = await import('./testPreparation.js')

    const qNumeric = { category: 'Numeric / Logic', prompt: 'workers working together', visual: null }
    const qVerbal = { category: 'Verbal', prompt: 'What is the opposite relationship?', visual: null }
    const qSpatial = { category: 'Spatial', prompt: 'x', visual: { kind: 'dot-sequence' } }
    const qGeneral = { category: 'General', prompt: 'x', visual: null }

    expect(preparation.estimateDifficulty(qNumeric)).toBe(7)
    expect(preparation.estimateDifficulty(qVerbal)).toBe(5)
    expect(preparation.estimateDifficulty(qSpatial)).toBe(5)
    expect(preparation.estimateDifficulty(qGeneral)).toBe(4)

    expect(preparation.difficultyClass(8)).toBe('diff-very-high')
    expect(preparation.difficultyClass(6)).toBe('diff-high')
    expect(preparation.difficultyClass(4)).toBe('diff-mid')
    expect(preparation.difficultyClass(1)).toBe('diff-low')

    expect(preparation.difficultyLabel(5)).toBe('Difficulty 5/10')
    expect(preparation.difficultyRationale(qSpatial)).toContain('Visual template')
    expect(preparation.difficultyRationale(qNumeric)).toContain('Numeric reasoning')
    expect(preparation.difficultyRationale(qVerbal)).toContain('Verbal reasoning')
    expect(preparation.difficultyRationale(qGeneral)).toContain('General heuristic')

    const qNeedsDifficulty = { ...qNumeric, difficulty: null, difficultyRationale: '' }
    expect(preparation.ensureDifficulty(qNeedsDifficulty)).toBeGreaterThan(0)
    expect(preparation.difficultyBadge(qNeedsDifficulty)).toContain('difficulty-badge')
  })

  it('covers clone/shuffle and buildTestQuestions for both ordering modes', async () => {
    const parsing = await import('./parsing.js')
    const preparation = await import('./testPreparation.js')
    const state = await import('./state.js')

    const corpus = []
    for (let i = 1; i <= 20; i += 1) corpus.push(makeQuestion(i, 'Numeric / Logic', { difficulty: 3 + (i % 4) }))
    for (let i = 21; i <= 40; i += 1) corpus.push(makeQuestion(i, 'Verbal', { difficulty: 3 + (i % 4) }))
    for (let i = 41; i <= 60; i += 1) corpus.push(makeQuestion(i, 'Spatial', { difficulty: 3 + (i % 4), visual: { kind: 'odd-one-out' } }))

    state.setQuestions(parsing.parseJsonCorpus(JSON.stringify(corpus)))

    const cloned = preparation.cloneQuestionWithShuffledChoices({
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
    const progressive = preparation.buildTestQuestions()
    expect(progressive).toHaveLength(50)
    for (let i = 1; i < progressive.length; i += 1) {
      expect(progressive[i - 1].difficulty).toBeLessThanOrEqual(progressive[i].difficulty)
    }

    state.els.testOrderSelect.value = 'random'
    const random = preparation.buildTestQuestions()
    expect(random).toHaveLength(50)
  })
})