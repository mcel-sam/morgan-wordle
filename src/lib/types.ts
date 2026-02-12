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
  leaderboardTracking: boolean;
}

export interface GameState {
  puzzleId: string;
  guesses: string[];
  evaluations: TileState[][];
  keyboard: Record<string, KeyState>;
  status: GameStatus;
  currentGuess: string;
  hintUsed: boolean;
  appliedHints: {
    tier1: boolean;
    tier2: boolean;
    tier3: boolean;
  };
  appliedHintText: {
    tier1: string | null;
    tier2: string | null;
    tier3: string | null;
  };
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
