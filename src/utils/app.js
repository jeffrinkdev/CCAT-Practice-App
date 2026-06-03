import {
  questions,
  activeQuestions,
  clearActiveQuestions,
  setActiveQuestions,
  state,
  els,
  refreshElements,
  ANSWER_ADVANCE_DELAY_MS,
  QUESTION_BAR_SECONDS,
  QUESTION_YELLOW_SECONDS,
  QUESTION_RED_SECONDS,
  SKIPPED_SECONDS,
  TEST_SECONDS,
  TEST_QUESTION_COUNT,
  CORPUS_OPTIONS,
  playTone,
  formatSeconds,
  elapsedTestSeconds,
  elapsedQuestionSeconds,
  escapeHtml,
} from "./state.js";
import {
  buildTestQuestions,
  loadSelectedCorpus,
  difficultyBadge,
} from "./parsing.js";
import {
  renderQuestionContent,
  renderChoiceContent,
  updateQuestionFrameHeightForActiveTest,
  updateModalQuestionFrameHeightForReviewSet,
} from "./rendering.js";

let initialized = false;

const SHELL_STATES = {
  start: {
    headerHidden: true,
    startScreenHidden: false,
    questionScreenHidden: true,
    summaryScreenHidden: true,
    stopButtonHidden: false,
    restartButtonHidden: true,
    timerSummaryHidden: false,
  },
  question: {
    headerHidden: false,
    startScreenHidden: true,
    questionScreenHidden: false,
    summaryScreenHidden: true,
    stopButtonHidden: false,
    restartButtonHidden: true,
    timerSummaryHidden: false,
  },
  summary: {
    headerHidden: false,
    startScreenHidden: true,
    questionScreenHidden: true,
    summaryScreenHidden: false,
    stopButtonHidden: true,
    restartButtonHidden: false,
    timerSummaryHidden: true,
  },
};

function toggleClass(element, className, enabled) {
  element?.classList.toggle(className, enabled);
}

function syncShellState(nextState) {
  toggleClass(els.header, "hidden", nextState.headerHidden);
  toggleClass(els.startScreen, "hidden", nextState.startScreenHidden);
  toggleClass(els.questionScreen, "hidden", nextState.questionScreenHidden);
  toggleClass(els.summaryScreen, "hidden", nextState.summaryScreenHidden);
  toggleClass(els.stopBtn, "hidden", nextState.stopButtonHidden);
  toggleClass(els.headerRestartBtn, "hidden", nextState.restartButtonHidden);
  toggleClass(els.timer, "summary-hidden", nextState.timerSummaryHidden);

  window.__ccatReactBridge?.syncShell?.(nextState);
}

function hasRequiredElements() {
  return Boolean(
    els.header &&
    els.timer &&
    els.startScreen &&
    els.questionScreen &&
    els.summaryScreen &&
    els.corpusSelect &&
    els.corpusFileInput &&
    els.testOrderSelect &&
    els.loadCorpusBtn &&
    els.startBtn &&
    els.corpusStatus &&
    els.stopBtn &&
    els.headerRestartBtn &&
    els.loadError &&
    els.questionCounter &&
    els.questionContent &&
    els.answers &&
    els.progressFill &&
    els.timingPosition &&
    els.timingPositionText &&
    els.summaryStats &&
    els.categoryControls &&
    els.summaryContainer &&
    els.modalBackdrop &&
    els.prevReviewBtn &&
    els.nextReviewBtn &&
    els.closeModalBtn &&
    els.googleSearchBtn &&
    els.copyPromptBtn &&
    els.copyStatus &&
    els.modalTitle &&
    els.modalBadges &&
    els.modalQuestionContent &&
    els.modalAnswers,
  );
}

function startTest() {
  if (!questions.length) {
    return;
  }

  setActiveQuestions(buildTestQuestions());
  state.currentIndex = 0;
  state.results = [];
  state.stoppedEarly = false;
  state.activeCategory = "All";
  state.activeReviewIndexes = [];
  state.currentReviewPosition = 0;
  state.currentReviewQuestionIndex = null;
  state.testStartedAt = Date.now();
  state.questionStartedAt = Date.now();

  syncShellState(SHELL_STATES.question);

  updateQuestionFrameHeightForActiveTest();
  renderQuestion();
  updateTimer();

  state.intervalId = setInterval(updateTimer, 100);
}

