import { joinClassNames } from '../utils/classNames.js'
import HtmlContent from './HtmlContent.jsx'

export default function StartView({ startView, onLoadCorpus, onCorpusChange, onStartTest }) {
  return (
    <section id="startScreen" className="center-screen">
      <div className="card start-card">
        <h1>CCAT Practice Simulator</h1>
        <p className="muted">
          50 questions. 15 minutes. Select a corpus, then start. Text and JSON/visual corpora are supported.
        </p>

        <div className="corpus-controls">
          <div className="field">
            <label htmlFor="corpusSelect">Corpus</label>
            <select id="corpusSelect" onChange={onCorpusChange}></select>
          </div>

          <div className="field">
            <label htmlFor="corpusFileInput">Optional local corpus file</label>
            <input
              id="corpusFileInput"
              type="file"
              accept=".txt,.json,application/json,text/plain"
              onChange={onLoadCorpus}
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

        <button id="loadCorpusBtn" className="secondary-btn" type="button" onClick={onLoadCorpus}>
          Load Selected Corpus
        </button>
        <button
          id="startBtn"
          className="primary-btn"
          type="button"
          disabled={startView.startBtnDisabled}
          onClick={onStartTest}
        >
          {startView.startBtnLabel}
        </button>
        <p id="corpusStatus" className="muted">{startView.corpusStatus}</p>
        <div
          id="loadError"
          className={joinClassNames('load-error', startView.loadErrorHidden && 'hidden')}
        >
          <HtmlContent html={startView.loadErrorHtml} />
        </div>
      </div>
    </section>
  )
}
