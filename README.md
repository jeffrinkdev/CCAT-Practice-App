# CCAT-Practice-App

CCAT practice simulator with text and visual question corpora.

## Development

1. Install dependencies:

```bash
npm install
```

2. Start the Vite dev server:

```bash
npm run dev
```

3. Open the local URL printed in the terminal (typically `http://localhost:5173`).

## Production Build

Build static output:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

- `index.html`: Vite shell mounting the React root
- `src/App.jsx`: React-rendered app shell
- `src/main.jsx`: React entry point
- `src/index.css`: application stylesheet
- `src/utils/`: app logic split by responsibility (state/parsing/rendering/runtime)
- `public/data/questions-text.txt`: text corpus
- `public/data/questions-visual.json`: visual/text mixed corpus

## Migration Note

- Legacy `public/js/` has been retired.
- Runtime initialization now starts from `src/App.jsx` and calls `initApp` from `src/utils/app.js`.
- Tests now run from `src/__tests__/`.