function renderQuestion() {
  state.isAdvancing = false;
  state.questionStartedAt = Date.now();
  state.chimed18 = false;
  state.chimed45 = false;

  const question = activeQuestions[state.currentIndex];
  els.timer.classList.remove("yellow", "red");
  els.questionCounter.textContent = `Question ${state.currentIndex + 1} of ${activeQuestions.length} · ${question.category
    }`;

  renderQuestionContent(question, els.questionContent);
  els.answers.innerHTML = "";

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "answer-btn";
    button.type = "button";
    button.innerHTML = `<span class="answer-label">${String.fromCharCode(65 + index)}</span>${renderChoiceContent(
      choice,
    )}`;
    button.addEventListener("click", () => selectAnswer(index, button));
    els.answers.appendChild(button);
  });

  els.progressFill.style.width = `${(state.currentIndex / activeQuestions.length) * 100}%`;
  updateTimer();
}

function selectAnswer(choiceIndex, button) {
  if (state.isAdvancing) {
    return;
  }

  state.isAdvancing = true;

  const question = activeQuestions[state.currentIndex];
  const timeSpentSeconds = elapsedQuestionSeconds();

  button.classList.add("selected");
  playTone(660, 0, 0.08);

  state.results.push({
    questionIndex: state.currentIndex,
    choiceIndex,
    correctIndex: question.correctIndex,
    isCorrect: choiceIndex === question.correctIndex,
    timeSpentSeconds,
  });

  setTimeout(() => {
    state.currentIndex += 1;
    if (state.currentIndex >= activeQuestions.length) {
      finishTest();
    } else {
      renderQuestion();
    }
  }, ANSWER_ADVANCE_DELAY_MS);
}

function updateTimer() {
  const remaining = TEST_SECONDS - elapsedTestSeconds();
  els.timer.textContent = formatSeconds(remaining);

  const questionElapsed = elapsedQuestionSeconds();
  els.timer.classList.toggle(
    "yellow",
    questionElapsed >= QUESTION_YELLOW_SECONDS && questionElapsed < QUESTION_RED_SECONDS,
  );
  els.timer.classList.toggle("red", questionElapsed >= QUESTION_RED_SECONDS);

  updateQuestionTimingBar(questionElapsed);

  if (!state.chimed18 && questionElapsed >= QUESTION_YELLOW_SECONDS) {
    state.chimed18 = true;
    playTone(880, 0, 0.16);
  }

  if (!state.chimed45 && questionElapsed >= QUESTION_RED_SECONDS) {
    state.chimed45 = true;
    playTone(740, 0, 0.12);
    playTone(740, 0.18, 0.12);
  }

  if (remaining <= 0) {
    finishTest();
  }
}

function updateQuestionTimingBar(seconds) {
  const percentage = (Math.min(Math.max(seconds, 0), QUESTION_BAR_SECONDS) / QUESTION_BAR_SECONDS) * 100;
  els.timingPosition.style.left = `${percentage}%`;
  els.timingPositionText.textContent = `${seconds.toFixed(1)}s / ${QUESTION_BAR_SECONDS}s`;
}

function stopTest() {
  state.stoppedEarly = true;
  finishTest();
}

function restartTest() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }

  state.intervalId = null;
  clearActiveQuestions();
  state.currentIndex = 0;
  state.results = [];
  state.isAdvancing = false;
  state.stoppedEarly = false;
  state.activeCategory = "All";
  state.activeReviewIndexes = [];
  state.currentReviewPosition = 0;
  state.currentReviewQuestionIndex = null;

  syncShellState(SHELL_STATES.start);
  els.modalBackdrop.classList.add("hidden");

  els.timer.textContent = "15:00";
  els.timer.classList.remove("yellow", "red", "summary-hidden");
  els.progressFill.style.width = "0%";
  els.answers.innerHTML = "";
  els.summaryStats.innerHTML = "";
  els.categoryControls.innerHTML = "";
  els.summaryContainer.innerHTML = "";
  els.questionContent.innerHTML = "";
}

function finishTest() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  state.intervalId = null;

  while (state.results.length < activeQuestions.length) {
    const index = state.results.length;
    state.results.push({
      questionIndex: index,
      choiceIndex: null,
      correctIndex: activeQuestions[index].correctIndex,
      isCorrect: false,
      timeSpentSeconds: index === state.currentIndex ? elapsedQuestionSeconds() : 0,
      timedOut: !state.stoppedEarly,
      stoppedEarly: state.stoppedEarly,
    });
  }

  syncShellState(SHELL_STATES.summary);

  renderSummary();
}

