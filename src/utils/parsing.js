import {
  els,
  questions,
  normalizeCategory,
  selectedCorpusType,
  letterToIndex,
  countByCategory,
  escapeHtml,
  setQuestions,
  clearQuestions,
} from "./state.js";

let startViewCallback = null;

export function setStartViewCallback(fn) {
  startViewCallback = fn ?? null;
}

async function loadSelectedCorpus() {
  if (startViewCallback) {
    startViewCallback({ loadErrorHidden: true });
  } else {
    els.loadError.classList.add("hidden");
  }

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

    setQuestions(type === "json" ? parseJsonCorpus(text) : parseTextCorpus(text));

    if (!questions.length) {
      throw new Error("No questions parsed.");
    }

    const counts = countByCategory(questions);
    const corpusStatus = `Loaded ${questions.length} questions · ${Object.entries(counts)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ")}`;

    if (startViewCallback) {
      startViewCallback({ startBtnDisabled: false, startBtnLabel: "Start Test", corpusStatus });
    } else {
      els.startBtn.disabled = false;
      els.startBtn.textContent = "Start Test";
      els.corpusStatus.textContent = corpusStatus;
    }
  } catch (error) {
    clearQuestions();
    const loadErrorHtml = `<strong>Unable to load corpus.</strong><br>${escapeHtml(
      error.message,
    )}<br><br>For server-loaded files, place the selected corpus in the same folder as this HTML file and run <code>python3 -m http.server</code>.`;
    const loadErrorTitle = "Unable to load corpus.";
    const loadErrorMessage = error.message;
    const loadErrorHint = "For server-loaded files, place the selected corpus in the same folder as this HTML file and run ";
    const loadErrorCommand = "python3 -m http.server";

    if (startViewCallback) {
      startViewCallback({
        startBtnDisabled: true,
        startBtnLabel: "Load a corpus first",
        loadErrorHidden: false,
        loadErrorTitle,
        loadErrorMessage,
        loadErrorHint,
        loadErrorCommand,
      });
    } else {
      els.startBtn.disabled = true;
      els.startBtn.textContent = "Load a corpus first";
      els.loadError.classList.remove("hidden");
      els.loadError.innerHTML = loadErrorHtml;
    }
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

export {
  loadSelectedCorpus,
  parseJsonCorpus,
  parseTextCorpus,
};
