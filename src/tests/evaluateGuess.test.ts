import { describe, expect, it } from 'vitest';
import { evaluateGuess, validateHardMode } from '../lib/evaluateGuess';
import type { TileState } from '../lib/types';

describe('evaluateGuess', () => {
  it('marks all green when exact match', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks all gray when no letters match', () => {
    expect(evaluateGuess('crane', 'pilot')).toEqual(['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('handles duplicate overflow: EVADE vs EXEME', () => {
    expect(evaluateGuess('evade', 'exeme')).toEqual(['correct', 'absent', 'absent', 'absent', 'correct']);
  });

  it('handles duplicate letters: BALMY vs ALLEY', () => {
    expect(evaluateGuess('balmy', 'alley')).toEqual(['present', 'absent', 'correct', 'absent', 'correct']);
  });

  it('handles duplicate letters: SHEEP vs PEEPS', () => {
    expect(evaluateGuess('sheep', 'peeps')).toEqual(['present', 'present', 'correct', 'absent', 'present']);
  });

  it('handles mixed repeats', () => {
    expect(evaluateGuess('sassy', 'assay')).toEqual(['present', 'present', 'correct', 'absent', 'correct']);
  });
});

describe('validateHardMode', () => {
  it('requires known green positions', () => {
    const guesses = ['crane'];
    const evals: TileState[][] = [['correct', 'absent', 'absent', 'absent', 'absent']];
    expect(validateHardMode(guesses, evals, 'plane')).toBe('Hard Mode: 1st letter must be C');
  });

  it('requires known yellow letters to be included', () => {
    const guesses = ['adieu'];
    const evals: TileState[][] = [['absent', 'present', 'absent', 'absent', 'absent']];
    expect(validateHardMode(guesses, evals, 'crown')).toBe('Hard Mode: guess must include D');
  });

  it('passes when constraints are satisfied', () => {
    const guesses = ['adieu'];
    const evals: TileState[][] = [['absent', 'present', 'absent', 'absent', 'absent']];
    expect(validateHardMode(guesses, evals, 'dowry')).toBeNull();
  });
});
