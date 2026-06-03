import { escapeHtml, questions, activeQuestions, state } from "./state.js";

function renderQuestionContent(question, target) {
  target.innerHTML =
    `<div class="question-text">${escapeHtml(question.prompt)}</div>` +
    (question.visual ? `<div class="visual-stage">${renderVisual(question.visual)}</div>` : "");
}

function buildQuestionHtml(question) {
  return (
    `<div class="question-text">${escapeHtml(question.prompt)}</div>` +
    (question.visual ? `<div class="visual-stage">${renderVisual(question.visual)}</div>` : "")
  );
}

function renderChoiceContent(choice) {
  const visual = choice.visual ? renderVisual(choice.visual, 72, 72) : "";
  return `<div class="answer-choice-content">${visual}<span>${escapeHtml(choice.text || "")}</span></div>`;
}

function renderVisual(visual, width = 420, height = 210) {
  if (!visual) {
    return "";
  }

  switch (visual.kind) {
    case "polygon":
      return svgPolygon(visual.sides || 4, width, height);
    case "basic-shape":
      return svgBasic(visual.shape, visual.filled, width, height);
    case "arrow":
      return svgArrow(visual.direction, width, height);
    case "dot-cell":
      return svgDotCell(visual.position, width, height);
    case "matrix-sides":
      return svgMatrixSides(visual.startSides || 3);
    case "dot-sequence":
      return svgSequence(
        visual.positions.map((position) => svgDotCell(position, 90, 90)),
        visual.positions.map((_, index) => `Frame ${index + 1}`),
      );
    case "arrow-sequence":
      return svgSequence(
        visual.directions.map((direction) => svgArrow(direction, 90, 90)),
        visual.directions.map((_, index) => `Frame ${index + 1}`),
      );
    case "odd-one-out":
      return svgSequence(
        visual.items.map((item) => svgBasic(item.shape, item.filled, 90, 90)),
        visual.items.map((_, index) => `Figure ${index + 1}`),
      );
    case "shading-matrix":
      return svgShadingMatrix(visual.shape || "diamond");
    default:
      return "";
  }
}

function svgWrap(inner, width, height, viewBox = `0 0 ${width} ${height}`) {
  return `<svg width="${width}" height="${height}" viewBox="${viewBox}" role="img" aria-hidden="true">${inner}</svg>`;
}

function polygonPoints(sides, cx, cy, radius, rotation = -Math.PI / 2) {
  return Array.from(
    { length: sides },
    (_, index) =>
      `${cx + radius * Math.cos(rotation + (2 * Math.PI * index) / sides)},${cy + radius * Math.sin(rotation + (2 * Math.PI * index) / sides)
      }`,
  ).join(" ");
}

function svgPolygon(sides, width = 90, height = 90) {
  return svgWrap(
    `<polygon points="${polygonPoints(sides, width / 2, height / 2, Math.min(width, height) * 0.34)}" fill="none" stroke="#111827" stroke-width="4"/>`,
    width,
    height,
  );
}

function svgBasic(shape, filled = false, width = 90, height = 90) {
  const fill = filled ? "#111827" : "none";
  const stroke = "#111827";
  let inner = "";

  if (shape === "circle" || shape === "oval") {
    inner = `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width * 0.28}" ry="${shape === "oval" ? height * 0.2 : height * 0.28
      }" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  } else if (shape === "square") {
    inner = `<rect x="${width * 0.25}" y="${height * 0.25}" width="${width * 0.5}" height="${height * 0.5}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  } else if (shape === "diamond") {
    inner = `<polygon points="${width / 2},${height * 0.18} ${width * 0.82},${height / 2} ${width / 2
      },${height * 0.82} ${width * 0.18},${height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  } else if (shape === "triangle") {
    inner = `<polygon points="${polygonPoints(3, width / 2, height / 2, Math.min(width, height) * 0.34)}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  } else {
    inner = `<polygon points="${polygonPoints(5, width / 2, height / 2, Math.min(width, height) * 0.34)}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  }

  return svgWrap(inner, width, height);
}

function svgArrow(direction, width = 90, height = 90) {
  const rotation = { N: 0, E: 90, S: 180, W: 270 }[direction] || 0;
  return svgWrap(
    `<g transform="translate(${width / 2} ${height / 2}) rotate(${rotation})"><line x1="0" y1="${height * 0.25
    }" x2="0" y2="${-height * 0.18}" stroke="#111827" stroke-width="6" stroke-linecap="round"/><polygon points="0,${-height * 0.34
    } ${-width * 0.14},${-height * 0.12} ${width * 0.14},${-height * 0.12}" fill="#111827"/></g>`,
    width,
    height,
  );
}

function svgDotCell(position, width = 90, height = 90) {
  const map = {
    tl: [0.25, 0.25],
    tr: [0.75, 0.25],
    br: [0.75, 0.75],
    bl: [0.25, 0.75],
  };

  const point = map[position] || [0.5, 0.5];
  return svgWrap(
    `<rect x="8" y="8" width="${width - 16}" height="${height - 16}" fill="none" stroke="#111827" stroke-width="3"/><circle cx="${width * point[0]
    }" cy="${height * point[1]}" r="${Math.min(width, height) * 0.08}" fill="#111827"/>`,
    width,
    height,
  );
}

