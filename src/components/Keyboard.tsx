import type { KeyState } from '../lib/types';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface KeyboardProps {
  onKey: (key: string) => void;
  keyboardState: Record<string, KeyState>;
  disabled: boolean;
}

export function Keyboard({ onKey, keyboardState, disabled }: KeyboardProps) {
  return (
    <div className="keyboard" aria-label="On-screen keyboard">
      {ROWS.map((row) => (
        <div className="keyboard-row" key={row}>
          {row === 'ZXCVBNM' && (
            <button type="button" className="key key-wide" onClick={() => onKey('ENTER')} disabled={disabled}>
              Enter
            </button>
          )}
          {row.split('').map((letter) => {
            const state = keyboardState[letter.toLowerCase()];
            return (
              <button
                type="button"
                key={letter}
                className={`key key-${state ?? 'empty'}`}
                onClick={() => onKey(letter)}
                disabled={disabled}
                aria-label={`Letter ${letter}`}
              >
                {letter}
              </button>
            );
          })}
          {row === 'ZXCVBNM' && (
            <button type="button" className="key key-wide" onClick={() => onKey('BACKSPACE')} disabled={disabled}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