function renderSummary() {
  const correct = state.results.filter((result) => result.isCorrect).length;
  const total = activeQuestions.length;
  const answered = state.results.filter((result) => result.choiceIndex !== null).length;
  const average = averageTime(state.results);
  const averageNoSkips = averageTime(
    state.results.filter((result) => result.timeSpentSeconds >= SKIPPED_SECONDS),
  );

  els.summaryStats.innerHTML = `
    <div class="stat"><span class="muted">Correct</span><strong>${correct} / ${total}</strong></div>
    <div class="stat"><span class="muted">Answered</span><strong>${answered} / ${total}</strong></div>
    <div class="stat"><span class="muted">Average time</span><strong>${formatMetricSeconds(average)}</strong></div>
    <div class="stat"><span class="muted">Average time, not skipped</span><strong>${formatMetricSeconds(
    averageNoSkips,
  )}</strong></div>
  `;

  renderCategoryControls();
  renderSummaryQuestions();
}

function renderCategoryControls() {
  const categories = ["All", ...Array.from(new Set(activeQuestions.map((question) => question.category)))];
  els.categoryControls.innerHTML = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-btn ${state.activeCategory === category ? "active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.activeCategory = category;
      renderCategoryControls();
      renderSummaryQuestions();
    });
    els.categoryControls.appendChild(button);
  });
}

function renderSummaryQuestions() {
  els.summaryContainer.innerHTML = "";

  if (state.activeCategory === "All") {
    const section = document.createElement("section");
    section.className = "category-section";
    section.innerHTML = '<h3 class="category-title">All Questions — numerical order</h3>';
    section.appendChild(renderResultGrid(state.results));
    els.summaryContainer.appendChild(section);
    return;
  }

  const results = state.results.filter(
    (result) => activeQuestions[result.questionIndex].category === state.activeCategory,
  );
  const correct = results.filter((result) => result.isCorrect).length;
  const average = averageTime(results);
  const averageNoSkips = averageTime(results.filter((result) => result.timeSpentSeconds >= SKIPPED_SECONDS));

  const section = document.createElement("section");
  section.className = "category-section";
  section.innerHTML = `<h3 class="category-title">${state.activeCategory} — ${correct}/${results.length} · avg ${formatMetricSeconds(
    average,
  )} · not skipped avg ${formatMetricSeconds(averageNoSkips)}</h3>`;
  section.appendChild(renderResultGrid(results));

  els.summaryContainer.appendChild(section);
}

function renderResultGrid(results) {
  const grid = document.createElement("div");
  grid.className = "summary-grid";

  const reviewIndexes = results.map((result) => result.questionIndex);

  results.forEach((result) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `summary-item ${result.isCorrect ? "correct" : "incorrect"}`;
    item.innerHTML = `<strong>#${result.questionIndex + 1}</strong><span>${result.isCorrect ? "Correct" : "Incorrect"
      }</span><br>${renderTimePill(result.timeSpentSeconds)}<br>${difficultyBadge(activeQuestions[result.questionIndex])}`;

    item.addEventListener("click", () => openReviewModal(result.questionIndex, reviewIndexes));
    grid.appendChild(item);
  });

  return grid;
}

function averageTime(results) {
  if (!results.length) {
    return null;
  }
  return results.reduce((sum, result) => sum + result.timeSpentSeconds, 0) / results.length;
}

function formatMetricSeconds(value) {
  return value === null ? "—" : `${value.toFixed(1)}s`;
}

function renderTimePill(seconds) {
  if (seconds < SKIPPED_SECONDS) {
    return '<span class="time-pill skipped">Skipped</span>';
  }

  const cls = seconds >= QUESTION_RED_SECONDS ? "red" : seconds >= QUESTION_YELLOW_SECONDS ? "yellow" : "";
  return `<span class="time-pill ${cls}">${seconds.toFixed(1)}s</span>`;
}

