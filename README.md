# Morgan Wordle

Production-ready daily Wordle clone built with React + TypeScript + Vite.

## Run

```bash
npm install
npm run dev
```

Run tests:

```bash
npm run test
```

## Features

- Daily shared puzzle, 5 letters, 6 attempts
- Deterministic answer derivation from `YYYY-MM-DD + SALT`
- Timezone mode:
  - `Use Company Time` (default): `America/Edmonton`
  - Local time mode
- Local persistence:
  - current game state
  - settings
  - stats + streaks + guess distribution + hint usage
- Accessibility:
  - keyboard support
  - screen reader live regions
  - reduced motion support
- Share output with emoji grid (`🟩🟨⬛`)
- Hard Mode constraints
- Hint modal with progressive hint tiers and optional reveal/forfeit flow

## Daily Answer Derivation

Answer is selected from the word list via seeded PRNG:

1. Build puzzle date string (`YYYY-MM-DD`) in selected time mode.
2. Create seed input: `puzzleId + ':' + SALT`
3. Hash with FNV-1a (`fnv1aHash`)
4. Seed `mulberry32` PRNG and pick index into `ANSWERS`.

Code: `src/lib/prng.ts`, `src/lib/dailyAnswer.ts`.

The SALT is currently a client constant for MVP (`DAILY_SALT`). The code is structured so this can be moved server-side later.

## Swapping Word Lists

Edit `src/lib/words.ts`:

- `WORDS`: source list
- `ANSWERS`: daily answer list (can be a filtered subset)
- `ALLOWED_GUESSES`: accepted input words

For MVP, guesses and answers share the same list.

## Project Structure

- `src/components`: Grid, Keyboard, Modal, Toast
- `src/lib`: date/timezone, seeded PRNG, evaluation, hard mode, storage, words
- `src/styles`: app styling and animations
- `src/tests`: Vitest unit tests

## Deploy

Build static assets:

```bash
npm run build
npm run preview
```

Deploy `dist/` to any static host (Vercel, Netlify, S3/CloudFront, etc.).
