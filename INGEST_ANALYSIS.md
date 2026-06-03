# CCAT Practice App Ingestion Analysis

Date: 2026-06-03

## Repository Snapshot

- Primary application: `ccat-practice-simulator-flex-corpus-visual-difficulty-order-v7.html`
- Text corpus: `CCATQuestions500DifficultyFixed.txt`
- JSON/visual corpus: `CCATQuestions500VisualDifficultyFixed.json`
- README: `README.md` (minimal)

This project is a single-page browser app with embedded CSS + JavaScript (no build step, no backend).

## Corpus Scale

- JSON corpus contains 500 question IDs (`V001`..)
- Text corpus has 4571 lines and includes an `ANSWER KEY:` section required by parser logic

## Architecture Overview

The app is implemented as one self-contained HTML file:

- UI markup for start/test/summary/review modal screens
- Styling with CSS variables and responsive behavior
- Application logic in one `<script>` block

Core runtime globals:

- `questions`: loaded corpus questions
- `activeQuestions`: 50-question test instance for current run
- constants for timing and test size
- `state`: mutable test state (index, timers, results, modal position, etc.)

## Data Loading and Parsing

Main load path:

1. User chooses built-in corpus or uploads local file
2. `loadSelectedCorpus()` fetches/reads text
3. Dispatch by file type:
   - `parseJsonCorpus(text)`
   - `parseTextCorpus(text)`
4. Difficulty ensured via `ensureDifficulty()` (explicit or heuristic)
5. Start button enabled when parse succeeds

### JSON Format Expectations

Each question is normalized to:

- `id`
- `category`
- `type`
- `prompt`
- `choices` (must be 4)
- `correctIndex` (derived from letter answer)
- optional `visual`
- optional `difficulty` and `difficultyRationale`

Invalid rows are filtered out if prompt/choices/correct answer are incomplete.

### Text Format Expectations

Parser assumptions:

- Questions are separated as numbered blocks (`1.`, `2.`, ...)
- Optional per-question line: `DIFFICULTY: X/10`
- Choices are `A)` through `D)` lines
- Global footer section required: `ANSWER KEY:` followed by A-D tokens

Failure modes produce user-visible load errors.

## Test Assembly Logic

`buildTestQuestions()` constructs each run:

- Target distribution:
  - Numeric / Logic: 18
  - Verbal: 16
  - Spatial: 16
- Fallback fill if category pools are short
- Truncate to 50
- Shuffle answer order per question (`cloneQuestionWithShuffledChoices`)
- Order mode:
  - `random`: full random
  - `progressive`: sort by estimated/declared difficulty (easy -> hard), then category tiebreak

## Runtime Flow

1. `startTest()` initializes state, timers, and first question
2. `renderQuestion()` paints prompt + choices (+ SVG visual when present)
3. User answers via click or keyboard (`A`..`D`)
4. `selectAnswer()` records response/time and advances after brief delay
5. `updateTimer()` updates global countdown and per-question pacing indicators
6. Stop or timeout triggers `finishTest()`
7. `renderSummary()` produces score/time stats and review grid

### Timing/Pacing Model

- Full test: 15 minutes (`TEST_SECONDS = 900`)
- Per-question pacing bar: 60s visualization range
- Color/audio thresholds:
  - yellow at 18s
  - red at 45s
- under 3s is treated as skipped for summary label purposes (`SKIPPED_SECONDS = 3`)

## Visual Question System

`renderVisual()` dispatches SVG generators by `visual.kind`:

- `polygon`
- `basic-shape`
- `arrow`
- `dot-cell`
- `matrix-sides`
- `dot-sequence`
- `arrow-sequence`
- `odd-one-out`
- `shading-matrix`

Visuals are rendered for both stem and answer options when present.

## Summary and Review Modal

Summary screen includes:

- correct count and answered count
- average time
- average time excluding skipped responses
- category filters with per-category metrics
- clickable question cards

Review modal includes:

- original question content
- all choices with "correct answer" / "your choice" badges
- time + difficulty badges
- next/previous navigation
- prompt generation for explanation (`buildExplanationPrompt()`)
- external search and clipboard copy helpers

## Notable Design Decisions

- Single-file app favors portability and zero setup
- Parser is strict about text corpus structure, reducing ambiguous parse states
- Difficulty can be explicit (data-driven) or inferred (heuristic fallback)
- Choice shuffling avoids answer-position memorization
- Progressive mode creates a deliberate easier-to-harder pacing profile

## Risks and Edge Cases Observed

- Any malformed text corpus missing `ANSWER KEY:` will fail load
- If category counts in corpus are insufficient, fallback fill changes intended mix
- Difficulty heuristics are coarse and category-template based
- Visual rendering depends on known `visual.kind` values; unknown kinds render empty
- Timer interval updates every 100ms, which is acceptable here but denser than needed for most UIs

## Function Map (Key Entry Points)

- Load/parsing: `loadSelectedCorpus`, `parseJsonCorpus`, `parseTextCorpus`
- Test generation: `buildTestQuestions`, `shuffleAnswersForTest`
- Test lifecycle: `startTest`, `renderQuestion`, `selectAnswer`, `updateTimer`, `finishTest`, `restartTest`
- Summary/review: `renderSummary`, `renderSummaryQuestions`, `openReviewModal`, `renderReviewModalQuestion`
- Explanation helper: `buildExplanationPrompt`
- Rendering: `renderQuestionContent`, `renderChoiceContent`, `renderVisual` and SVG helpers

## Conclusion

The codebase is a coherent, self-contained CCAT simulator that supports both text-only and mixed visual corpora, enforces a fixed 50-question timed test, and provides robust post-test review tooling. Its core strengths are simplicity, portability, and predictable runtime behavior driven by explicit constants and deterministic test assembly rules.