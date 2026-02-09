import type { TileState } from '../lib/types';
import { MAX_ATTEMPTS, WORD_LENGTH } from '../lib/types';

interface GridProps {
  guesses: string[];
  evaluations: TileState[][];
  currentGuess: string;
  revealRowIndex: number | null;
  shakeRowIndex: number | null;
  winRowIndex: number | null;
}

export function Grid({ guesses, evaluations, currentGuess, revealRowIndex, shakeRowIndex, winRowIndex }: GridProps) {
  return (
    <div className="grid" aria-label="Guess grid">
      {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
        const committed = guesses[row] ?? '';
        const rowLetters = committed || (row === guesses.length ? currentGuess : '');
        const evalRow = evaluations[row] ?? [];

        const rowClass = [
          'grid-row',
          shakeRowIndex === row ? 'shake' : '',
          winRowIndex === row ? 'bounce' : ''
        ]
          .join(' ')
          .trim();

        return (
          <div className={rowClass} key={row}>
            {Array.from({ length: WORD_LENGTH }).map((__, col) => {
              const letter = rowLetters[col] ?? '';
              const state: TileState = evalRow[col] ?? 'empty';
              const revealClass = revealRowIndex === row ? 'flip-reveal' : '';
              return (
                <div
                  key={`${row}-${col}`}
                  className={`tile tile-${state} ${revealClass}`.trim()}
                  style={{ animationDelay: revealRowIndex === row ? `${col * 150}ms` : undefined }}
                  aria-label={`Row ${row + 1} Column ${col + 1} ${letter || 'empty'} ${state}`}
                >
                  <span>{letter}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
