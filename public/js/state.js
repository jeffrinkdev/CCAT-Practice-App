let questions = [];
let activeQuestions = [];

const TEST_SECONDS = 15 * 60;
const TEST_QUESTION_COUNT = 50;
const QUESTION_BAR_SECONDS = 60;
const QUESTION_YELLOW_SECONDS = 18;
const QUESTION_RED_SECONDS = 45;
const SKIPPED_SECONDS = 3;
const ANSWER_ADVANCE_DELAY_MS = 220;

const TEST_DISTRIBUTION = {
  "Numeric / Logic": 18,
  Verbal: 16,
  Spatial: 16,
};

const CORPUS_OPTIONS = [
  {
    value: "/data/questions-text.txt",
    type: "txt",
    label: "Text corpus: questions-text.txt",
  },
  {
    value: "/data/questions-visual.json",
    type: "json",
    label: "Mixed visual corpus: questions-visual.json",
  },
];

const elementIds = {
  header: "header",
  timer: "timer",
  startScreen: "startScreen",
  questionScreen: "questionScreen",
  summaryScreen: "summaryScreen",
  corpusSelect: "corpusSelect",
  corpusFileInput: "corpusFileInput",
  testOrderSelect: "testOrderSelect",
  loadCorpusBtn: "loadCorpusBtn",
  startBtn: "startBtn",
  corpusStatus: "corpusStatus",
  stopBtn: "stopBtn",
  headerRestartBtn: "headerRestartBtn",
  loadError: "loadError",
  questionCounter: "questionCounter",
  questionContent: "questionContent",
  answers: "answers",
  progressFill: "progressFill",
  timingPosition: "timingPosition",
  timingPositionText: "timingPositionText",
  summaryStats: "summaryStats",
  categoryControls: "categoryControls",
  summaryContainer: "summaryContainer",
  modalBackdrop: "modalBackdrop",
  prevReviewBtn: "prevReviewBtn",
  nextReviewBtn: "nextReviewBtn",
  closeModalBtn: "closeModalBtn",
  googleSearchBtn: "googleSearchBtn",
  copyPromptBtn: "copyPromptBtn",
  copyStatus: "copyStatus",
  modalTitle: "modalTitle",
  modalBadges: "modalBadges",
  modalQuestionContent: "modalQuestionContent",
  modalAnswers: "modalAnswers",
};

const els = Object.fromEntries(Object.keys(elementIds).map((key) => [key, null]));

function refreshElements(root = document) {
  if (!root?.getElementById) {
    return els;
  }

  Object.entries(elementIds).forEach(([key, id]) => {
    els[key] = root.getElementById(id);
  });

  return els;
}

if (typeof document !== "undefined") {
  refreshElements();
}

const state = {
  currentIndex: 0,
  testStartedAt: 0,
  questionStartedAt: 0,
  intervalId: null,
  isAdvancing: false,
  stoppedEarly: false,
  activeCategory: "All",
  activeReviewIndexes: [],
  currentReviewPosition: 0,
  currentReviewQuestionIndex: null,
  results: [],
  chimed18: false,
  chimed45: false,
};

function normalizeCategory(category) {
  return String(category || "General")
    .replace(/Math\s*&\s*Logic/i, "Numeric / Logic")
    .replace(/Spatial Reasoning/i, "Spatial")
    .replace(/Verbal Ability/i, "Verbal");
}

function selectedCorpusType() {
  const option = els.corpusSelect?.selectedOptions?.[0];
  return option?.dataset.type || (els.corpusSelect?.value?.endsWith(".json") ? "json" : "txt");
}

function letterToIndex(letter) {
  return "ABCD".indexOf(String(letter || "").toUpperCase());
}

function countByCategory(items) {
  return items.reduce((acc, question) => {
    acc[question.category] = (acc[question.category] || 0) + 1;
    return acc;
  }, {});
}

function shuffledCopy(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatSeconds(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function elapsedQuestionSeconds() {
  return (Date.now() - state.questionStartedAt) / 1000;
}

function elapsedTestSeconds() {
  return (Date.now() - state.testStartedAt) / 1000;
}

function playTone(frequency, offset = 0, duration = 0.09) {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    const context = playTone.ctx || new AudioContextCtor();
    playTone.ctx = context;

    const start = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(0.16, start + 0.012);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  } catch {
    // Ignore audio API failures.
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setQuestions(nextQuestions) {
  questions.length = 0;
  questions.push(...nextQuestions);
}

function clearQuestions() {
  questions.length = 0;
}

function setActiveQuestions(nextQuestions) {
  activeQuestions.length = 0;
  activeQuestions.push(...nextQuestions);
}

function clearActiveQuestions() {
  activeQuestions.length = 0;
}

export {
  questions,
  activeQuestions,
  TEST_SECONDS,
  TEST_QUESTION_COUNT,
  QUESTION_BAR_SECONDS,
  QUESTION_YELLOW_SECONDS,
  QUESTION_RED_SECONDS,
  SKIPPED_SECONDS,
  ANSWER_ADVANCE_DELAY_MS,
  TEST_DISTRIBUTION,
  CORPUS_OPTIONS,
  els,
  state,
  normalizeCategory,
  selectedCorpusType,
  letterToIndex,
  countByCategory,
  shuffledCopy,
  formatSeconds,
  elapsedQuestionSeconds,
  elapsedTestSeconds,
  playTone,
  escapeHtml,
  refreshElements,
  setQuestions,
  clearQuestions,
  setActiveQuestions,
  clearActiveQuestions,
};
