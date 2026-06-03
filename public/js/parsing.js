import {
  els,
  questions,
  TEST_DISTRIBUTION,
  TEST_QUESTION_COUNT,
  normalizeCategory,
  letterToIndex,
  countByCategory,
  shuffledCopy,
  escapeHtml,
} from "./state.js";

async function loadSelectedCorpus() {
  els.loadError.classList.add("hidden");

  try {
    let text;
    let type;

    if (els.corpusFileInput.files.length) {
      const file = els.corpusFileInput.files[0];
      text = await file.text();
      type = file.name.toLowerCase().endsWith(".json") ? "json" : "txt";
    } else {
      const path = els.corpusSelect.value;
      type = selectedCorpusType();
      const response = await fetch(path, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Could not load ${path}: HTTP ${response.status}`);
      }

      text = await response.text();
    }

    questions = type === "json" ? parseJsonCorpus(text) : parseTextCorpus(text);

    if (!questions.length) {
      throw new Error("No questions parsed.");
    }

    questions.forEach(ensureDifficulty);
    els.startBtn.disabled = false;
    els.startBtn.textContent = "Start Test";

    const counts = countByCategory(questions);
    els.corpusStatus.textContent = `Loaded ${questions.length} questions · ${Object.entries(counts)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ")}`;
  } catch (error) {
    questions = [];
    els.startBtn.disabled = true;
    els.startBtn.textContent = "Load a corpus first";
    els.loadError.classList.remove("hidden");
    els.loadError.innerHTML = `<strong>Unable to load corpus.</strong><br>${escapeHtml(
      error.message,
    )}<br><br>For server-loaded files, place the selected corpus in the same folder as this HTML file and run <code>python3 -m http.server</code>.`;
  }
}

function parseJsonCorpus(text) {
  const data = JSON.parse(text);
  const raw = Array.isArray(data) ? data : data.questions || [];

  return raw
    .map((item, idx) => ({
      id: item.id || `Q${idx + 1}`,
      category: normalizeCategory(item.category),
      type: item.type || "text",
      prompt: item.prompt || item.text || "",
      choices: (item.choices || []).map((choice) =>
        typeof choice === "string" ? { text: choice } : choice,
      ),
      correctIndex: letterToIndex(item.answer),
      visual: item.visual || null,
      difficulty: item.difficulty ?? null,
      difficultyRationale: item.difficultyRationale || "",
    }))
    .filter((question) => question.prompt && question.choices.length === 4 && question.correctIndex >= 0);
}

function parseTextCorpus(text) {
  const keyMatch = text.match(/ANSWER\s*KEY\s*:\s*([\s\S]+)$/i);
  if (!keyMatch) {
    throw new Error("Missing ANSWER KEY section.");
  }

  const keys = keyMatch[1]
    .split(/[,\s]+/)
    .map((token) => token.trim().toUpperCase())
    .filter((token) => /^[A-D]$/.test(token));

  const body = text.slice(0, keyMatch.index).trim();
  const blocks = body
    .split(/\n\s*\n(?=\d+\.\s+)/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block, index) => {
      const lines = block
        .split(/\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.trim() !== "");

      const first = lines[0].match(/^(\d+)\.\s*(.+)$/);
      if (!first) {
        throw new Error(`Question ${index + 1} missing header.`);
      }

      let difficulty = null;
      let difficultyRationale = "";
      const contentLines = [];

      for (const line of lines.slice(1)) {
        const diffMatch = line.match(/^DIFFICULTY:\s*(\d+)\s*\/\s*10/i);
        if (diffMatch) {
          difficulty = Number(diffMatch[1]);
          difficultyRationale = "Text corpus difficulty annotation";
          continue;
        }
        contentLines.push(line);
      }

      const choiceStart = contentLines.findIndex((line) => /^[A-D]\)\s*/.test(line));
      if (choiceStart < 0) {
        throw new Error(`Question ${index + 1} missing choices.`);
      }

      return {
        id: `T${index + 1}`,
        category: normalizeCategory(first[2].trim()),
        type: "text",
        prompt: contentLines.slice(0, choiceStart).join("\n").trim(),
        choices: contentLines.slice(choiceStart).map((line) => ({
          text: (line.match(/^[A-D]\)\s*(.*)$/) || [])[1]?.trim() || line.trim(),
        })),
        correctIndex: letterToIndex(keys[index]),
        difficulty,
        difficultyRationale,
      };
    })
    .filter((question) => question.correctIndex >= 0);
}

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
  loadSelectedCorpus,
  parseJsonCorpus,
  parseTextCorpus,
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
