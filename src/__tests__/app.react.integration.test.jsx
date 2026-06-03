import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const initAppMock = vi.fn()

vi.mock('../utils/app.js', () => ({
  initApp: (...args) => initAppMock(...args),
}))

function flush() {
  return Promise.resolve()
}

describe('App React integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
  })

  afterEach(async () => {
    initAppMock.mockReset()
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

    render(<App />)
    await waitFor(() => expect(initAppMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      setStartView({
        startBtnDisabled: false,
        startBtnLabel: 'Start Test',
      })
      await flush()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Load Selected Corpus' }))
    fireEvent.change(screen.getByLabelText('Corpus'))
    fireEvent.click(screen.getByRole('button', { name: 'Start Test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))

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
    const { container } = render(<App />)
    await waitFor(() => expect(initAppMock).toHaveBeenCalledTimes(1))

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
        questionPrompt: 'Select the best option.',
        questionVisual: null,
        choices: [
          { index: 0, label: 'A', text: 'Alpha', visual: null },
          { index: 1, label: 'B', text: 'Bravo', visual: null },
        ],
      })
      await flush()
    })

    expect(screen.getByText(/Question 1 of 3/)).toBeInTheDocument()
    expect(container.querySelectorAll('#answers .answer-btn')).toHaveLength(2)

    fireEvent.click(container.querySelectorAll('#answers .answer-btn')[1])
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
                timePillText: '10.2s',
                timePillClassName: 'time-pill',
                difficultyText: 'D4',
                difficultyClassName: 'difficulty-badge difficulty-medium',
                reviewIndexes: [0, 1, 2],
              },
            ],
          },
        ],
      })
      await flush()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Verbal' }))
    expect(controller.handleCategoryChange).toHaveBeenCalledWith('Verbal')

    fireEvent.click(container.querySelector('.summary-item'))
    expect(controller.openReviewModal).toHaveBeenCalledWith(0, [0, 1, 2])

    await act(async () => {
      setModalView({
        open: true,
        title: 'Question 1 Review',
        badges: [{ text: 'Verbal', className: 'badge' }],
        questionPrompt: 'Review content',
        questionVisual: null,
        answers: [
          { label: 'A', text: 'Alpha', visual: null, markers: [], className: 'modal-answer' },
        ],
        prevDisabled: false,
        nextDisabled: false,
        copyStatus: 'Copied.',
      })
      await flush()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Explain / Google' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Prompt' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(controller.prevReview).toHaveBeenCalledTimes(1)
    expect(controller.nextReview).toHaveBeenCalledTimes(1)
    expect(controller.googleSearch).toHaveBeenCalledTimes(1)
    expect(controller.copyPrompt).toHaveBeenCalledTimes(1)
    expect(controller.closeModal).toHaveBeenCalledTimes(1)
  })
})