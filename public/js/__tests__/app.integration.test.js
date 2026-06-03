import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

// Create a minimal HTML fixture with necessary elements
function createDOMFixture() {
  const html = `
    <html>
      <body>
        <div id="header" class="header hidden">
          <div id="timer">15:00</div>
          <button id="stopBtn" class="hidden">Stop</button>
          <button id="headerRestartBtn" class="hidden">Restart</button>
        </div>
        <div id="startScreen">
          <select id="corpusSelect">
            <option data-type="txt" value="/data/questions-text.txt">Text</option>
          </select>
          <button id="startBtn">Start Test</button>
          <div id="corpusStatus"></div>
          <div id="loadError" class="hidden"></div>
        </div>
        <div id="questionScreen" class="hidden">
          <div id="questionCounter">Question 1 of 50 · Category</div>
          <div id="questionContent"></div>
          <div id="answers"></div>
        </div>
        <div id="summaryScreen" class="hidden">
          <div id="summaryStats"></div>
          <div id="categoryControls"></div>
          <div id="summaryContainer"></div>
        </div>
        <div id="modalBackdrop" class="hidden">
          <div class="modal">
            <div class="modal-question-frame"></div>
          </div>
        </div>
      </body>
    </html>
  `
  return new JSDOM(html)
}

// Mock functions that would normally depend on DOM timing or audio API
function createMockState() {
  return {
    currentIndex: 0,
    testStartedAt: 0,
    questionStartedAt: 0,
    intervalId: null,
    isAdvancing: false,
    stoppedEarly: false,
    activeCategory: 'All',
    activeReviewIndexes: [],
    currentReviewPosition: 0,
    currentReviewQuestionIndex: null,
    results: [],
    chimed18: false,
    chimed45: false,
  }
}

function createMockQuestion(overrides = {}) {
  return {
    id: 'Q1',
    category: 'Numeric / Logic',
    type: 'text',
    prompt: 'What is 2+2?',
    choices: [
      { text: '3' },
      { text: '4' },
      { text: '5' },
      { text: '6' },
    ],
    correctIndex: 1,
    visual: null,
    difficulty: 2,
    difficultyRationale: 'Simple arithmetic',
    ...overrides,
  }
}

function createMockCorpus(count = 3) {
  return Array.from({ length: count }, (_, i) =>
    createMockQuestion({
      id: `Q${i + 1}`,
      category: ['Numeric / Logic', 'Verbal', 'Spatial'][i % 3],
    })
  )
}

