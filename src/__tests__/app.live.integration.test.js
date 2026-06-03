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
        writeText: vi.fn(async () => { }),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('bootstraps, loads corpus, and enables start', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    expect(stateModule.questions.length).toBeGreaterThan(0)
    expect(stateModule.els.startBtn.disabled).toBe(false)
    expect(stateModule.els.corpusStatus.textContent).toContain('Loaded')
  })

  it('starts test and records answer via real click', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
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

  it('does not start when there are no loaded questions', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.clearQuestions()
    stateModule.els.startBtn.click()

    expect(stateModule.activeQuestions).toEqual([])
    expect(stateModule.els.questionScreen.classList.contains('hidden')).toBe(true)
    expect(stateModule.state.intervalId).toBe(null)
  })

  it('handles keyboard answer selection and stop flow', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
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

  it('ignores invalid/blocked keypresses and handles missing answer button', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    expect(stateModule.state.results.length).toBe(0)

    stateModule.els.startBtn.click()

    stateModule.state.isAdvancing = true
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    expect(stateModule.state.results.length).toBe(0)

    stateModule.state.isAdvancing = false
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z' }))
    expect(stateModule.state.results.length).toBe(0)

    stateModule.els.answers.innerHTML = ''
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D' }))
    expect(stateModule.state.results.length).toBe(0)
  })

  it('closes modal on backdrop click and Escape key', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    const summaryItem = stateModule.els.summaryContainer.querySelector('.summary-item')
    expect(summaryItem).toBeTruthy()
    summaryItem.click()

    expect(stateModule.els.modalBackdrop.classList.contains('hidden')).toBe(false)

    stateModule.els.modalBackdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(stateModule.els.modalBackdrop.classList.contains('hidden')).toBe(true)

    summaryItem.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(stateModule.els.modalBackdrop.classList.contains('hidden')).toBe(true)
  })

  it('navigates review modal with ArrowLeft and ArrowRight', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    const items = stateModule.els.summaryContainer.querySelectorAll('.summary-item')
    expect(items.length).toBeGreaterThan(2)

    items[1].click()
    const before = stateModule.state.currentReviewPosition

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(stateModule.state.currentReviewPosition).toBeGreaterThanOrEqual(before)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(stateModule.state.currentReviewPosition).toBeGreaterThanOrEqual(0)
  })

  it('handles Google search and copy prompt actions', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    const summaryItem = stateModule.els.summaryContainer.querySelector('.summary-item')
    summaryItem.click()

    stateModule.els.googleSearchBtn.click()
    expect(window.open).toHaveBeenCalled()

    stateModule.els.copyPromptBtn.click()
    await flushAsyncWork()
    expect(navigator.clipboard.writeText).toHaveBeenCalled()

    vi.advanceTimersByTime(1900)
    expect(stateModule.els.copyStatus.textContent).toBe('')
  })

  it('handles null review payload and copy fallback failure path', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.googleSearchBtn.click()
    expect(window.open).not.toHaveBeenCalled()

    stateModule.els.copyPromptBtn.click()
    await flushAsyncWork()
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()

    stateModule.els.startBtn.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    const summaryItem = stateModule.els.summaryContainer.querySelector('.summary-item')
    summaryItem.click()

    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'))

    const hadExecCommand = typeof document.execCommand === 'function'
    const originalExecCommand = document.execCommand
    document.execCommand = vi.fn(() => {
      throw new Error('execCommand failed')
    })

    stateModule.els.copyPromptBtn.click()
    await flushAsyncWork()

    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(stateModule.els.copyStatus.textContent).toBe('Copy failed.')

    vi.advanceTimersByTime(1900)
    expect(stateModule.els.copyStatus.textContent).toBe('Copy failed.')

    if (hadExecCommand) {
      document.execCommand = originalExecCommand
    } else {
      delete document.execCommand
    }
  })

  it('updates timer chimes, timeout finish, and category filtering', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()

    stateModule.state.questionStartedAt = Date.now() - 46_000
    stateModule.state.testStartedAt = Date.now() - (stateModule.TEST_SECONDS + 1) * 1000
    vi.advanceTimersByTime(120)

    expect(stateModule.state.chimed18).toBe(true)
    expect(stateModule.state.chimed45).toBe(true)
    expect(stateModule.els.summaryScreen.classList.contains('hidden')).toBe(false)
    expect(stateModule.state.results.length).toBe(stateModule.activeQuestions.length)

    const verbalBtn = Array.from(stateModule.els.categoryControls.querySelectorAll('.category-btn')).find(
      (btn) => btn.textContent === 'Verbal'
    )
    expect(verbalBtn).toBeTruthy()

    verbalBtn.click()
    expect(stateModule.state.activeCategory).toBe('Verbal')
    expect(stateModule.els.summaryContainer.textContent).toContain('not skipped avg')
  })

  it('updates frame heights on window resize in question and modal contexts', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()
    window.dispatchEvent(new Event('resize'))

    const questionHeight = document.documentElement.style.getPropertyValue('--question-frame-height')
    expect(questionHeight).toMatch(/px$/)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    const summaryItem = stateModule.els.summaryContainer.querySelector('.summary-item')
    summaryItem.click()
    window.dispatchEvent(new Event('resize'))

    const modalHeight = document.documentElement.style.getPropertyValue('--modal-question-frame-height')
    expect(modalHeight).toMatch(/px$/)
  })

  it('restarts test and resets UI state', async () => {
    const stateModule = await import('../utils/state.js')
    await import('../utils/app.js')
    await flushAsyncWork()

    stateModule.els.startBtn.click()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
    vi.advanceTimersByTime(stateModule.ANSWER_ADVANCE_DELAY_MS + 10)
    stateModule.els.stopBtn.click()

    expect(stateModule.els.summaryScreen.classList.contains('hidden')).toBe(false)
    stateModule.els.headerRestartBtn.click()

    expect(stateModule.activeQuestions.length).toBe(0)
    expect(stateModule.state.results).toEqual([])
    expect(stateModule.els.startScreen.classList.contains('hidden')).toBe(false)
    expect(stateModule.els.summaryScreen.classList.contains('hidden')).toBe(true)
    expect(stateModule.els.timer.textContent).toBe('15:00')
  })
})
