import { joinClassNames } from '../utils/classNames.js'

export default function SummaryView({
  hidden,
  summaryView,
  modalView,
  onCategoryChange,
  onOpenReview,
  onPrevReview,
  onNextReview,
  onCloseModal,
  onGoogleSearch,
  onCopyPrompt,
}) {
  return (
    <>
      <section id="summaryScreen" className={joinClassNames(hidden && 'hidden')}>
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
                onClick={() => onCategoryChange(cat)}
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
                      onClick={() => onOpenReview(item.questionIndex, item.reviewIndexes)}
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
    </>
  )
}
