import { beforeEach, describe, expect, it, vi } from 'vitest'

function setupDom() {
  document.body.innerHTML = `
    <div id="header"></div>
    <div id="timer"></div>
    <div id="startScreen"></div>
    <div id="questionScreen"><div class="card"></div></div>
    <div id="summaryScreen"></div>
    <select id="corpusSelect"></select>
    <input id="corpusFileInput" type="file" />
    <select id="testOrderSelect"></select>
    <button id="loadCorpusBtn"></button>
    <button id="startBtn"></button>
    <div id="corpusStatus"></div>
    <div id="stopBtn"></div>
    <div id="headerRestartBtn"></div>
    <div id="loadError"></div>
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
    <div class="question-text-frame"></div>
    <div class="modal"><div class="modal-question-frame"></div></div>
  `
}

function question(prompt = 'Question text', visual = null) {
  return {
    id: 'Q1',
    category: 'Spatial',
    prompt,
    choices: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    visual,
  }
}

describe('rendering.js behavior coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    setupDom()
  })

  it('renders question and choice content with escaping', async () => {
    const rendering = await import('../utils/rendering.js')

    const target = document.createElement('div')
    rendering.renderQuestionContent(question('x < y & z', null), target)
    expect(target.innerHTML).toContain('x &lt; y &amp; z')
    expect(target.innerHTML).toContain('question-text')

    const withVisual = rendering.renderChoiceContent({
      text: 'A < B',
      visual: { kind: 'dot-cell', position: 'tl' },
    })
    expect(withVisual).toContain('&lt;')
    expect(withVisual).toContain('<svg')
  })

  it('covers renderVisual switch branches', async () => {
    const rendering = await import('../utils/rendering.js')

    expect(rendering.renderVisual(null)).toBe('')
    expect(rendering.renderVisual({ kind: 'polygon', sides: 6 })).toContain('<polygon')
    expect(rendering.renderVisual({ kind: 'basic-shape', shape: 'square', filled: true })).toContain('<rect')
    expect(rendering.renderVisual({ kind: 'arrow', direction: 'E' })).toContain('rotate(90)')
    expect(rendering.renderVisual({ kind: 'dot-cell', position: 'br' })).toContain('<circle')
    expect(rendering.renderVisual({ kind: 'matrix-sides', startSides: 4 })).toContain('?')
    expect(rendering.renderVisual({ kind: 'dot-sequence', positions: ['tl', 'tr'] })).toContain('Frame 1')
    expect(rendering.renderVisual({ kind: 'arrow-sequence', directions: ['N', 'W'] })).toContain('Frame 2')
    expect(
      rendering.renderVisual({
        kind: 'odd-one-out',
        items: [
          { shape: 'circle', filled: false },
          { shape: 'triangle', filled: true },
        ],
      })
    ).toContain('Figure 1')
    expect(rendering.renderVisual({ kind: 'shading-matrix' })).toContain('?')
    expect(rendering.renderVisual({ kind: 'unknown' })).toBe('')
  })

  it('covers primitive SVG helpers', async () => {
    const rendering = await import('../utils/rendering.js')

    expect(rendering.svgWrap('<g/>', 10, 20)).toContain('viewBox="0 0 10 20"')
    expect(rendering.polygonPoints(3, 10, 10, 5).split(' ').length).toBe(3)
    expect(rendering.svgPolygon(5)).toContain('<polygon')

    expect(rendering.svgBasic('circle', false)).toContain('<ellipse')
    expect(rendering.svgBasic('oval', true)).toContain('<ellipse')
    expect(rendering.svgBasic('square', true)).toContain('<rect')
    expect(rendering.svgBasic('diamond', false)).toContain('<polygon')
    expect(rendering.svgBasic('triangle', true)).toContain('<polygon')
    expect(rendering.svgBasic('pentagon', false)).toContain('<polygon')

    expect(rendering.svgArrow('S')).toContain('rotate(180)')
    expect(rendering.svgArrow('X')).toContain('rotate(0)')

    expect(rendering.svgDotCell('tl')).toContain('cx="22.5"')
    expect(rendering.svgDotCell('unknown')).toContain('cx="45"')

    expect(rendering.svgSequence([rendering.svgArrow('N')], null)).toContain('viewBox="0 0 110 90"')
    expect(rendering.svgSequence([rendering.svgArrow('N')], ['L1'])).toContain('L1')

    expect(rendering.svgMatrixSides(3)).toContain('?')
    expect(rendering.svgShadingMatrix('diamond')).toContain('?')
  })

  it('measures frame and updates question frame height', async () => {
    const rendering = await import('../utils/rendering.js')
    const state = await import('../utils/state.js')

    const measured = rendering.measureFrame([question('a'), question('b')], 300)
    expect(measured).toBeGreaterThan(0)

    state.clearActiveQuestions()
    state.clearQuestions()

    rendering.updateQuestionFrameHeightForActiveTest()
    const emptyValue = document.documentElement.style.getPropertyValue('--question-frame-height')
    expect(emptyValue).toBe('')

    state.setQuestions([question('fallback question', { kind: 'polygon', sides: 4 })])
    rendering.updateQuestionFrameHeightForActiveTest()
    const valueWithQuestions = document.documentElement.style.getPropertyValue('--question-frame-height')
    expect(valueWithQuestions).toMatch(/px$/)

    state.setActiveQuestions([question('active question', { kind: 'arrow', direction: 'N' })])
    rendering.updateQuestionFrameHeightForActiveTest()
    const valueWithActive = document.documentElement.style.getPropertyValue('--question-frame-height')
    expect(valueWithActive).toMatch(/px$/)
  })

  it('updates modal frame height from both review index sources', async () => {
    const rendering = await import('../utils/rendering.js')
    const stateModule = await import('../utils/state.js')

    stateModule.clearActiveQuestions()
    stateModule.setActiveQuestions([
      question('q1', { kind: 'dot-cell', position: 'tl' }),
      question('q2', { kind: 'dot-cell', position: 'tr' }),
    ])

    stateModule.state.activeReviewIndexes = []
    stateModule.state.results = [{ questionIndex: 0 }, { questionIndex: 1 }]

    rendering.updateModalQuestionFrameHeightForReviewSet()
    const firstValue = document.documentElement.style.getPropertyValue('--modal-question-frame-height')
    expect(firstValue).toMatch(/px$/)

    stateModule.state.activeReviewIndexes = [1]
    rendering.updateModalQuestionFrameHeightForReviewSet()
    const secondValue = document.documentElement.style.getPropertyValue('--modal-question-frame-height')
    expect(secondValue).toMatch(/px$/)

    stateModule.state.activeReviewIndexes = [99]
    stateModule.state.results = []
    rendering.updateModalQuestionFrameHeightForReviewSet()
    const thirdValue = document.documentElement.style.getPropertyValue('--modal-question-frame-height')
    expect(thirdValue).toMatch(/px$/)
  })
})