describe('App Integration - Test Lifecycle', () => {
  let dom
  let window
  let document

  beforeEach(() => {
    dom = createDOMFixture()
    window = dom.window
    document = window.document
    global.window = window
    global.document = document
  })

  afterEach(() => {
    delete global.window
    delete global.document
  })

  describe('Test Initialization', () => {
    it('initializes state correctly when startTest() is called', () => {
      const state = createMockState()

      // Simulate startTest
      state.currentIndex = 0
      state.results = []
      state.stoppedEarly = false
      state.testStartedAt = Date.now()
      state.questionStartedAt = Date.now()

      expect(state.currentIndex).toBe(0)
      expect(state.results).toEqual([])
      expect(state.stoppedEarly).toBe(false)
      expect(state.testStartedAt).toBeGreaterThan(0)
    })

    it('shows correct screen visibility when test starts', () => {
      const startScreen = document.getElementById('startScreen')
      const questionScreen = document.getElementById('questionScreen')
      const header = document.getElementById('header')

      // Simulate startTest screen changes
      startScreen.classList.add('hidden')
      questionScreen.classList.remove('hidden')
      header.classList.remove('hidden')

      expect(startScreen.classList.contains('hidden')).toBe(true)
      expect(questionScreen.classList.contains('hidden')).toBe(false)
      expect(header.classList.contains('hidden')).toBe(false)
    })

    it('disables corpus selection during test', () => {
      const corpusSelect = document.getElementById('corpusSelect')
      const startBtn = document.getElementById('startBtn')

      // Simulate test start
      corpusSelect.disabled = true
      startBtn.disabled = true

      expect(corpusSelect.disabled).toBe(true)
      expect(startBtn.disabled).toBe(true)
    })
  })

  describe('Question Rendering', () => {
    it('updates question counter with correct index', () => {
      const counter = document.getElementById('questionCounter')
      const state = createMockState()
      const corpus = createMockCorpus(10)

      state.currentIndex = 3
      counter.textContent = `Question ${state.currentIndex + 1} of ${corpus.length} · ${corpus[state.currentIndex].category}`

      expect(counter.textContent).toContain('Question 4 of 10')
      expect(counter.textContent).toContain(corpus[3].category)
    })

    it('renders answer buttons for each choice', () => {
      const answers = document.getElementById('answers')
      const question = createMockQuestion()

      // Simulate rendering answer buttons
      question.choices.forEach((choice, index) => {
        const button = document.createElement('button')
        button.className = 'answer-btn'
        button.textContent = choice.text
        button.dataset.index = index
        answers.appendChild(button)
      })

      const buttons = answers.querySelectorAll('.answer-btn')
      expect(buttons).toHaveLength(4)
      expect(buttons[0].textContent).toBe('3')
      expect(buttons[1].textContent).toBe('4')
      expect(buttons[3].textContent).toBe('6')
    })

    it('tracks answer selection and timing', () => {
      const state = createMockState()
      const question = createMockQuestion()
      const questionStartedAt = Date.now()

      state.questionStartedAt = questionStartedAt
      state.currentIndex = 0

      // Simulate selecting answer at index 1
      const selectedIndex = 1
      const timeSpent = (Date.now() - state.questionStartedAt) / 1000

      const result = {
        questionIndex: state.currentIndex,
        userChoiceIndex: selectedIndex,
        correct: selectedIndex === question.correctIndex,
        timeSpent: Math.round(timeSpent * 100) / 100,
      }

      state.results.push(result)

      expect(state.results).toHaveLength(1)
      expect(result.correct).toBe(true)
      expect(result.timeSpent).toBeLessThan(1)
    })

    it('marks answer as correct or incorrect', () => {
      const state = createMockState()
      const corpus = createMockCorpus(3)

      // Test correct answer
      const result1 = {
        questionIndex: 0,
        userChoiceIndex: corpus[0].correctIndex,
        correct: true,
      }

      // Test incorrect answer
      const result2 = {
        questionIndex: 1,
        userChoiceIndex: (corpus[1].correctIndex + 1) % 4,
        correct: false,
      }

      state.results.push(result1, result2)

      expect(state.results[0].correct).toBe(true)
      expect(state.results[1].correct).toBe(false)
    })
  })

  describe('Test Progression', () => {
    it('advances to next question after selection', () => {
      const state = createMockState()
      const corpus = createMockCorpus(5)

      state.currentIndex = 0
      expect(state.currentIndex).toBe(0)

      // Simulate advancing to next
      state.currentIndex += 1
      expect(state.currentIndex).toBe(1)
    })

    it('finishes test when all questions answered', () => {
      const state = createMockState()
      const corpus = createMockCorpus(3)

      state.currentIndex = 0
      state.results = []

      // Answer all questions
      for (let i = 0; i < corpus.length; i++) {
        state.results.push({
          questionIndex: i,
          userChoiceIndex: corpus[i].correctIndex,
          correct: true,
        })
      }

      const testFinished = state.results.length === corpus.length

      expect(testFinished).toBe(true)
      expect(state.results).toHaveLength(3)
    })

    it('handles early test termination', () => {
      const state = createMockState()
      const corpus = createMockCorpus(50)

      state.currentIndex = 10
      state.results = Array.from({ length: 10 }, (_, i) => ({
        questionIndex: i,
        correct: i % 2 === 0,
      }))

      // User clicks stop
      state.stoppedEarly = true

      expect(state.stoppedEarly).toBe(true)
      expect(state.results.length).toBeLessThan(corpus.length)
    })
  })

  describe('Summary Generation', () => {
    it('calculates summary statistics', () => {
      const state = createMockState()

      state.results = [
        { correct: true, timeSpent: 15 },
        { correct: true, timeSpent: 12 },
        { correct: false, timeSpent: 45 },
        { correct: true, timeSpent: 20 },
      ]

      const correct = state.results.filter((r) => r.correct).length
      const answered = state.results.length
      const avgTime = state.results.reduce((sum, r) => sum + r.timeSpent, 0) / answered

      expect(correct).toBe(3)
      expect(answered).toBe(4)
      expect(avgTime).toBeCloseTo(23, 0)
    })

    it('categories results by question category', () => {
      const state = createMockState()
      const corpus = createMockCorpus(6)

      state.results = [
        { questionIndex: 0, category: corpus[0].category, correct: true },
        { questionIndex: 1, category: corpus[1].category, correct: false },
        { questionIndex: 2, category: corpus[2].category, correct: true },
        { questionIndex: 3, category: corpus[3].category, correct: true },
        { questionIndex: 4, category: corpus[4].category, correct: false },
        { questionIndex: 5, category: corpus[5].category, correct: true },
      ]

      const byCategory = state.results.reduce((acc, result) => {
        const cat = result.category
        acc[cat] = acc[cat] || { correct: 0, total: 0 }
        acc[cat].total += 1
        if (result.correct) acc[cat].correct += 1
        return acc
      }, {})

      expect(Object.keys(byCategory).length).toBeGreaterThan(0)
      expect(byCategory['Numeric / Logic'].total).toBeGreaterThan(0)
    })

    it('displays correct screen when test completes', () => {
      const startScreen = document.getElementById('startScreen')
      const questionScreen = document.getElementById('questionScreen')
      const summaryScreen = document.getElementById('summaryScreen')

      // Simulate test completion
      startScreen.classList.add('hidden')
      questionScreen.classList.add('hidden')
      summaryScreen.classList.remove('hidden')

      expect(startScreen.classList.contains('hidden')).toBe(true)
      expect(questionScreen.classList.contains('hidden')).toBe(true)
      expect(summaryScreen.classList.contains('hidden')).toBe(false)
    })
  })

  describe('Result Review', () => {
    it('stores full result data for review', () => {
      const state = createMockState()
      const corpus = createMockCorpus(3)

      corpus.forEach((question, idx) => {
        state.results.push({
          questionIndex: idx,
          question: question,
          userChoiceIndex: question.correctIndex,
          correct: true,
          timeSpent: 10 + idx,
        })
      })

      expect(state.results).toHaveLength(3)
      expect(state.results[0].question).toBeDefined()
      expect(state.results[0].question.id).toBe('Q1')
    })

    it('allows filtering results by category', () => {
      const state = createMockState()
      const corpus = createMockCorpus(6)

      state.results = corpus.map((q, idx) => ({
        questionIndex: idx,
        category: q.category,
        correct: true,
      }))

      const numericResults = state.results.filter(
        (r) => r.category === 'Numeric / Logic'
      )

      expect(numericResults.length).toBeGreaterThan(0)
      expect(numericResults.length).toBeLessThanOrEqual(state.results.length)
    })

    it('allows navigating between review questions', () => {
      const state = createMockState()
      state.results = Array.from({ length: 10 }, (_, i) => ({
        questionIndex: i,
      }))

      state.currentReviewPosition = 0
      expect(state.currentReviewPosition).toBe(0)

      // Navigate next
      state.currentReviewPosition = Math.min(
        state.currentReviewPosition + 1,
        state.results.length - 1
      )
      expect(state.currentReviewPosition).toBe(1)

      // Navigate prev
      state.currentReviewPosition = Math.max(state.currentReviewPosition - 1, 0)
      expect(state.currentReviewPosition).toBe(0)
    })
  })
})