function openReviewModal(questionIndex, reviewIndexes = state.activeReviewIndexes) {
  state.activeReviewIndexes =
    reviewIndexes && reviewIndexes.length
      ? [...reviewIndexes]
      : state.results.map((result) => result.questionIndex);
  state.currentReviewPosition = Math.max(0, state.activeReviewIndexes.indexOf(questionIndex));

  renderReviewModalQuestion(questionIndex);
}

function renderReviewModalQuestion(questionIndex) {
  state.currentReviewQuestionIndex = questionIndex;
  els.copyStatus.textContent = "";

  const question = activeQuestions[questionIndex];
  const result = state.results.find((entry) => entry.questionIndex === questionIndex);

  els.modalTitle.textContent = `Question ${questionIndex + 1} Review`;
  els.modalBadges.innerHTML = `
    <span class="badge">${question.category}</span>
    ${renderTimePill(result.timeSpentSeconds)}
    ${difficultyBadge(question)}
    <span class="badge">${result.isCorrect ? "Correct" : "Incorrect"}</span>
    ${result.timedOut ? '<span class="badge timeout">Timed out</span>' : ""}
    ${result.stoppedEarly ? '<span class="badge">Stopped before answer</span>' : ""}
    ${question.difficultyRationale ? `<span class="badge">${escapeHtml(question.difficultyRationale)}</span>` : ""}
  `;

  renderQuestionContent(question, els.modalQuestionContent);
  els.modalAnswers.innerHTML = "";

  question.choices.forEach((choice, index) => {
    const answer = document.createElement("div");
    const isCorrect = index === question.correctIndex;
    const isUser = index === result.choiceIndex;

    answer.className = "modal-answer";
    if (isCorrect) {
      answer.classList.add("correct-choice");
    }
    if (isUser && !result.isCorrect) {
      answer.classList.add("user-wrong-choice");
    }

    const badges = [];
    if (isCorrect) {
      badges.push('<span class="modal-answer-marker correct-marker">Correct answer</span>');
    }
    if (isUser) {
      badges.push('<span class="modal-answer-marker user-marker">Your choice</span>');
    }

    answer.innerHTML = `<div class="modal-answer-main"><strong>${String.fromCharCode(65 + index)}.</strong> ${renderChoiceContent(
      choice,
    )}</div><div class="modal-answer-markers">${badges.join("")}</div>`;

    els.modalAnswers.appendChild(answer);
  });

  updateReviewNavButtons();
  els.modalBackdrop.classList.remove("hidden");
  updateModalQuestionFrameHeightForReviewSet();
  els.closeModalBtn.focus();
}

function updateReviewNavButtons() {
  els.prevReviewBtn.disabled = state.currentReviewPosition <= 0;
  els.nextReviewBtn.disabled = state.currentReviewPosition >= state.activeReviewIndexes.length - 1;
}

function showAdjacentReview(direction) {
  const next = state.currentReviewPosition + direction;
  if (next < 0 || next >= state.activeReviewIndexes.length) {
    return;
  }

  state.currentReviewPosition = next;
  renderReviewModalQuestion(state.activeReviewIndexes[state.currentReviewPosition]);
}

function getCurrentReviewPayload() {
  const questionIndex = state.currentReviewQuestionIndex;
  if (questionIndex === null) {
    return null;
  }

  const question = activeQuestions[questionIndex];
  const result = state.results.find((entry) => entry.questionIndex === questionIndex);
  if (!question || !result) {
    return null;
  }

  return {
    questionNumber: questionIndex + 1,
    category: question.category,
    questionText: question.prompt,
    choices: question.choices.map((choice) => choice.text || "[visual choice]"),
    correctLetter: String.fromCharCode(65 + question.correctIndex),
    correctAnswer: question.choices[question.correctIndex].text || "[visual choice]",
    userLetter: result.choiceIndex === null ? "No answer" : String.fromCharCode(65 + result.choiceIndex),
    userAnswer:
      result.choiceIndex === null ? "No answer" : question.choices[result.choiceIndex].text || "[visual choice]",
    timeSpentSeconds: result.timeSpentSeconds,
  };
}

