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
  setStartViewCallback,
} from "./parsing.js";
import {
  buildQuestionHtml,
  renderQuestionContent,
  renderChoiceContent,
  updateQuestionFrameHeightForActiveTest,
  updateModalQuestionFrameHeightForReviewSet,
} from "./rendering.js";

let initialized = false;
let shellStateCallback = null;
let questionViewCallback = null;
let summaryViewCallback = null;
let modalViewCallback = null;
let isModalOpen = false;

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

  shellStateCallback?.(nextState);
}

function syncQuestionView(patch) {
  questionViewCallback?.(patch);
}

function syncSummaryView(data) {
  summaryViewCallback?.(data);
}

function syncModalView(patch) {
  if ("open" in patch) isModalOpen = patch.open;
  modalViewCallback?.(patch);
}

function syncCopyStatus(text) {
  if (modalViewCallback) {
    syncModalView({ copyStatus: text });
  } else {
    els.copyStatus.textContent = text;
  }
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

  const choices = question.choices.map((choice, index) => ({
    index,
    label: String.fromCharCode(65 + index),
    contentHtml: renderChoiceContent(choice),
  }));

  syncQuestionView({
    timerYellow: false,
    timerRed: false,
    counterText: `Question ${state.currentIndex + 1} of ${activeQuestions.length} · ${question.category}`,
    questionHtml: buildQuestionHtml(question),
    progressPct: (state.currentIndex / activeQuestions.length) * 100,
    choices,
    selectedChoiceIndex: null,
  });

  if (!questionViewCallback) {
    els.answers.innerHTML = "";
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.className = "answer-btn";
      button.type = "button";
      button.innerHTML = `<span class="answer-label">${String.fromCharCode(65 + index)}</span>${renderChoiceContent(choice)}`;
      button.addEventListener("click", () => selectAnswer(index, button));
      els.answers.appendChild(button);
    });
  }

  updateTimer();
}

