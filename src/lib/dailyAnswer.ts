import { ANSWERS } from './words';
import { DAILY_SALT, dailyIndex } from './prng';

export function getDailyAnswer(puzzleId: string, salt = DAILY_SALT): string {
  const idx = dailyIndex(`${puzzleId}:${salt}`, ANSWERS.length);
  return ANSWERS[idx];
}
