import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

const initAppMock = vi.fn()

vi.mock('../utils/app.js', () => ({
  initApp: (...args) => initAppMock(...args),
}))

function flush() {
  return Promise.resolve()
}

describe('App React integration', () => {
  let container
  let root

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
      root = null
    }

    container?.remove()
    container = null
  })

  it('wires top-level actions to controller methods', async () => {
    let setStartView

    const controller = {
      loadCorpus: vi.fn(),
      handleCorpusChange: vi.fn(),
      startTest: vi.fn(),
      stopTest: vi.fn(),
      restartTest: vi.fn(),
      handleAnswer: vi.fn(),
      handleCategoryChange: vi.fn(),
      openReviewModal: vi.fn(),
      prevReview: vi.fn(),
      nextReview: vi.fn(),
      closeModal: vi.fn(),
      googleSearch: vi.fn(),
      copyPrompt: vi.fn(),
    }

    initAppMock.mockImplementation((doc, onShell, onQuestion, onSummary, onModal, onStart) => {
      setStartView = onStart
      return controller
    })
    const { default: App } = await import('../App.jsx')

    await act(async () => {
      root = createRoot(container)
      root.render(<App />)
      await flush()
    })

    await act(async () => {
      setStartView({
        startBtnDisabled: false,
        startBtnLabel: 'Start Test',
      })
      await flush()
    })

    container.querySelector('#loadCorpusBtn')?.click()
    container.querySelector('#corpusSelect')?.dispatchEvent(new Event('change', { bubbles: true }))
    container.querySelector('#startBtn')?.click()
    container.querySelector('#stopBtn')?.click()
    container.querySelector('#headerRestartBtn')?.click()

    expect(controller.loadCorpus).toHaveBeenCalledTimes(1)
    expect(controller.handleCorpusChange).toHaveBeenCalledTimes(1)
    expect(controller.startTest).toHaveBeenCalledTimes(1)
    expect(controller.stopTest).toHaveBeenCalledTimes(1)
    expect(controller.restartTest).toHaveBeenCalledTimes(1)
  })

  it('renders controller-driven question, summary, and modal interactions', async () => {
    let setShellState
    let setQuestionView
    let setSummaryView
    let setModalView
    let setStartView

    const controller = {
      loadCorpus: vi.fn(),
      handleCorpusChange: vi.fn(),
      startTest: vi.fn(),
      stopTest: vi.fn(),
      restartTest: vi.fn(),
      handleAnswer: vi.fn(),
      handleCategoryChange: vi.fn(),
      openReviewModal: vi.fn(),
      prevReview: vi.fn(),
      nextReview: vi.fn(),
      closeModal: vi.fn(),
      googleSearch: vi.fn(),
      copyPrompt: vi.fn(),
    }

    initAppMock.mockImplementation((doc, onShell, onQuestion, onSummary, onModal, onStart) => {
      setShellState = onShell
      setQuestionView = onQuestion
      setSummaryView = onSummary
      setModalView = onModal
      setStartView = onStart
      return controller
    })

    const { default: App } = await import('../App.jsx')

    await act(async () => {
      root = createRoot(container)
      root.render(<App />)
      await flush()
    })

    await act(async () => {
      setStartView({
        startBtnDisabled: false,
        startBtnLabel: 'Start Test',
        corpusStatus: 'Loaded 3 questions from corpus',
      })
      setShellState({
        headerHidden: false,
        startScreenHidden: true,
        questionScreenHidden: false,
      })
      setQuestionView({
        counterText: 'Question 1 of 3 · Verbal',
        questionHtml: '<p>Select the best option.</p>',
        choices: [
          { index: 0, label: 'A', contentHtml: '<span>Alpha</span>' },
          { index: 1, label: 'B', contentHtml: '<span>Bravo</span>' },
        ],
      })
      await flush()
    })

    expect(container.querySelector('#questionCounter')?.textContent).toContain('Question 1 of 3')
    expect(container.querySelectorAll('#answers .answer-btn')).toHaveLength(2)

    container.querySelectorAll('#answers .answer-btn')[1]?.click()
    expect(controller.handleAnswer).toHaveBeenCalledWith(1)

    await act(async () => {
      setShellState({
        questionScreenHidden: true,
        summaryScreenHidden: false,
      })
      setSummaryView({
        correct: 2,
        total: 3,
        answered: 3,
        averageText: '11.2s',
        averageNoSkipsText: '11.2s',
        categories: ['All', 'Verbal'],
        activeCategory: 'All',
        sections: [
          {
            title: 'All Questions',
            items: [
              {
                questionIndex: 0,
                isCorrect: true,
                timePillHtml: '<span>10.2s</span>',
                difficultyHtml: '<span>D4</span>',
                reviewIndexes: [0, 1, 2],
              },
            ],
          },
        ],
      })
      await flush()
    })

    container.querySelectorAll('#categoryControls .category-btn')[1]?.click()
    expect(controller.handleCategoryChange).toHaveBeenCalledWith('Verbal')

    container.querySelector('.summary-item')?.click()
    expect(controller.openReviewModal).toHaveBeenCalledWith(0, [0, 1, 2])

    await act(async () => {
      setModalView({
        open: true,
        title: 'Question 1 Review',
        badgesHtml: '<span class="badge">Verbal</span>',
        questionHtml: '<p>Review content</p>',
        answers: [
          { label: 'A', contentHtml: '<span>Alpha</span>', badgesHtml: '', className: 'modal-answer' },
        ],
        prevDisabled: false,
        nextDisabled: false,
        copyStatus: 'Copied.',
      })
      await flush()
    })

    container.querySelector('#prevReviewBtn')?.click()
    container.querySelector('#nextReviewBtn')?.click()
    container.querySelector('#googleSearchBtn')?.click()
    container.querySelector('#copyPromptBtn')?.click()
    container.querySelector('#closeModalBtn')?.click()

    expect(controller.prevReview).toHaveBeenCalledTimes(1)
    expect(controller.nextReview).toHaveBeenCalledTimes(1)
    expect(controller.googleSearch).toHaveBeenCalledTimes(1)
    expect(controller.copyPrompt).toHaveBeenCalledTimes(1)
    expect(controller.closeModal).toHaveBeenCalledTimes(1)
  })
})