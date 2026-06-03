import { joinClassNames } from '../utils/classNames.js'

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
            <div id="modalBadges" className="badges" dangerouslySetInnerHTML={{ __html: modalView.badgesHtml }} />
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