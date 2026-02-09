export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

export type TileState = 'empty' | 'correct' | 'present' | 'absent';
export type GameStatus = 'playing' | 'won' | 'lost';
export type KeyState = 'correct' | 'present' | 'absent';
export type TimeMode = 'company' | 'local';

export interface Settings {
  hardMode: boolean;
  colorblindMode: boolean;
  useCompanyTime: boolean;
  reducedMotionOverride: 'system' | 'reduce' | 'full';
}

export interface GameState {
  puzzleId: string;
  guesses: string[];
  evaluations: TileState[][];
  keyboard: Record<string, KeyState>;
  status: GameStatus;
  currentGuess: string;
  hintUsed: boolean;
  revealedAnswer: boolean;
  statsRecorded: boolean;
}

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  hintUsedCount: number;
  history: Record<string, { won: boolean; guessCount: number; hintUsed: boolean }>;
}