function selectAnswer(choiceIndex, button) {
  if (state.isAdvancing) {
    return;
  }

  state.isAdvancing = true;

  const question = activeQuestions[state.currentIndex];
  const timeSpentSeconds = elapsedQuestionSeconds();

  if (questionViewCallback) {
    syncQuestionView({ selectedChoiceIndex: choiceIndex });
  } else {
    button?.classList.add("selected");
  }
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
  const timerText = formatSeconds(remaining);
  const questionElapsed = elapsedQuestionSeconds();
  const timerYellow = questionElapsed >= QUESTION_YELLOW_SECONDS && questionElapsed < QUESTION_RED_SECONDS;
  const timerRed = questionElapsed >= QUESTION_RED_SECONDS;

  syncQuestionView({ timerText, timerYellow, timerRed });

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
  const timingPct = (Math.min(Math.max(seconds, 0), QUESTION_BAR_SECONDS) / QUESTION_BAR_SECONDS) * 100;
  syncQuestionView({
    timingPct,
    timingText: `${seconds.toFixed(1)}s / ${QUESTION_BAR_SECONDS}s`,
  });
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
  syncQuestionView({
    timerText: "15:00",
    timerYellow: false,
    timerRed: false,
    counterText: "",
    questionHtml: "",
    progressPct: 0,
    timingPct: 0,
    timingText: `0.0s / ${QUESTION_BAR_SECONDS}s`,
    choices: [],
    selectedChoiceIndex: null,
  });

  syncSummaryView({
    correct: 0, total: 0, answered: 0,
    averageText: "—", averageNoSkipsText: "—",
    categories: [], activeCategory: "All", sections: [],
  });

  syncModalView({ open: false, title: "", badgesHtml: "", questionHtml: "", answers: [], prevDisabled: true, nextDisabled: true, copyStatus: "" });

  els.modalBackdrop.classList.add("hidden");

  // keep for live-test compat: timer text is asserted after restart without React
  els.timer.textContent = "15:00";
  els.answers.innerHTML = "";
  els.summaryStats.innerHTML = "";
  els.categoryControls.innerHTML = "";
  els.summaryContainer.innerHTML = "";
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

function buildResultItems(results, reviewIndexes) {
  return results.map((result) => ({
    questionIndex: result.questionIndex,
    isCorrect: result.isCorrect,
    timeSpentSeconds: result.timeSpentSeconds,
    timePillHtml: renderTimePill(result.timeSpentSeconds),
    difficultyHtml: difficultyBadge(activeQuestions[result.questionIndex]),
    reviewIndexes,
  }));
}

function buildSummarySections() {
  if (state.activeCategory === "All") {
    const reviewIndexes = state.results.map((r) => r.questionIndex);
    return [{ title: "All Questions — numerical order", items: buildResultItems(state.results, reviewIndexes) }];
  }

  const results = state.results.filter(
    (r) => activeQuestions[r.questionIndex].category === state.activeCategory,
  );
  const correct = results.filter((r) => r.isCorrect).length;
  const avg = averageTime(results);
  const avgNoSkips = averageTime(results.filter((r) => r.timeSpentSeconds >= SKIPPED_SECONDS));
  const reviewIndexes = results.map((r) => r.questionIndex);
  return [{
    title: `${state.activeCategory} — ${correct}/${results.length} · avg ${formatMetricSeconds(avg)} · not skipped avg ${formatMetricSeconds(avgNoSkips)}`,
    items: buildResultItems(results, reviewIndexes),
  }];
}

function buildSummaryViewData() {
  const correct = state.results.filter((r) => r.isCorrect).length;
  const total = activeQuestions.length;
  const answered = state.results.filter((r) => r.choiceIndex !== null).length;
  const average = averageTime(state.results);
  const averageNoSkips = averageTime(state.results.filter((r) => r.timeSpentSeconds >= SKIPPED_SECONDS));
  const categories = ["All", ...Array.from(new Set(activeQuestions.map((q) => q.category)))];
  return {
    correct, total, answered,
    averageText: formatMetricSeconds(average),
    averageNoSkipsText: formatMetricSeconds(averageNoSkips),
    categories,
    activeCategory: state.activeCategory,
    sections: buildSummarySections(),
  };
}

function renderSummary() {
  if (summaryViewCallback) {
    syncSummaryView(buildSummaryViewData());
    return;
  }

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
  if (summaryViewCallback) {
    syncSummaryView(buildSummaryViewData());
    return;
  }

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
  if (summaryViewCallback) {
    syncSummaryView(buildSummaryViewData());
    return;
  }

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

function buildModalAnswers(question, result) {
  return question.choices.map((choice, index) => {
    const isCorrect = index === question.correctIndex;
    const isUser = index === result.choiceIndex;
    const classes = ["modal-answer"];
    if (isCorrect) classes.push("correct-choice");
    if (isUser && !result.isCorrect) classes.push("user-wrong-choice");
    const badges = [];
    if (isCorrect) badges.push('<span class="modal-answer-marker correct-marker">Correct answer</span>');
    if (isUser) badges.push('<span class="modal-answer-marker user-marker">Your choice</span>');
    return {
      label: String.fromCharCode(65 + index),
      contentHtml: renderChoiceContent(choice),
      badgesHtml: badges.join(""),
      className: classes.join(" "),
    };
  });
}

function renderReviewModalQuestion(questionIndex) {
  state.currentReviewQuestionIndex = questionIndex;

  const question = activeQuestions[questionIndex];
  const result = state.results.find((entry) => entry.questionIndex === questionIndex);

  const badgesHtml = `
    <span class="badge">${question.category}</span>
    ${renderTimePill(result.timeSpentSeconds)}
    ${difficultyBadge(question)}
    <span class="badge">${result.isCorrect ? "Correct" : "Incorrect"}</span>
    ${result.timedOut ? '<span class="badge timeout">Timed out</span>' : ""}
    ${result.stoppedEarly ? '<span class="badge">Stopped before answer</span>' : ""}
    ${question.difficultyRationale ? `<span class="badge">${escapeHtml(question.difficultyRationale)}</span>` : ""}
  `;

  const answers = buildModalAnswers(question, result);
  const prevDisabled = state.currentReviewPosition <= 0;
  const nextDisabled = state.currentReviewPosition >= state.activeReviewIndexes.length - 1;

  syncModalView({
    open: true,
    title: `Question ${questionIndex + 1} Review`,
    badgesHtml,
    questionHtml: buildQuestionHtml(question),
    answers,
    prevDisabled,
    nextDisabled,
    copyStatus: "",
  });

  if (modalViewCallback) {
    updateModalQuestionFrameHeightForReviewSet();
    els.closeModalBtn.focus();
    return;
  }

  els.copyStatus.textContent = "";
  els.modalTitle.textContent = `Question ${questionIndex + 1} Review`;
  els.modalBadges.innerHTML = badgesHtml;
  renderQuestionContent(question, els.modalQuestionContent);
  els.modalAnswers.innerHTML = "";

  answers.forEach(({ label, contentHtml, badgesHtml: answerBadges, className }) => {
    const answer = document.createElement("div");
    answer.className = className;
    answer.innerHTML = `<div class="modal-answer-main"><strong>${label}.</strong> ${contentHtml}</div><div class="modal-answer-markers">${answerBadges}</div>`;
    els.modalAnswers.appendChild(answer);
  });

  updateReviewNavButtons();
  els.modalBackdrop.classList.remove("hidden");
  updateModalQuestionFrameHeightForReviewSet();
  els.closeModalBtn.focus();
}

function updateReviewNavButtons() {
  const prevDisabled = state.currentReviewPosition <= 0;
  const nextDisabled = state.currentReviewPosition >= state.activeReviewIndexes.length - 1;
  if (modalViewCallback) {
    syncModalView({ prevDisabled, nextDisabled });
    return;
  }
  els.prevReviewBtn.disabled = prevDisabled;
  els.nextReviewBtn.disabled = nextDisabled;
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
    syncCopyStatus("Copied.");
  } catch {
    fallbackCopyText(prompt);
  }

  setTimeout(() => {
    if (modalViewCallback) {
      syncModalView({ copyStatus: "" });
    } else if (els.copyStatus.textContent === "Copied.") {
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
    syncCopyStatus("Copied.");
  } catch {
    syncCopyStatus("Copy failed.");
  } finally {
    document.body.removeChild(textarea);
  }
}

function handleAnswerKey(event) {
  if (
    els.questionScreen.classList.contains("hidden") ||
    isModalOpen ||
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
  syncModalView({ open: false });
  if (!modalViewCallback) {
    els.modalBackdrop.classList.add("hidden");
  }
}

function handleCategoryChange(category) {
  state.activeCategory = category;
  syncSummaryView(buildSummaryViewData());
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
  if (!shellStateCallback) {
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
  }

  document.addEventListener("keydown", (event) => {
    if (isModalOpen) {
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

    if (isModalOpen) {
      updateModalQuestionFrameHeightForReviewSet();
    }
  });
}

function initApp(root = document, onShellState, onQuestionView, onSummaryView, onModalView, onStartView) {
  shellStateCallback = onShellState ?? null;
  questionViewCallback = onQuestionView ?? null;
  summaryViewCallback = onSummaryView ?? null;
  modalViewCallback = onModalView ?? null;
  setStartViewCallback(onStartView ?? null);
  refreshElements(root);

  if (!initialized && hasRequiredElements()) {
    renderCorpusOptions();
    bindEvents();
    loadSelectedCorpus();
    initialized = true;
  }

  return {
    handleAnswer: (index) => selectAnswer(index),
    handleCategoryChange,
    openReviewModal,
    loadCorpus: loadSelectedCorpus,
    handleCorpusChange: () => { els.corpusFileInput.value = ""; loadSelectedCorpus(); },
    startTest,
    stopTest,
    restartTest,
    prevReview: () => showAdjacentReview(-1),
    nextReview: () => showAdjacentReview(1),
    googleSearch: searchCurrentReviewOnGoogle,
    copyPrompt: copyCurrentReviewPrompt,
    closeModal,
  };
}

if (typeof document !== "undefined") {
  initApp();
}

export { initApp };
