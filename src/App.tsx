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

type IconName = 'help' | 'hint' | 'stats' | 'settings' | 'target' | 'schedule';

function Icon({ name, className }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-.1-5h1.5c0-2.5 2.7-2.7 2.7-5.3 0-2.1-1.7-3.7-4-3.7-2.2 0-3.8 1.3-4.1 3.4l1.5.6c.2-1.4 1.2-2.3 2.6-2.3 1.4 0 2.4.9 2.4 2.1 0 1.7-2.6 2-2.6 4.5z',
    hint: 'M9 21h6v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1-.85.6V16h-4v-2.3l-.85-.6A5 5 0 0 1 7 9a5 5 0 0 1 10 0 5 5 0 0 1-2.15 4.1z',
    stats: 'M3 17h3V9H3v8zm5 0h3V5H8v12zm5 0h3v-7h-3v7zm5 0h3V3h-3v14z',
    settings: 'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.14 7.14 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.51.41 1.05.72 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z',
    target: 'M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm8.94 3A9 9 0 0 0 13 3.06V1h-2v2.06A9 9 0 0 0 3.06 11H1v2h2.06A9 9 0 0 0 11 20.94V23h2v-2.06A9 9 0 0 0 20.94 13H23v-2zM12 19a7 7 0 1 1 7-7 7 7 0 0 1-7 7z',
    schedule: 'M11 7h2v5.25l4.5 2.67-.75 1.23L11 13V7zm1 15a10 10 0 1 1 10-10 10.01 10.01 0 0 1-10 10zm0-18a8 8 0 1 0 8 8 8.01 8.01 0 0 0-8-8z'
  };

  return (
    <svg className={`icon-svg ${className ?? ''}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

function createNewGame(puzzleId: string): GameState {
  return {
    puzzleId,
    guesses: [],
    evaluations: [],
    keyboard: {},
    status: 'playing',
    currentGuess: '',
    hintUsed: false,
    appliedHints: {
      tier1: false,
      tier2: false,
      tier3: false
    },
    appliedHintText: {
      tier1: null,
      tier2: null,
      tier3: null
    },
    revealedAnswer: false,
    statsRecorded: false
  };
}

function normalizeGame(stored: GameState): GameState {
  return {
    ...stored,
    appliedHints: {
      tier1: stored.appliedHints?.tier1 ?? false,
      tier2: stored.appliedHints?.tier2 ?? false,
      tier3: stored.appliedHints?.tier3 ?? false
    },
    appliedHintText: {
      tier1: stored.appliedHintText?.tier1 ?? null,
      tier2: stored.appliedHintText?.tier2 ?? null,
      tier3: stored.appliedHintText?.tier3 ?? null
    }
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

  return { game: normalizeGame(stored), stats };
}

function emojiFromState(state: 'correct' | 'present' | 'absent' | 'empty'): string {
  if (state === 'correct') return '🟩';
  if (state === 'present') return '🟨';
  return '⬛';
}

function getKnownCorrectMask(evaluations: GameState['evaluations']): boolean[] {
  const mask = Array(WORD_LENGTH).fill(false) as boolean[];
  evaluations.forEach((row) => {
    row.forEach((cell, idx) => {
      if (cell === 'correct') mask[idx] = true;
    });
  });
  return mask;
}

function getDiscoveredLetters(guesses: string[], evaluations: GameState['evaluations']): Set<string> {
  const discovered = new Set<string>();
  evaluations.forEach((row, rowIdx) => {
    row.forEach((cell, colIdx) => {
      if (cell === 'correct' || cell === 'present') {
        discovered.add(guesses[rowIdx][colIdx]);
      }
    });
  });
  return discovered;
}

function getTier1HintText(answer: string, discoveredLetters: Set<string>, puzzleId: string): string {
  const hiddenLetters = Array.from(new Set(answer.split('').filter((letter) => !discoveredLetters.has(letter))));
  if (hiddenLetters.length === 0) {
    return 'No unseen letters left. Focus on letter order.';
  }
  const seed = puzzleId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const letter = hiddenLetters[seed % hiddenLetters.length].toUpperCase();
  return `The word contains ${letter}.`;
}

function getTier2HintText(answer: string, knownCorrectMask: boolean[]): string {
  const totalVowels = answer.split('').filter((letter) => 'aeiou'.includes(letter)).length;
  const knownVowels = answer
    .split('')
    .filter((letter, idx) => knownCorrectMask[idx] && 'aeiou'.includes(letter)).length;
  const hiddenVowels = Math.max(0, totalVowels - knownVowels);
  if (hiddenVowels === 0) {
    return 'No hidden vowels are left in unknown positions.';
  }
  return hiddenVowels === 1
    ? 'Exactly 1 hidden vowel remains in unknown positions.'
    : `${hiddenVowels} hidden vowels remain in unknown positions.`;
}

function getTier3HintText(answer: string, knownCorrectMask: boolean[], puzzleId: string): string {
  if (!knownCorrectMask[0]) return `The word starts with a ${'aeiou'.includes(answer[0]) ? 'vowel' : 'consonant'}.`;
  if (!knownCorrectMask[WORD_LENGTH - 1]) return `The word ends with a ${'aeiou'.includes(answer[WORD_LENGTH - 1]) ? 'vowel' : 'consonant'}.`;
  const unknownIndexes = knownCorrectMask
    .map((known, idx) => (!known ? idx : -1))
    .filter((idx) => idx >= 0);
  if (unknownIndexes.length === 0) {
    return 'All key positions are already revealed.';
  }
  const seed = puzzleId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 7);
  const idx = unknownIndexes[seed % unknownIndexes.length];
  return `Position ${idx + 1} is a ${'aeiou'.includes(answer[idx]) ? 'vowel' : 'consonant'}.`;
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
  const hintSuggestTimer = useRef<number | null>(null);

  const [revealRowIndex, setRevealRowIndex] = useState<number | null>(null);
  const [shakeRowIndex, setShakeRowIndex] = useState<number | null>(null);
  const [winRowIndex, setWinRowIndex] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const [prefersDark, setPrefersDark] = useState(() => getSystemDark());
  const [highlightHintAction, setHighlightHintAction] = useState(false);
  const [lastHintSuggestionAt, setLastHintSuggestionAt] = useState(0);

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
    setLastHintSuggestionAt(0);
    setHighlightHintAction(false);
  }, [puzzleId]);

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
      if (hintSuggestTimer.current) window.clearTimeout(hintSuggestTimer.current);
    };
  }, []);

  const failedSubmissions = game.status === 'won' ? game.guesses.length - 1 : game.guesses.length;
  const canUseTier1 = failedSubmissions >= 2;
  const canUseTier2 = failedSubmissions >= 3;
  const canUseTier3 = failedSubmissions >= 4 && game.guesses.length >= 3;

  const knownCorrectMask = useMemo(() => getKnownCorrectMask(game.evaluations), [game.evaluations]);
  const discoveredLetters = useMemo(() => getDiscoveredLetters(game.guesses, game.evaluations), [game.guesses, game.evaluations]);
  const tier1HintText = useMemo(() => getTier1HintText(answer, discoveredLetters, puzzleId), [answer, discoveredLetters, puzzleId]);
  const tier2HintText = useMemo(() => getTier2HintText(answer, knownCorrectMask), [answer, knownCorrectMask]);
  const tier3HintText = useMemo(() => getTier3HintText(answer, knownCorrectMask, puzzleId), [answer, knownCorrectMask, puzzleId]);
  const hasUnusedHint = (canUseTier1 && !game.appliedHints.tier1)
    || (canUseTier2 && !game.appliedHints.tier2)
    || (canUseTier3 && !game.appliedHints.tier3);

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

  function openHints(): void {
    setShowHint(true);
    setHighlightHintAction(false);
    if (hintSuggestTimer.current) {
      window.clearTimeout(hintSuggestTimer.current);
      hintSuggestTimer.current = null;
    }
  }

  function suggestHint(): void {
    if (game.status !== 'playing') return;
    setHighlightHintAction(true);
    if (hintSuggestTimer.current) window.clearTimeout(hintSuggestTimer.current);
    hintSuggestTimer.current = window.setTimeout(() => {
      setHighlightHintAction(false);
      hintSuggestTimer.current = null;
    }, 5000);
    showToast('Hint unlocked. Tap the light bulb.');
  }

  function applyHintTier(tier: 1 | 2 | 3): void {
    if (tier === 1 && !canUseTier1) {
      showToast('Tier 1 is still locked');
      return;
    }
    if (tier === 2 && !canUseTier2) {
      showToast('Tier 2 is still locked');
      return;
    }
    if (tier === 3 && !canUseTier3) {
      showToast('Tier 3 is still locked');
      return;
    }

    const tierKey = `tier${tier}` as const;
    if (game.appliedHints[tierKey]) {
      showToast('Hint already applied');
      return;
    }

    const hintTextByTier: Record<typeof tierKey, string> = {
      tier1: tier1HintText,
      tier2: tier2HintText,
      tier3: tier3HintText
    };

    setGame((prev) => ({
      ...prev,
      hintUsed: true,
      appliedHints: {
        ...prev.appliedHints,
        [tierKey]: true
      },
      appliedHintText: {
        ...prev.appliedHintText,
        [tierKey]: hintTextByTier[tierKey]
      }
    }));
    setHighlightHintAction(false);
    setShowHint(false);
    showToast(`Tier ${tier} hint applied`);
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

    const nextFailedSubmissions = isWin ? nextGuesses.length - 1 : nextGuesses.length;
    const nextHasUnusedHint = (nextFailedSubmissions >= 2 && !game.appliedHints.tier1)
      || (nextFailedSubmissions >= 3 && !game.appliedHints.tier2)
      || (nextFailedSubmissions >= 4 && nextGuesses.length >= 3 && !game.appliedHints.tier3);
    if (!isWin && !isLoss && nextHasUnusedHint && nextFailedSubmissions > lastHintSuggestionAt) {
      setLastHintSuggestionAt(nextFailedSubmissions);
      window.setTimeout(() => suggestHint(), reducedMotion ? 10 : 120);
    }

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
        <button className="icon-btn icon-help" aria-label="Help" onClick={() => setShowHelp(true)}>
          <Icon name="help" />
        </button>
        <div className="title-wrap">
          <img className="morgan-logo" src="/morgan-logo.png" alt="Morgan logo" />
          <h1>Morgan Wordle</h1>
          <p>Construction Edition</p>
        </div>
        <div className="header-actions">
          <button
            className={`icon-btn icon-hint hint-btn ${highlightHintAction ? 'hint-btn-suggested' : ''}`.trim()}
            aria-label={highlightHintAction ? 'Hint available' : 'Hint'}
            onClick={openHints}
          >
            <Icon name="hint" />
          </button>
          <button className="icon-btn icon-stats" aria-label="Stats" onClick={() => setShowStats(true)}>
            <Icon name="stats" />
          </button>
          <button className="icon-btn icon-settings" aria-label="Settings" onClick={() => setShowSettings(true)}>
            <Icon name="settings" />
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
        <section className="status-strip" aria-live="polite">
          <div className="info-chip tries-chip"><Icon name="target" className="chip-icon chip-icon-target" />{triesLeft} tries left</div>
          <div
            className="info-chip"
            title={settings.useCompanyTime ? `Puzzle resets on ${COMPANY_TIMEZONE}` : 'Puzzle resets on your device local time'}
          >
            <Icon name="schedule" className="chip-icon chip-icon-schedule" />{settings.useCompanyTime ? `Reset: ${COMPANY_TIMEZONE}` : 'Reset: Local time'}
          </div>
          {hasUnusedHint && (
            <button type="button" className="info-chip hint-ready-chip" onClick={openHints}>
              <Icon name="hint" className="chip-icon chip-icon-hint" />Hint ready
            </button>
          )}
        </section>
        {highlightHintAction && (
          <button type="button" className="hint-callout" onClick={openHints}>
            Need a boost? Tap for a hint.
          </button>
        )}
        {(game.appliedHints.tier1 || game.appliedHints.tier2 || game.appliedHints.tier3) && (
          <section className="active-hints" aria-live="polite">
            <h2>Applied Hints</h2>
            {game.appliedHints.tier1 && (
              <p><strong>Tier 1:</strong> {game.appliedHintText.tier1 ?? tier1HintText}</p>
            )}
            {game.appliedHints.tier2 && (
              <p><strong>Tier 2:</strong> {game.appliedHintText.tier2 ?? tier2HintText}</p>
            )}
            {game.appliedHints.tier3 && (
              <p><strong>Tier 3:</strong> {game.appliedHintText.tier3 ?? tier3HintText}</p>
            )}
          </section>
        )}

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

        {!gameOver && (
          <Keyboard onKey={handleInput} keyboardState={game.keyboard} disabled={isLocked || gameOver} />
        )}
      </main>

      <Toast message={toast} />

      <div className="sr-only" aria-live="polite">
        {game.status === 'won' ? 'You won the game.' : game.status === 'lost' ? 'You lost the game.' : ''}
      </div>

      <Modal open={showHelp} title="How To Play" onClose={() => setShowHelp(false)}>
        <div className="howto">
          <p className="howto-intro">Guess the Wordle in 6 tries.</p>
          <ul className="howto-list">
            <li>Each guess must be a valid 5-letter word.</li>
            <li>The color of the tiles changes to show how close your guess is.</li>
          </ul>
          <h3>Examples</h3>
          <div className="howto-example">
            <div className="howto-example-row">
              <span className="howto-box howto-box-correct">W</span>
              <span className="howto-box">O</span>
              <span className="howto-box">R</span>
              <span className="howto-box">D</span>
              <span className="howto-box">Y</span>
            </div>
            <p><strong>W</strong> is in the word and in the correct spot.</p>
          </div>
          <div className="howto-example">
            <div className="howto-example-row">
              <span className="howto-box">L</span>
              <span className="howto-box howto-box-present">I</span>
              <span className="howto-box">G</span>
              <span className="howto-box">H</span>
              <span className="howto-box">T</span>
            </div>
            <p><strong>I</strong> is in the word but in the wrong spot.</p>
          </div>
          <div className="howto-example">
            <div className="howto-example-row">
              <span className="howto-box">R</span>
              <span className="howto-box">O</span>
              <span className="howto-box">G</span>
              <span className="howto-box howto-box-absent">U</span>
              <span className="howto-box">E</span>
            </div>
            <p><strong>U</strong> is not in the word in any spot.</p>
          </div>
          <div className="howto-meta">
            Daily reset: {settings.useCompanyTime ? COMPANY_TIMEZONE : 'Your local timezone'} at midnight.
          </div>
        </div>
      </Modal>

      <Modal open={showStats} title="Statistics" onClose={() => setShowStats(false)}>
        {!settings.leaderboardTracking ? (
          <section className="leaderboard-card">
            <h3>Track your stats and badges</h3>
            <p>Enable leaderboard tracking so your progress can be used for rankings.</p>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                applySettings({ leaderboardTracking: true });
                showToast('Leaderboard tracking enabled');
              }}
            >
              Enable leaderboard tracking
            </button>
            <p className="small-note">Account-based global sync can be connected later.</p>
          </section>
        ) : (
          <section className="leaderboard-card leaderboard-card-enabled">
            <h3>Leaderboard tracking is on</h3>
            <p>Your game results are being tracked on this device.</p>
          </section>
        )}
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
          <span>Use Morgan Reset Time ({COMPANY_TIMEZONE})</span>
          <input
            type="checkbox"
            checked={settings.useCompanyTime}
            onChange={(event) => applySettings({ useCompanyTime: event.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>Leaderboard Tracking</span>
          <input
            type="checkbox"
            checked={settings.leaderboardTracking}
            onChange={(event) => applySettings({ leaderboardTracking: event.target.checked })}
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
          <p>{canUseTier1 ? tier1HintText : 'Unlocks after 2 failed submissions'}</p>
          <button
            type="button"
            className="primary-btn hint-apply-btn"
            disabled={!canUseTier1 || game.appliedHints.tier1}
            onClick={() => applyHintTier(1)}
          >
            {game.appliedHints.tier1 ? 'Applied' : 'Apply Tier 1'}
          </button>
        </div>
        <div className="hint-tier">
          <strong>Tier 2</strong>
          <p>{canUseTier2 ? tier2HintText : 'Unlocks after 3 failed submissions'}</p>
          <button
            type="button"
            className="primary-btn hint-apply-btn"
            disabled={!canUseTier2 || game.appliedHints.tier2}
            onClick={() => applyHintTier(2)}
          >
            {game.appliedHints.tier2 ? 'Applied' : 'Apply Tier 2'}
          </button>
        </div>
        <div className="hint-tier">
          <strong>Tier 3</strong>
          <p>{canUseTier3 ? tier3HintText : 'Unlocks after 4 failed submissions'}</p>
          <button
            type="button"
            className="primary-btn hint-apply-btn"
            disabled={!canUseTier3 || game.appliedHints.tier3}
            onClick={() => applyHintTier(3)}
          >
            {game.appliedHints.tier3 ? 'Applied' : 'Apply Tier 3'}
          </button>
        </div>
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