function buildExplanationPrompt() {
  const payload = getCurrentReviewPayload();
  if (!payload) {
    return "";
  }

  const choices = payload.choices.map((choice, index) => `${String.fromCharCode(65 + index)}) ${choice}`).join("\n");

  return `Explain this CCAT-style cognitive aptitude question.

Question #${payload.questionNumber}
Category: ${payload.category}

Question:
${payload.questionText}

Choices:
${choices}

Correct answer:
${payload.correctLetter}) ${payload.correctAnswer}

My answer:
${payload.userLetter}${payload.userLetter === "No answer" ? "" : `) ${payload.userAnswer}`}

Time spent:
${payload.timeSpentSeconds.toFixed(1)} seconds

Please explain:
1. Why the correct answer is correct
2. Why my answer is wrong, if applicable
3. The fastest way to solve this under time pressure
4. Any pattern-recognition shortcut or test-taking trick`;
}

function searchCurrentReviewOnGoogle() {
  const prompt = buildExplanationPrompt();
  if (!prompt) {
    return;
  }

  window.open(
    `https://www.google.com/search?q=${encodeURIComponent(prompt.replace(/\s+/g, " ").slice(0, 1800))}`,
    "_blank",
    "noopener,noreferrer",
  );
}

async function copyCurrentReviewPrompt() {
  const prompt = buildExplanationPrompt();
  if (!prompt) {
    return;
  }

  try {
    await navigator.clipboard.writeText(prompt);
    els.copyStatus.textContent = "Copied.";
  } catch {
    fallbackCopyText(prompt);
  }

  setTimeout(() => {
    if (els.copyStatus.textContent === "Copied.") {
      els.copyStatus.textContent = "";
    }
  }, 1800);
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";

  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
    els.copyStatus.textContent = "Copied.";
  } catch {
    els.copyStatus.textContent = "Copy failed.";
  } finally {
    document.body.removeChild(textarea);
  }
}

function handleAnswerKey(event) {
  if (
    els.questionScreen.classList.contains("hidden") ||
    !els.modalBackdrop.classList.contains("hidden") ||
    state.isAdvancing
  ) {
    return;
  }

  const key = event.key.toUpperCase();
  if (!/^[A-D]$/.test(key)) {
    return;
  }

  const index = key.charCodeAt(0) - 65;
  const button = els.answers.querySelectorAll(".answer-btn")[index];
  if (!button) {
    return;
  }

  event.preventDefault();
  selectAnswer(index, button);
}

function closeModal() {
  els.modalBackdrop.classList.add("hidden");
}

function renderCorpusOptions() {
  els.corpusSelect.innerHTML = "";

  CORPUS_OPTIONS.forEach((optionConfig, index) => {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.dataset.type = optionConfig.type;
    option.textContent = optionConfig.label;
    option.selected = index === 0;
    els.corpusSelect.appendChild(option);
  });
}

function bindEvents() {
  els.loadCorpusBtn.addEventListener("click", loadSelectedCorpus);
  els.corpusSelect.addEventListener("change", () => {
    els.corpusFileInput.value = "";
    loadSelectedCorpus();
  });
  els.corpusFileInput.addEventListener("change", loadSelectedCorpus);
  els.startBtn.addEventListener("click", startTest);
  els.stopBtn.addEventListener("click", stopTest);
  els.headerRestartBtn.addEventListener("click", restartTest);
  els.prevReviewBtn.addEventListener("click", () => showAdjacentReview(-1));
  els.nextReviewBtn.addEventListener("click", () => showAdjacentReview(1));
  els.googleSearchBtn.addEventListener("click", searchCurrentReviewOnGoogle);
  els.copyPromptBtn.addEventListener("click", copyCurrentReviewPrompt);
  els.closeModalBtn.addEventListener("click", closeModal);
  els.modalBackdrop.addEventListener("click", (event) => {
    if (event.target === els.modalBackdrop) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!els.modalBackdrop.classList.contains("hidden")) {
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showAdjacentReview(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showAdjacentReview(1);
      }
      return;
    }

    handleAnswerKey(event);
  });

  window.addEventListener("resize", () => {
    if (!els.questionScreen.classList.contains("hidden")) {
      updateQuestionFrameHeightForActiveTest();
    }

    if (!els.modalBackdrop.classList.contains("hidden")) {
      updateModalQuestionFrameHeightForReviewSet();
    }
  });
}

function initApp(root = document) {
  refreshElements(root);

  if (initialized || !hasRequiredElements()) {
    return initialized;
  }

  renderCorpusOptions();
  bindEvents();
  loadSelectedCorpus();
  initialized = true;

  return true;
}

if (typeof document !== "undefined") {
  initApp();
}

export { initApp };
