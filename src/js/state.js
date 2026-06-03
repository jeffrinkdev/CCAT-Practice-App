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

const els = {
  header: document.getElementById("header"),
  timer: document.getElementById("timer"),
  startScreen: document.getElementById("startScreen"),
  questionScreen: document.getElementById("questionScreen"),
  summaryScreen: document.getElementById("summaryScreen"),
  corpusSelect: document.getElementById("corpusSelect"),
  corpusFileInput: document.getElementById("corpusFileInput"),
  testOrderSelect: document.getElementById("testOrderSelect"),
  loadCorpusBtn: document.getElementById("loadCorpusBtn"),
  startBtn: document.getElementById("startBtn"),
  corpusStatus: document.getElementById("corpusStatus"),
  stopBtn: document.getElementById("stopBtn"),
  headerRestartBtn: document.getElementById("headerRestartBtn"),
  loadError: document.getElementById("loadError"),
  questionCounter: document.getElementById("questionCounter"),
  questionContent: document.getElementById("questionContent"),
  answers: document.getElementById("answers"),
  progressFill: document.getElementById("progressFill"),
  timingPosition: document.getElementById("timingPosition"),
  timingPositionText: document.getElementById("timingPositionText"),
  summaryStats: document.getElementById("summaryStats"),
  categoryControls: document.getElementById("categoryControls"),
  summaryContainer: document.getElementById("summaryContainer"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  prevReviewBtn: document.getElementById("prevReviewBtn"),
  nextReviewBtn: document.getElementById("nextReviewBtn"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  googleSearchBtn: document.getElementById("googleSearchBtn"),
  copyPromptBtn: document.getElementById("copyPromptBtn"),
  copyStatus: document.getElementById("copyStatus"),
  modalTitle: document.getElementById("modalTitle"),
  modalBadges: document.getElementById("modalBadges"),
  modalQuestionContent: document.getElementById("modalQuestionContent"),
  modalAnswers: document.getElementById("modalAnswers"),
};

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
  const option = els.corpusSelect.selectedOptions[0];
  return option?.dataset.type || (els.corpusSelect.value.endsWith(".json") ? "json" : "txt");
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
