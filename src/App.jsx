import { useEffect, useState } from 'react'

const DEFAULT_SHELL_STATE = {
  headerHidden: true,
  startScreenHidden: false,
  questionScreenHidden: true,
  summaryScreenHidden: true,
  stopButtonHidden: false,
  restartButtonHidden: true,
  timerSummaryHidden: false,
}

function joinClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

function App() {
  const [shellState, setShellState] = useState(DEFAULT_SHELL_STATE)

  useEffect(() => {
    window.__ccatReactBridge = {
      syncShell(nextState) {
        setShellState((currentState) => ({
          ...currentState,
          ...nextState,
        }))
      },
    }

    if (window.__ccatLegacyAppMounted) {
      return () => {
        delete window.__ccatReactBridge
      }
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.src = '/js/app.js'
    script.dataset.ccatApp = 'true'
    document.body.appendChild(script)

    window.__ccatLegacyAppMounted = true

    return () => {
      delete window.__ccatReactBridge
    }
  }, [])

  return (
    <>
      <header id="header" className={joinClassNames('app-header', shellState.headerHidden && 'hidden')}>
        <div className="brand">CCAT Practice Simulator</div>
        <div className="header-actions">
          <div
            id="timer"
            className={joinClassNames('timer', shellState.timerSummaryHidden && 'summary-hidden')}
          >
            15:00
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
              <span id="questionCounter"></span>
            </div>
            <div className="question-text-frame">
              <div id="questionContent" className="question-content"></div>
            </div>
            <div id="answers" className="answers"></div>
            <p className="muted" style={{ margin: '0.9rem 0 0' }}>
              Keyboard: press A, B, C, or D to answer.
            </p>

            <div className="timing-wrap">
              <div className="timing-label-row">
                <span>Question pace</span>
                <span id="timingPositionText">0.0s / 60s</span>
              </div>
              <div className="timing-bar">
                <div className="timing-marker marker-skip"></div>
                <div className="timing-marker marker-18"></div>
                <div className="timing-marker marker-36"></div>
                <div className="timing-marker marker-45"></div>
                <div id="timingPosition" className="timing-position"></div>
              </div>
              <div className="timing-scale">
                <span className="timing-marker-label label-skip">3s</span>
                <span className="timing-marker-label label-18">18s</span>
                <span className="timing-marker-label label-36">36s</span>
                <span className="timing-marker-label label-45">45s</span>
              </div>
            </div>

            <div className="progress">
              <div id="progressFill" className="progress-fill"></div>
            </div>
          </div>
        </section>

        <section id="summaryScreen" className={joinClassNames(shellState.summaryScreenHidden && 'hidden')}>
          <div className="card">
            <div className="summary-head">
              <h2>Test Summary</h2>
            </div>
            <div id="summaryStats" className="summary-stats"></div>
            <div id="categoryControls" className="category-controls"></div>
            <p className="muted">Click any question to review your answer, the correct answer, and your time spent.</p>
            <div id="summaryContainer"></div>
          </div>
        </section>
      </main>

      <div id="modalBackdrop" className="modal-backdrop hidden">
        <div className="modal">
          <div className="modal-header">
            <div>
              <h3 id="modalTitle"></h3>
              <div id="modalBadges" className="badges"></div>
            </div>
            <div className="modal-actions">
              <button id="prevReviewBtn" className="secondary-btn" type="button">
                Previous
              </button>
              <button id="nextReviewBtn" className="secondary-btn" type="button">
                Next
              </button>
              <button id="closeModalBtn" className="secondary-btn" type="button">
                Dismiss
              </button>
            </div>
          </div>

          <div className="modal-question-frame">
            <div id="modalQuestionContent" className="question-content"></div>
          </div>

          <div id="modalAnswers"></div>

          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button id="googleSearchBtn" className="secondary-btn explain-btn" type="button">
                Explain / Google
              </button>
              <button id="copyPromptBtn" className="secondary-btn explain-btn" type="button">
                Copy Prompt
              </button>
              <span id="copyStatus" className="copy-status"></span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App