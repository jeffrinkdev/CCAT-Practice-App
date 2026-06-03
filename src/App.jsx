import { useEffect, useRef, useState } from 'react'
import { initApp } from './utils/app.js'
import { QUESTION_BAR_SECONDS } from './utils/state.js'
import { joinClassNames } from './utils/classNames.js'
import StartView from './components/StartView.jsx'
import QuestionView from './components/QuestionView.jsx'
import SummaryView from './components/SummaryView.jsx'

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

const DEFAULT_START_VIEW = {
  startBtnDisabled: true,
  startBtnLabel: 'Load a corpus first',
  corpusStatus: '',
  loadErrorHidden: true,
  loadErrorHtml: '',
}

function App() {
  const appRef = useRef(null)
  const [shellState, setShellState] = useState(DEFAULT_SHELL_STATE)
  const [questionView, setQuestionView] = useState(DEFAULT_QUESTION_VIEW)
  const [summaryView, setSummaryView] = useState(DEFAULT_SUMMARY_VIEW)
  const [modalView, setModalView] = useState(DEFAULT_MODAL_VIEW)
  const [startView, setStartView] = useState(DEFAULT_START_VIEW)

  useEffect(() => {
    appRef.current = initApp(
      document,
      (nextState) => setShellState((cur) => ({ ...cur, ...nextState })),
      (patch) => setQuestionView((cur) => ({ ...cur, ...patch })),
      (data) => setSummaryView((cur) => ({ ...cur, ...data })),
      (patch) => setModalView((cur) => ({ ...cur, ...patch })),
      (patch) => setStartView((cur) => ({ ...cur, ...patch })),
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
              onClick={() => appRef.current?.stopTest()}
            >
              Stop
            </button>
            <button
              id="headerRestartBtn"
              className={joinClassNames('secondary-btn', shellState.restartButtonHidden && 'hidden')}
              type="button"
              onClick={() => appRef.current?.restartTest()}
            >
              Restart
            </button>
          </div>
        </div>
      </header>

      <main>
        <StartView
          hidden={shellState.startScreenHidden}
          startView={startView}
          onLoadCorpus={() => appRef.current?.loadCorpus()}
          onCorpusChange={() => appRef.current?.handleCorpusChange()}
          onStartTest={() => appRef.current?.startTest()}
        />
        <QuestionView
          hidden={shellState.questionScreenHidden}
          questionView={questionView}
          onAnswer={(index) => appRef.current?.handleAnswer(index)}
        />
        <SummaryView
          hidden={shellState.summaryScreenHidden}
          summaryView={summaryView}
          modalView={modalView}
          onCategoryChange={(cat) => appRef.current?.handleCategoryChange(cat)}
          onOpenReview={(qi, ri) => appRef.current?.openReviewModal(qi, ri)}
          onPrevReview={() => appRef.current?.prevReview()}
          onNextReview={() => appRef.current?.nextReview()}
          onCloseModal={() => appRef.current?.closeModal()}
          onGoogleSearch={() => appRef.current?.googleSearch()}
          onCopyPrompt={() => appRef.current?.copyPrompt()}
        />
      </main>
    </>
  )
}

export default App