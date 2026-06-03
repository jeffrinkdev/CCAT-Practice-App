import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function buildHtmlFixture() {
  return `
    <div id="header" class="hidden">
      <div id="timer"></div>
      <button id="stopBtn" class="hidden" type="button">Stop</button>
      <button id="headerRestartBtn" class="hidden" type="button">Restart</button>
    </div>

    <section id="startScreen">
      <select id="corpusSelect"></select>
      <input id="corpusFileInput" type="file" />
      <select id="testOrderSelect"><option value="progressive" selected>Progressive</option></select>
      <button id="loadCorpusBtn" type="button">Load</button>
      <button id="startBtn" type="button" disabled>Load a corpus first</button>
      <div id="corpusStatus"></div>
      <div id="loadError" class="hidden"></div>
    </section>

    <section id="questionScreen" class="hidden">
      <div class="card">
        <div id="questionCounter"></div>
        <div id="questionContent" class="question-content"></div>
        <div id="answers"></div>
        <div id="progressFill"></div>
        <div id="timingPosition"></div>
        <div id="timingPositionText"></div>
      </div>
    </section>

    <section id="summaryScreen" class="hidden">
      <div id="summaryStats"></div>
      <div id="categoryControls"></div>
      <div id="summaryContainer"></div>
    </section>

    <div id="modalBackdrop" class="hidden">
      <div class="modal">
        <button id="prevReviewBtn" type="button">Prev</button>
        <button id="nextReviewBtn" type="button">Next</button>
        <button id="closeModalBtn" type="button">Close</button>
        <button id="googleSearchBtn" type="button">Google</button>
        <button id="copyPromptBtn" type="button">Copy</button>
        <div id="copyStatus"></div>
        <div id="modalTitle"></div>
        <div id="modalBadges"></div>
        <div id="modalQuestionContent"></div>
        <div id="modalAnswers"></div>
        <div class="modal-question-frame"></div>
      </div>
    </div>
  `
}

function buildCorpus(count = 60) {
  const categories = ['Numeric / Logic', 'Verbal', 'Spatial']
  return Array.from({ length: count }, (_, idx) => ({
    id: `Q${idx + 1}`,
    category: categories[idx % 3],
    type: 'text',
    prompt: `Prompt ${idx + 1}?`,
    choices: ['A', 'B', 'C', 'D'],
    answer: 'B',
    difficulty: 4,
  }))
}

async function flushAsyncWork() {
  await Promise.resolve()
  await Promise.resolve()
}

function buildTextCorpus(questionCount = 6) {
  const categories = ['Numeric / Logic', 'Verbal', 'Spatial']
  const blocks = []
  const answers = []

  for (let i = 1; i <= questionCount; i += 1) {
    blocks.push(`${i}. ${categories[(i - 1) % 3]}\nPrompt ${i}?\nA) Choice A\nB) Choice B\nC) Choice C\nD) Choice D`)
    answers.push('B')
  }

  return `${blocks.join('\n\n')}\n\nANSWER KEY: ${answers.join(', ')}`
}

describe('Live App Integration', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    document.body.innerHTML = buildHtmlFixture()

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => ({
        ok: true,
        text: async () =>
          String(url).endsWith('.json') ? JSON.stringify(buildCorpus()) : buildTextCorpus(),
      }))
    )

    vi.stubGlobal('open', vi.fn())

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => {}),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('bootstraps, loads corpus, and enables start', async () => {
    const stateModule = await import('../state.js')
    await import('../app.js')
    await flushAsyncWork()

    expect(stateModule.questions.length).toBeGreaterThan(0)
    expect(stateModule.els.startBtn.disabled).toBe(false)
    expect(stateModule.els.corpusStatus.textContent).toContain('Loaded')
  })

  it('starts test and records answer via real click', async () => {
    const stateModule = await import('../state.js')
    await import('../app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()

    expect(stateModule.els.questionScreen.classList.contains('hidden')).toBe(false)
    expect(stateModule.activeQuestions.length).toBeGreaterThan(0)

    const firstAnswer = stateModule.els.answers.querySelector('.answer-btn')
    expect(firstAnswer).toBeTruthy()

    firstAnswer.click()
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)

    expect(stateModule.state.results.length).toBe(1)
    expect(stateModule.state.currentIndex).toBe(1)
  })

  it('handles keyboard answer selection and stop flow', async () => {
    const stateModule = await import('../state.js')
    await import('../app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)

    expect(stateModule.state.results.length).toBe(1)

    stateModule.els.stopBtn.click()

    expect(stateModule.state.stoppedEarly).toBe(true)
    expect(stateModule.els.summaryScreen.classList.contains('hidden')).toBe(false)
    expect(stateModule.els.questionScreen.classList.contains('hidden')).toBe(true)
  })
})
