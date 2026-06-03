import { joinClassNames } from '../utils/classNames.js'
import QuestionReviewModal from './QuestionReviewModal.jsx'

export default function SummaryView({
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
      <section id="summaryScreen">
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
                    >
                      <strong>#{item.questionIndex + 1}</strong>
                      <span>{item.isCorrect ? 'Correct' : 'Incorrect'}</span>
                      <br />
                      <span className={item.timePillClassName}>{item.timePillText}</span>
                      <br />
                      <span className={item.difficultyClassName}>{item.difficultyText}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <QuestionReviewModal
        modalView={modalView}
        onCloseModal={onCloseModal}
        onPrevReview={onPrevReview}
        onNextReview={onNextReview}
        onGoogleSearch={onGoogleSearch}
        onCopyPrompt={onCopyPrompt}
      />
    </>
  )
}
