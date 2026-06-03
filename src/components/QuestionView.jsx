import { joinClassNames } from '../utils/classNames.js'

export default function QuestionView({ questionView, onAnswer }) {
  return (
    <section id="questionScreen">
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
              onClick={() => onAnswer(index)}
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
  )
}
