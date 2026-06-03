import {
  questions,
  TEST_DISTRIBUTION,
  TEST_QUESTION_COUNT,
  els,
  shuffledCopy,
} from "./state.js";

function ensureDifficulty(question) {
  if (question.difficulty === null || question.difficulty === undefined) {
    question.difficulty = estimateDifficulty(question);
    question.difficultyRationale = question.difficultyRationale || difficultyRationale(question);
  }
  return question.difficulty;
}

function difficultyClass(score) {
  if (score >= 8) return "diff-very-high";
  if (score >= 6) return "diff-high";
  if (score >= 4) return "diff-mid";
  return "diff-low";
}

function difficultyLabel(score) {
  return `Difficulty ${score}/10`;
}

function difficultyBadge(question) {
  const score = ensureDifficulty(question);
  return `<span class="difficulty-badge ${difficultyClass(score)}">${difficultyLabel(score)}</span>`;
}

function estimateDifficulty(question) {
  const category = question.category || "";
  const prompt = (question.prompt || "").toLowerCase();
  const kind = (question.visual || {}).kind || "";

  if (category === "Numeric / Logic") {
    if (prompt.includes("working together")) return 7;
    if (prompt.includes("discount") || prompt.includes("profit") || prompt.includes("mixture")) return 5;
    if (prompt.includes("sequence")) return 4;
    if (prompt.includes("average")) return 4;
    return 4;
  }

  if (category === "Verbal") {
    if (prompt.includes("opposite relationship")) return 5;
    if (prompt.includes("does not belong")) return 4;
    if (prompt.includes("______")) return 5;
    if (prompt.includes("synonym relationship")) return 4;
    return 4;
  }

  if (category === "Spatial") {
    if (kind.includes("matrix")) return 5;
    if (kind === "dot-sequence") return 5;
    if (kind === "arrow-sequence") return 4;
    if (kind === "odd-one-out") return 3;
    if (kind === "shading-matrix") return 4;
    return 4;
  }

  return 4;
}

function difficultyRationale(question) {
  const category = question.category || "";
  const kind = (question.visual || {}).kind || "";

  if (category === "Spatial") {
    return kind ? `Visual template: ${kind}` : "Spatial reasoning";
  }

  if (category === "Numeric / Logic") {
    return "Numeric reasoning heuristic";
  }

  if (category === "Verbal") {
    return "Verbal reasoning heuristic";
  }

  return "General heuristic";
}

function cloneQuestionWithShuffledChoices(question) {
  const originalCorrect = question.correctIndex;
  const clonedChoices = (question.choices || []).map((choice, index) => ({
    ...(typeof choice === "string" ? { text: choice } : choice),
    __originalIndex: index,
  }));

  const shuffledChoices = shuffledCopy(clonedChoices);
  const newCorrectIndex = shuffledChoices.findIndex((choice) => choice.__originalIndex === originalCorrect);

  return {
    ...question,
    choices: shuffledChoices.map(({ __originalIndex, ...choice }) => choice),
    correctIndex: newCorrectIndex,
  };
}

function shuffleAnswersForTest(testQuestions) {
  return testQuestions.map(cloneQuestionWithShuffledChoices);
}

function buildTestQuestions() {
  const selected = [];
  const used = new Set();

  Object.entries(TEST_DISTRIBUTION).forEach(([category, count]) => {
    shuffledCopy(questions.filter((question) => question.category === category))
      .slice(0, count)
      .forEach((question) => {
        selected.push(question);
        used.add(question);
      });
  });

  if (selected.length < TEST_QUESTION_COUNT) {
    shuffledCopy(questions)
      .filter((question) => !used.has(question))
      .slice(0, TEST_QUESTION_COUNT - selected.length)
      .forEach((question) => selected.push(question));
  }

  const sampled = selected.slice(0, TEST_QUESTION_COUNT);
  const mode = els.testOrderSelect?.value || "progressive";

  if (mode === "random") {
    return shuffleAnswersForTest(shuffledCopy(sampled));
  }

  return shuffleAnswersForTest(
    shuffledCopy(sampled).sort((a, b) => {
      const da = ensureDifficulty(a);
      const db = ensureDifficulty(b);
      if (da !== db) {
        return da - db;
      }
      return (a.category || "").localeCompare(b.category || "");
    }),
  );
}

export {
  ensureDifficulty,
  difficultyClass,
  difficultyLabel,
  difficultyBadge,
  estimateDifficulty,
  difficultyRationale,
  cloneQuestionWithShuffledChoices,
  shuffleAnswersForTest,
  buildTestQuestions,
};