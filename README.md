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

## Testing

### Framework and Libraries

- **Test runner**: Vitest with jsdom environment
- **React components**: React Testing Library (RTL) + user-event for user-focused tests
- **Logic**: Pure Vitest tests for utilities and state management

### Writing Tests

**React components** (use RTL patterns):
```javascript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('handles user interaction', async () => {
  const user = userEvent.setup()
  render(<MyComponent />)
  await user.click(screen.getByRole('button', { name: 'Click me' }))
  expect(screen.getByText('clicked')).toBeInTheDocument()
})
```

See [src/__tests__/app.react.integration.test.jsx](src/__tests__/app.react.integration.test.jsx) for a reference implementation.

**Logic utilities** (pure Vitest):
```javascript
import { expect, it } from 'vitest'
import { parseQuestions } from '../utils/parsing.js'

it('parses text corpus', () => {
  const result = parseQuestions('1. Question?\nA) A\nB) B')
  expect(result).toHaveLength(1)
})
```

### Running Tests

```bash
npm run test                # Run all tests once
npm run test:ui             # Interactive test UI
npm run test:coverage       # Coverage report
```

## Migration Note

- Legacy `public/js/` has been retired.
- Runtime initialization now starts from `src/App.jsx` and calls `initApp` from `src/utils/app.js`.
- Tests now run from `src/__tests__/`.

