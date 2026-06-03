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

- `index.html`: app shell
- `public/styles.css`: stylesheet
- `public/js/`: app logic split by responsibility
- `public/data/questions-text.txt`: text corpus
- `public/data/questions-visual.json`: visual/text mixed corpus

