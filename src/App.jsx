import { useEffect, useRef, useState } from 'react'
import { initApp } from './utils/app.js'
import { QUESTION_BAR_SECONDS } from './utils/state.js'

const DEFAULT_SHELL_STATE = {
  headerHidden: true,
  startScreenHidden: false,
  questionScreenHidden: true,
  summaryScreenHidden: true,
  stopButtonHidden: false,
  restartButtonHidden: true,
  timerSummaryHidden: false,
}

const DEFAULT_QUESTION_VIEW = {
  timerText: '15:00',
  timerYellow: false,
  timerRed: false,
  counterText: '',
  questionHtml: '',
  progressPct: 0,
  timingPct: 0,
  timingText: `0.0s / ${QUESTION_BAR_SECONDS}s`,
  choices: [],
  selectedChoiceIndex: null,
}

const DEFAULT_SUMMARY_VIEW = {
  correct: 0, total: 0, answered: 0,
  averageText: '—', averageNoSkipsText: '—',
  categories: [],
  activeCategory: 'All',
  sections: [],
}

const DEFAULT_MODAL_VIEW = {
  open: false,
  title: '',
  badgesHtml: '',
  questionHtml: '',
  answers: [],
  prevDisabled: true,
  nextDisabled: true,
  copyStatus: '',
}

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function App() {
  const appRef = useRef(null)
  const [shellState, setShellState] = useState(DEFAULT_SHELL_STATE)
  const [questionView, setQuestionView] = useState(DEFAULT_QUESTION_VIEW)
  const [summaryView, setSummaryView] = useState(DEFAULT_SUMMARY_VIEW)
  const [modalView, setModalView] = useState(DEFAULT_MODAL_VIEW)

  useEffect(() => {
    appRef.current = initApp(
      document,
      (nextState) => setShellState((cur) => ({ ...cur, ...nextState })),
      (patch) => setQuestionView((cur) => ({ ...cur, ...patch })),
      (data) => setSummaryView((cur) => ({ ...cur, ...data })),
      (patch) => setModalView((cur) => ({ ...cur, ...patch })),
    )
  }, [])

  return (
    <>
      <header id="header" className={joinClassNames('app-header', shellState.headerHidden && 'hidden')}>
        <div className="brand">CCAT Practice Simulator</div>
        <div className="header-actions">
          <div
            id="timer"
            className={joinClassNames(
              'timer',
              shellState.timerSummaryHidden && 'summary-hidden',
              questionView.timerYellow && 'yellow',
              questionView.timerRed && 'red',
            )}
          >
            {questionView.timerText}
          </div>
          <div className="stop-holder">
            <button
              id="stopBtn"
              className={joinClassNames('secondary-btn', shellState.stopButtonHidden && 'hidden')}
              type="button"
            >
              Stop
            </button>
            <button
              id="headerRestartBtn"
              className={joinClassNames('secondary-btn', shellState.restartButtonHidden && 'hidden')}
              type="button"
            >
              Restart
            </button>
          </div>
        </div>
      </header>

      <main>
        <section
          id="startScreen"
          className={joinClassNames('center-screen', shellState.startScreenHidden && 'hidden')}
        >
          <div className="card start-card">
            <h1>CCAT Practice Simulator</h1>
            <p className="muted">
              50 questions. 15 minutes. Select a corpus, then start. Text and JSON/visual corpora are supported.
            </p>

            <div className="corpus-controls">
              <div className="field">
                <label htmlFor="corpusSelect">Corpus</label>
                <select id="corpusSelect"></select>
              </div>

              <div className="field">
                <label htmlFor="corpusFileInput">Optional local corpus file</label>
                <input
                  id="corpusFileInput"
                  type="file"
                  accept=".txt,.json,application/json,text/plain"
                />
              </div>

              <div className="field">
                <label htmlFor="testOrderSelect">Question order</label>
                <select id="testOrderSelect" defaultValue="progressive">
                  <option value="progressive">Progressive difficulty: easier to harder</option>
                  <option value="random">Fully random order</option>
                </select>
              </div>
            </div>

            <button id="loadCorpusBtn" className="secondary-btn" type="button">
              Load Selected Corpus
            </button>
            <button id="startBtn" className="primary-btn" type="button" disabled>
              Load a corpus first
            </button>
            <p id="corpusStatus" className="muted"></p>
            <div id="loadError" className="load-error hidden"></div>
          </div>
        </section>

        <section id="questionScreen" className={joinClassNames(shellState.questionScreenHidden && 'hidden')}>
          <div className="card">
            <div className="question-meta">
              <span id="questionCounter">{questionView.counterText}</span>
            </div>
            <div className="question-text-frame">
              <div
                id="questionContent"
                className="question-content"
                dangerouslySetInnerHTML={{ __html: questionView.questionHtml }}
              />
            </div>
            <div id="answers" className="answers">
              {questionView.choices.map(({ index, label, contentHtml }) => (
                <button
                  key={index}
                  type="button"
                  className={joinClassNames('answer-btn', questionView.selectedChoiceIndex === index && 'selected')}
                  onClick={() => appRef.current?.handleAnswer(index)}
                  dangerouslySetInnerHTML={{ __html: `<span class="answer-label">${label}</span>${contentHtml}` }}
                />
              ))}
            </div>
            <p className="muted" style={{ margin: '0.9rem 0 0' }}>
              Keyboard: press A, B, C, or D to answer.
            </p>

            <div className="timing-wrap">
              <div className="timing-label-row">
                <span>Question pace</span>
                <span id="timingPositionText">{questionView.timingText}</span>
              </div>
              <div className="timing-bar">
                <div className="timing-marker marker-skip"></div>
                <div className="timing-marker marker-18"></div>
                <div className="timing-marker marker-36"></div>
                <div className="timing-marker marker-45"></div>
                <div id="timingPosition" className="timing-position" style={{ left: `${questionView.timingPct}%` }}></div>
              </div>
              <div className="timing-scale">
                <span className="timing-marker-label label-skip">3s</span>
                <span className="timing-marker-label label-18">18s</span>
                <span className="timing-marker-label label-36">36s</span>
                <span className="timing-marker-label label-45">45s</span>
              </div>
            </div>

            <div className="progress">
              <div id="progressFill" className="progress-fill" style={{ width: `${questionView.progressPct}%` }}></div>
            </div>
          </div>
        </section>

        <section id="summaryScreen" className={joinClassNames(shellState.summaryScreenHidden && 'hidden')}>
          <div className="card">
            <div className="summary-head">
              <h2>Test Summary</h2>
            </div>
            <div id="summaryStats" className="summary-stats">
              <div className="stat"><span className="muted">Correct</span><strong>{summaryView.correct} / {summaryView.total}</strong></div>
              <div className="stat"><span className="muted">Answered</span><strong>{summaryView.answered} / {summaryView.total}</strong></div>
              <div className="stat"><span className="muted">Average time</span><strong>{summaryView.averageText}</strong></div>
              <div className="stat"><span className="muted">Average time, not skipped</span><strong>{summaryView.averageNoSkipsText}</strong></div>
            </div>
            <div id="categoryControls" className="category-controls">
              {summaryView.categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={joinClassNames('category-btn', summaryView.activeCategory === cat && 'active')}
                  onClick={() => appRef.current?.handleCategoryChange(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="muted">Click any question to review your answer, the correct answer, and your time spent.</p>
            <div id="summaryContainer">
              {summaryView.sections.map((section) => (
                <section key={section.title} className="category-section">
                  <h3 className="category-title">{section.title}</h3>
                  <div className="summary-grid">
                    {section.items.map((item) => (
                      <button
                        key={item.questionIndex}
                        type="button"
                        className={joinClassNames('summary-item', item.isCorrect ? 'correct' : 'incorrect')}
                        onClick={() => appRef.current?.openReviewModal(item.questionIndex, item.reviewIndexes)}
                        dangerouslySetInnerHTML={{
                          __html: `<strong>#${item.questionIndex + 1}</strong><span>${item.isCorrect ? 'Correct' : 'Incorrect'}</span><br>${item.timePillHtml}<br>${item.difficultyHtml}`,
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>

      <div id="modalBackdrop" className={joinClassNames('modal-backdrop', !modalView.open && 'hidden')}>
        <div className="modal">
          <div className="modal-header">
            <div>
              <h3 id="modalTitle">{modalView.title}</h3>
              <div id="modalBadges" className="badges" dangerouslySetInnerHTML={{ __html: modalView.badgesHtml }} />
            </div>
            <div className="modal-actions">
              <button id="prevReviewBtn" className="secondary-btn" type="button" disabled={modalView.prevDisabled}>
                Previous
              </button>
              <button id="nextReviewBtn" className="secondary-btn" type="button" disabled={modalView.nextDisabled}>
                Next
              </button>
              <button id="closeModalBtn" className="secondary-btn" type="button">
                Dismiss
              </button>
            </div>
          </div>

          <div className="modal-question-frame">
            <div
              id="modalQuestionContent"
              className="question-content"
              dangerouslySetInnerHTML={{ __html: modalView.questionHtml }}
            />
          </div>

          <div id="modalAnswers">
            {modalView.answers.map(({ label, contentHtml, badgesHtml, className }, i) => (
              <div
                key={i}
                className={className}
                dangerouslySetInnerHTML={{
                  __html: `<div class="modal-answer-main"><strong>${label}.</strong> ${contentHtml}</div><div class="modal-answer-markers">${badgesHtml}</div>`,
                }}
              />
            ))}
          </div>

          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button id="googleSearchBtn" className="secondary-btn explain-btn" type="button">
                Explain / Google
              </button>
              <button id="copyPromptBtn" className="secondary-btn explain-btn" type="button">
                Copy Prompt
              </button>
              <span id="copyStatus" className="copy-status">{modalView.copyStatus}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App