function svgSequence(svgItems, labels = null) {
  const cellWidth = 110;
  const itemHeight = 90;
  const labelHeight = labels ? 24 : 0;
  const totalWidth = Math.max(cellWidth, svgItems.length * cellWidth);
  const totalHeight = itemHeight + labelHeight;

  const cells = svgItems
    .map((svg, index) => {
      const label = labels
        ? `<text x="45" y="108" font-size="13" text-anchor="middle" fill="#475569" font-family="system-ui, sans-serif">${escapeHtml(
          labels[index] || "",
        )}</text>`
        : "";

      return `<g transform="translate(${index * cellWidth} 0)">${svg.replace(/^<svg[^>]*>|<\/svg>$/g, "")}${label}</g>`;
    })
    .join("");

  return svgWrap(cells, totalWidth, totalHeight, `0 0 ${totalWidth} ${totalHeight}`);
}

function svgMatrixSides(start) {
  let inner = "";

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = col * 110;
      const y = row * 90;

      inner += `<rect x="${x + 5}" y="${y + 5}" width="100" height="80" fill="none" stroke="#cbd5e1"/>`;

      if (row === 2 && col === 2) {
        inner += `<text x="${x + 55}" y="${y + 52}" font-size="34" text-anchor="middle" fill="#64748b">?</text>`;
      } else {
        inner += `<polygon points="${polygonPoints(start + row + col, x + 55, y + 45, 26)}" fill="none" stroke="#111827" stroke-width="3"/>`;
      }
    }
  }

  return svgWrap(inner, 330, 270, "0 0 330 270");
}

function svgShadingMatrix(shape) {
  let inner = "";

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = col * 110;
      const y = row * 90;

      inner += `<rect x="${x + 5}" y="${y + 5}" width="100" height="80" fill="none" stroke="#cbd5e1"/>`;

      if (row === 2 && col === 2) {
        inner += `<text x="${x + 55}" y="${y + 52}" font-size="34" text-anchor="middle" fill="#64748b">?</text>`;
      } else {
        const filled = (row + col) % 2 === 1;
        inner += svgBasic(shape, filled, 70, 70)
          .replace(/^<svg[^>]*>/, `<g transform="translate(${x + 20} ${y + 10})">`)
          .replace("</svg>", "</g>");
      }
    }
  }

  return svgWrap(inner, 330, 270, "0 0 330 270");
}

function measureFrame(sourceQuestions, width) {
  const probe = document.createElement("div");
  probe.className = "question-content";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.left = "-10000px";
  probe.style.top = "0";
  probe.style.width = `${Math.max(280, width)}px`;

  document.body.appendChild(probe);

  let max = 0;
  sourceQuestions.forEach((question) => {
    renderQuestionContent(question, probe);
    max = Math.max(max, probe.getBoundingClientRect().height, probe.scrollHeight);
  });

  document.body.removeChild(probe);
  return Math.ceil(max + 4);
}

function updateQuestionFrameHeightForActiveTest() {
  const sourceQuestions = activeQuestions.length ? activeQuestions : questions;
  if (!sourceQuestions.length) {
    return;
  }

  const frame = document.querySelector(".question-text-frame");
  const card = document.querySelector("#questionScreen .card");
  const width =
    (frame && frame.clientWidth > 0 ? frame.clientWidth : 0) ||
    (card && card.clientWidth > 0 ? card.clientWidth - 48 : 0) ||
    Math.min(932, Math.max(320, window.innerWidth - 80));

  document.documentElement.style.setProperty("--question-frame-height", `${measureFrame(sourceQuestions, width)}px`);
}

function updateModalQuestionFrameHeightForReviewSet() {
  const indexes = state.activeReviewIndexes?.length
    ? state.activeReviewIndexes
    : state.results.map((result) => result.questionIndex);

  const sourceQuestions = indexes.map((index) => activeQuestions[index]).filter(Boolean);
  if (!sourceQuestions.length) {
    return;
  }

  const frame = document.querySelector(".modal-question-frame");
  const modal = document.querySelector(".modal");
  const width =
    (frame && frame.clientWidth > 0 ? frame.clientWidth : 0) ||
    (modal && modal.clientWidth > 0 ? modal.clientWidth - 48 : 0) ||
    Math.min(812, Math.max(280, window.innerWidth - 96));

  document.documentElement.style.setProperty(
    "--modal-question-frame-height",
    `${measureFrame(sourceQuestions, width)}px`,
  );
}

export {
  renderQuestionContent,
  buildQuestionHtml,
  renderChoiceContent,
  renderVisual,
  svgWrap,
  polygonPoints,
  svgPolygon,
  svgBasic,
  svgArrow,
  svgDotCell,
  svgSequence,
  svgMatrixSides,
  svgShadingMatrix,
  measureFrame,
  updateQuestionFrameHeightForActiveTest,
  updateModalQuestionFrameHeightForReviewSet,
};
