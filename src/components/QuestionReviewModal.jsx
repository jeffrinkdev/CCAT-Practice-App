import { joinClassNames } from '../utils/classNames.js'
import VisualView from './VisualView.jsx'

export default function QuestionReviewModal({
  modalView,
  onCloseModal,
  onPrevReview,
  onNextReview,
  onGoogleSearch,
  onCopyPrompt,
}) {
  return (
    <div
      id="modalBackdrop"
      className={joinClassNames('modal-backdrop', !modalView.open && 'hidden')}
      onClick={(e) => { if (e.target === e.currentTarget) onCloseModal() }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <h3 id="modalTitle">{modalView.title}</h3>
            <div id="modalBadges" className="badges">
              {modalView.badges.map((badge, index) => (
                <span key={`${badge.text}-${index}`} className={badge.className}>{badge.text}</span>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button id="prevReviewBtn" className="secondary-btn" type="button" disabled={modalView.prevDisabled} onClick={onPrevReview}>
              Previous
            </button>
            <button id="nextReviewBtn" className="secondary-btn" type="button" disabled={modalView.nextDisabled} onClick={onNextReview}>
              Next
            </button>
            <button id="closeModalBtn" className="secondary-btn" type="button" onClick={onCloseModal}>
              Dismiss
            </button>
          </div>
        </div>

        <div className="modal-question-frame">
          <div id="modalQuestionContent" className="question-content">
            <div className="question-text">{modalView.questionPrompt}</div>
            {modalView.questionVisual ? (
              <div className="visual-stage">
                <VisualView visual={modalView.questionVisual} />
              </div>
            ) : null}
          </div>
        </div>

        <div id="modalAnswers">
          {modalView.answers.map(({ label, text, visual, markers, className }, i) => (
            <div
              key={i}
              className={className}
            >
              <div className="modal-answer-main">
                <strong>{label}.</strong>
                <div className="answer-choice-content">
                  {visual ? <VisualView visual={visual} width={72} height={72} /> : null}
                  <span>{text || ''}</span>
                </div>
              </div>
              <div className="modal-answer-markers">
                {markers.map((marker, markerIndex) => (
                  <span key={`${marker.text}-${markerIndex}`} className={marker.className}>{marker.text}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-actions">
            <button id="googleSearchBtn" className="secondary-btn explain-btn" type="button" onClick={onGoogleSearch}>
              Explain / Google
            </button>
            <button id="copyPromptBtn" className="secondary-btn explain-btn" type="button" onClick={onCopyPrompt}>
              Copy Prompt
            </button>
            <span id="copyStatus" className="copy-status">{modalView.copyStatus}</span>
          </div>
        </div>
      </div>
    </div>
  )
}