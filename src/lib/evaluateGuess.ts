import type { TileState } from './types';
import { WORD_LENGTH } from './types';

export function evaluateGuess(answer: string, guess: string): TileState[] {
  const result: TileState[] = Array(WORD_LENGTH).fill('absent');
  const counts = new Map<string, number>();

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const a = answer[i];
    const g = guess[i];
    if (g === a) {
      result[i] = 'correct';
    } else {
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i] === 'correct') continue;
    const g = guess[i];
    const available = counts.get(g) ?? 0;
    if (available > 0) {
      result[i] = 'present';
      counts.set(g, available - 1);
    }
  }

  return result;
}

export function buildKeyboardState(
  guesses: string[],
  evaluations: TileState[][
]
): Record<string, 'correct' | 'present' | 'absent'> {
  const rank: Record<'correct' | 'present' | 'absent', number> = {
    absent: 1,
    present: 2,
    correct: 3
  };
  const output: Record<string, 'correct' | 'present' | 'absent'> = {};

  guesses.forEach((guess, row) => {
    const evalRow = evaluations[row];
    evalRow?.forEach((state, i) => {
      if (state === 'empty') return;
      const letter = guess[i];
      if (state === 'correct' || state === 'present' || state === 'absent') {
        const previous = output[letter];
        if (!previous || rank[state] > rank[previous]) {
          output[letter] = state;
        }
      }
    });
  });

  return output;
}

function ordinal(index: number): string {
  const n = index + 1;
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function validateHardMode(
  previousGuesses: string[],
  previousEvals: TileState[][],
  newGuess: string
): string | null {
  for (let row = 0; row < previousGuesses.length; row += 1) {
    const guess = previousGuesses[row];
    const evalRow = previousEvals[row] ?? [];
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      if (evalRow[i] === 'correct' && newGuess[i] !== guess[i]) {
        return `Hard Mode: ${ordinal(i)} letter must be ${guess[i].toUpperCase()}`;
      }
    }
  }

  const requiredYellows = new Set<string>();
  for (let row = 0; row < previousGuesses.length; row += 1) {
    const guess = previousGuesses[row];
    const evalRow = previousEvals[row] ?? [];
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      if (evalRow[i] === 'present') {
        requiredYellows.add(guess[i]);
      }
    }
  }

  for (const letter of requiredYellows) {
    if (!newGuess.includes(letter)) {
      return `Hard Mode: guess must include ${letter.toUpperCase()}`;
    }
  }

  return null;
}
