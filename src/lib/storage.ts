import type { GameState, Settings, Stats, TimeMode } from './types';

const SETTINGS_KEY = 'morgan-wordle-settings-v1';
const GAME_KEY = (mode: TimeMode) => `morgan-wordle-game-v1:${mode}`;
const STATS_KEY = (mode: TimeMode) => `morgan-wordle-stats-v1:${mode}`;

export const defaultSettings: Settings = {
  hardMode: false,
  colorblindMode: false,
  useCompanyTime: true,
  reducedMotionOverride: 'system'
};

export const defaultStats: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
  hintUsedCount: 0,
  history: {}
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadGame(mode: TimeMode): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY(mode));
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

export function saveGame(mode: TimeMode, game: GameState): void {
  localStorage.setItem(GAME_KEY(mode), JSON.stringify(game));
}

export function loadStats(mode: TimeMode): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY(mode));
    return raw ? { ...defaultStats, ...JSON.parse(raw) } : defaultStats;
  } catch {
    return defaultStats;
  }
}

export function saveStats(mode: TimeMode, stats: Stats): void {
  localStorage.setItem(STATS_KEY(mode), JSON.stringify(stats));
}

export function recordResult(stats: Stats, puzzleId: string, won: boolean, guessCount: number, hintUsed: boolean): Stats {
  if (stats.history[puzzleId]) {
    return stats;
  }

  const next = {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    history: {
      ...stats.history,
      [puzzleId]: { won, guessCount, hintUsed }
    },
    guessDistribution: [...stats.guessDistribution],
    hintUsedCount: stats.hintUsedCount + (hintUsed ? 1 : 0)
  };

  if (won && guessCount >= 1 && guessCount <= 6) {
    next.guessDistribution[guessCount - 1] += 1;
    next.currentStreak += 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
  } else {
    next.currentStreak = 0;
  }

  return next;
}
