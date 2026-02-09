import { useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from './components/Grid';
import { Keyboard } from './components/Keyboard';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { getPuzzleId, getTimeMode, formatCountdown, secondsUntilNextPuzzle, COMPANY_TIMEZONE } from './lib/date';
import { getDailyAnswer } from './lib/dailyAnswer';
import { buildKeyboardState, evaluateGuess, validateHardMode } from './lib/evaluateGuess';
import {
  defaultSettings,
  defaultStats,
  loadGame,
  loadSettings,
  loadStats,
  recordResult,
  saveGame,
  saveSettings,
  saveStats
} from './lib/storage';
import type { GameState, Settings, Stats, TimeMode } from './lib/types';
import { MAX_ATTEMPTS, WORD_LENGTH } from './lib/types';
import './styles/app.css';

function createNewGame(puzzleId: string): GameState {
  return {
    puzzleId,
    guesses: [],
    evaluations: [],
    keyboard: {},
    status: 'playing',
    currentGuess: '',
    hintUsed: false,
    revealedAnswer: false,
    statsRecorded: false
  };
}

function loadSession(mode: TimeMode, puzzleId: string): { game: GameState; stats: Stats } {
  const stats = loadStats(mode) ?? defaultStats;
  const stored = loadGame(mode);

  if (!stored) {
    return { game: createNewGame(puzzleId), stats };
  }

  if (stored.puzzleId !== puzzleId) {
    let nextStats = stats;
    if (stored.status !== 'playing' && !stored.statsRecorded) {
      nextStats = recordResult(stats, stored.puzzleId, stored.status === 'won', stored.guesses.length, stored.hintUsed);
      saveStats(mode, nextStats);
    }
    return { game: createNewGame(puzzleId), stats: nextStats };
  }

  return { game: stored, stats };
}

function emojiFromState(state: 'correct' | 'present' | 'absent' | 'empty'): string {
  if (state === 'correct') return '🟩';
  if (state === 'present') return '🟨';
  return '⬛';
}

function getGreenPattern(guesses: string[], evaluations: GameState['evaluations']): string {
  const pattern = Array(WORD_LENGTH).fill('_');
  evaluations.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      if (cell === 'correct') {
        pattern[colIdx] = guesses[rowIdx][colIdx].toUpperCase();
      }
    });
  });
  return pattern.join(' ');
}

function getSystemReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings() ?? defaultSettings);
  const [timeMode, setTimeMode] = useState<TimeMode>(() => getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime));
  const [puzzleId, setPuzzleId] = useState<string>(() => getPuzzleId(getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime)));
  const [game, setGame] = useState<GameState>(() => loadSession(getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime), getPuzzleId(getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime))).game);
  const [stats, setStats] = useState<Stats>(() => loadSession(getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime), getPuzzleId(getTimeMode((loadSettings() ?? defaultSettings).useCompanyTime))).stats);

  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [revealRowIndex, setRevealRowIndex] = useState<number | null>(null);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [winRowIndex, setWinRowIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [prefersDark, setPrefersDark] = useState(() => getSystemDark());

  const answer = useMemo(() => getDailyAnswer(puzzleId), [puzzleId]);

  const reducedMotion = useMemo(() => {
    if (settings.reducedMotionOverride === 'reduce') return true;
    if (settings.reducedMotionOverride === 'full') return false;
    return getSystemReducedMotion();
  }, [settings.reducedMotionOverride]);

  useEffect(() => {
    const mode = getTimeMode(settings.useCompanyTime);
    const today = getPuzzleId(mode);
    const session = loadSession(mode, today);
    setTimeMode(mode);
    setPuzzleId(today);
    setGame(session.game);
    setStats(session.stats);
  }, [settings.useCompanyTime]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveGame(timeMode, game);
  }, [game, timeMode]);

  useEffect(() => {
    saveStats(timeMode, stats);
  }, [stats, timeMode]);

  useEffect(() => {
    if (game.status === 'playing' || game.statsRecorded) return;
    const updated = recordResult(stats, game.puzzleId, game.status === 'won', game.guesses.length, game.hintUsed);
    setStats(updated);
    setGame((prev) => ({ ...prev, statsRecorded: true }));
  }, [game, stats]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nowPuzzle = getPuzzleId(timeMode);
      if (nowPuzzle !== puzzleId) {
        const session = loadSession(timeMode, nowPuzzle);
        setPuzzleId(nowPuzzle);
        setGame(session.game);
        setStats(session.stats);
      }
      setCountdown(secondsUntilNextPuzzle(timeMode));
    }, 1000);
    setCountdown(secondsUntilNextPuzzle(timeMode));
    return () => window.clearInterval(interval);
  }, [timeMode, puzzleId]);

  useEffect(() => {
    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(darkMedia.matches);
    darkMedia.addEventListener('change', onChange);
    return () => darkMedia.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (showHelp || showStats || showSettings || showHint) return;
      const key = event.key;
      if (/^[a-zA-Z]$/.test(key)) handleInput(key.toUpperCase());
      else if (key === 'Enter') handleInput('ENTER');
      else if (key === 'Backspace') handleInput('BACKSPACE');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const failedSubmissions = game.status === 'won' ? game.guesses.length - 1 : game.guesses.length;
  const canUseTier1 = failedSubmissions >= 2;
  const canUseTier2 = failedSubmissions >= 3;
  const canUseTier3 = failedSubmissions >= 4 && game.guesses.length >= 3;

  const vowels = useMemo(() => answer.split('').filter((letter) => 'aeiou'.includes(letter)).length, [answer]);
  const tier3Mode = useMemo(() => (puzzleId.charCodeAt(puzzleId.length - 1) % 2 === 0 ? 'start' : 'end'), [puzzleId]);

  function showToast(message: string): void {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }

  function triggerShake(): void {
    setShakeRowIndex(game.guesses.length);
    window.setTimeout(() => setShakeRowIndex(null), reducedMotion ? 50 : 400);
  }

  function applySettings(next: Partial<Settings>): void {
    setSettings((prev) => ({ ...prev, ...next }));
  }

  function handleInput(rawKey: string): void {
    if (isLocked || game.status !== 'playing') return;

    const key = rawKey.toLowerCase();
    if (key === 'backspace') {
      setGame((prev) => ({ ...prev, currentGuess: prev.currentGuess.slice(0, -1) }));
      return;
    }

    if (key === 'enter') {
      submitGuess();
      return;
    }

    if (/^[a-z]$/.test(key)) {
      if (game.currentGuess.length >= WORD_LENGTH) return;
      setGame((prev) => ({ ...prev, currentGuess: `${prev.currentGuess}${key}` }));
    }
  }

  function submitGuess(): void {
    const guess = game.currentGuess;
    if (guess.length !== WORD_LENGTH) {
      showToast('Not enough letters');
      triggerShake();
      return;
    }

    if (settings.hardMode) {
      const hardError = validateHardMode(game.guesses, game.evaluations, guess);
      if (hardError) {
        showToast(hardError);
        triggerShake();
        return;
      }
    }

    const evaluation = evaluateGuess(answer, guess);
    const nextGuesses = [...game.guesses, guess];
    const nextEvals = [...game.evaluations, evaluation];
    const isWin = evaluation.every((cell) => cell === 'correct');
    const isLoss = !isWin && nextGuesses.length >= MAX_ATTEMPTS;
    const status = isWin ? 'won' : isLoss ? 'lost' : 'playing';

    const nextKeyboard = buildKeyboardState(nextGuesses, nextEvals);
    const rowIndex = game.guesses.length;

    setGame((prev) => ({
      ...prev,
      guesses: nextGuesses,
      evaluations: nextEvals,
      keyboard: nextKeyboard,
      status,
      currentGuess: ''
    }));

    if (reducedMotion) {
      if (isWin) setWinRowIndex(rowIndex);
      return;
    }

    setIsLocked(true);
    setRevealRowIndex(rowIndex);
    const total = 150 * (WORD_LENGTH - 1) + 500;
    window.setTimeout(() => {
      setRevealRowIndex(null);
      setIsLocked(false);
      if (isWin) setWinRowIndex(rowIndex);
    }, total + 50);
  }

  async function shareResult(): Promise<void> {
    const score = game.status === 'won' ? `${game.guesses.length}/6` : 'X/6';
    const rows = game.evaluations.map((row) => row.map((cell) => emojiFromState(cell)).join('')).join('\n');
    const text = `Morgan Wordle ${puzzleId} ${score}\n${rows}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied!');
    } catch {
      showToast('Clipboard failed');
    }
  }

  function revealAnswerAfterForfeit(): void {
    const confirmed = window.confirm('Forfeit this puzzle and reveal the answer?');
    if (!confirmed) return;
    setGame((prev) => ({ ...prev, status: 'lost', revealedAnswer: true }));
  }

  const rootClass = [
    'app',
    prefersDark ? 'theme-dark' : 'theme-light',
    settings.colorblindMode ? 'theme-colorblind' : '',
    reducedMotion ? 'reduced-motion' : ''
  ]
    .join(' ')
    .trim();

  const gameOver = game.status !== 'playing';
  const triesLeft = Math.max(0, MAX_ATTEMPTS - game.guesses.length);

  return (
    <div className={rootClass}>
      <header className="header">
        <button className="icon-btn" aria-label="Help" onClick={() => setShowHelp(true)}>?
        </button>
        <div className="title-wrap">
          <img className="morgan-logo" src="/morgan-logo.svg" alt="Morgan logo" />
          <h1>Morgan Wordle</h1>
          <p>Construction Edition</p>
        </div>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Hint" onClick={() => setShowHint(true)}>
            💡
          </button>
          <button className="icon-btn" aria-label="Stats" onClick={() => setShowStats(true)}>
            📊
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
      </header>

      <main>
        <Grid
          guesses={game.guesses}
          evaluations={game.evaluations}
          currentGuess={game.currentGuess}
          revealRowIndex={revealRowIndex}
          shakeRowIndex={shakeRowIndex}
          winRowIndex={winRowIndex}
        />
        <p className="tries-left" aria-live="polite">Tries left: {triesLeft}</p>

        {gameOver && (
          <section className="game-over" aria-live="polite">
            <p>{game.status === 'won' ? 'Nice solve.' : 'Play again tomorrow.'}</p>
            {(game.status === 'lost' || game.revealedAnswer) && <p>Answer: {answer.toUpperCase()}</p>}
            <p>Next puzzle in {formatCountdown(countdown)}</p>
            <button type="button" className="primary-btn" onClick={shareResult}>
              Share
            </button>
          </section>
        )}

        <Keyboard onKey={handleInput} keyboardState={game.keyboard} disabled={isLocked || gameOver} />
      </main>

      <Toast message={toast} />

      <div className="sr-only" aria-live="polite">
        {game.status === 'won' ? 'You won the game.' : game.status === 'lost' ? 'You lost the game.' : ''}
      </div>

      <Modal open={showHelp} title="How To Play" onClose={() => setShowHelp(false)}>
        <p>Guess the construction word in six tries.</p>
        <p>Each guess must be a valid five-letter word.</p>
        <p>Tile colors show how close your guess was.</p>
        <p>Daily reset: {settings.useCompanyTime ? COMPANY_TIMEZONE : 'Your local timezone'} at midnight.</p>
      </Modal>

      <Modal open={showStats} title="Statistics" onClose={() => setShowStats(false)}>
        <div className="stats-grid">
          <div><strong>{stats.played}</strong><span>Played</span></div>
          <div><strong>{stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%</strong><span>Win %</span></div>
          <div><strong>{stats.currentStreak}</strong><span>Current Streak</span></div>
          <div><strong>{stats.maxStreak}</strong><span>Max Streak</span></div>
        </div>
        <h3>Guess Distribution</h3>
        <div className="distribution">
          {stats.guessDistribution.map((count, idx) => (
            <div key={idx} className="dist-row">
              <span>{idx + 1}</span>
              <div className="bar" style={{ width: `${Math.max(8, count * 16)}px` }}>{count}</div>
            </div>
          ))}
        </div>
        <p>Hints used: {stats.hintUsedCount}</p>
        <p>Next puzzle in {formatCountdown(countdown)}</p>
      </Modal>

      <Modal open={showSettings} title="Settings" onClose={() => setShowSettings(false)}>
        <label className="setting-row">
          <span>Hard Mode</span>
          <input
            type="checkbox"
            checked={settings.hardMode}
            disabled={game.guesses.length > 0}
            onChange={(event) => applySettings({ hardMode: event.target.checked })}
          />
        </label>
        {game.guesses.length > 0 && <p className="small-note">Hard Mode can’t be changed mid-game.</p>}
        <label className="setting-row">
          <span>Colorblind Mode</span>
          <input
            type="checkbox"
            checked={settings.colorblindMode}
            onChange={(event) => applySettings({ colorblindMode: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>Use Company Time ({COMPANY_TIMEZONE})</span>
          <input
            type="checkbox"
            checked={settings.useCompanyTime}
            onChange={(event) => applySettings({ useCompanyTime: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>Motion</span>
          <select
            value={settings.reducedMotionOverride}
            onChange={(event) => applySettings({ reducedMotionOverride: event.target.value as Settings['reducedMotionOverride'] })}
          >
            <option value="system">System</option>
            <option value="reduce">Reduce</option>
            <option value="full">Full</option>
          </select>
        </label>
      </Modal>

      <Modal open={showHint} title="Hints" onClose={() => setShowHint(false)}>
        <p>Hints unlock as you use attempts. They never auto-reveal the full answer.</p>
        <div className="hint-tier">
          <strong>Tier 1</strong>
          <p>{canUseTier1 ? `Pattern: ${getGreenPattern(game.guesses, game.evaluations)}` : 'Unlocks after 2 failed submissions'}</p>
        </div>
        <div className="hint-tier">
          <strong>Tier 2</strong>
          <p>{canUseTier2 ? `Contains ${vowels} vowel${vowels === 1 ? '' : 's'}` : 'Unlocks after 3 failed submissions'}</p>
        </div>
        <div className="hint-tier">
          <strong>Tier 3</strong>
          <p>
            {canUseTier3
              ? tier3Mode === 'start'
                ? `Starts with ${answer[0].toUpperCase()}`
                : `Ends with ${answer[WORD_LENGTH - 1].toUpperCase()}`
              : 'Unlocks after 4 failed submissions'}
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setGame((prev) => ({ ...prev, hintUsed: true }))}
        >
          Mark Hint As Used
        </button>
        {game.status === 'lost' ? (
          <button type="button" className="secondary-btn" onClick={() => setGame((prev) => ({ ...prev, revealedAnswer: true }))}>
            Reveal Answer
          </button>
        ) : (
          <button type="button" className="secondary-btn" onClick={revealAnswerAfterForfeit}>
            Forfeit & Reveal Answer
          </button>
        )}
      </Modal>
    </div>
  );
}
