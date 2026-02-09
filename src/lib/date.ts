import type { TimeMode } from './types';

const COMPANY_TIMEZONE = 'America/Edmonton';

function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  };
}

export function getPuzzleId(mode: TimeMode, now = new Date()): string {
  if (mode === 'company') {
    const p = zonedParts(now, COMPANY_TIMEZONE);
    return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function secondsUntilNextPuzzle(mode: TimeMode, now = new Date()): number {
  if (mode === 'local') {
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  }

  const current = zonedParts(now, COMPANY_TIMEZONE);
  const nextDayUtc = new Date(Date.UTC(current.year, current.month - 1, current.day + 1, 12, 0, 0));
  const nextDay = zonedParts(nextDayUtc, COMPANY_TIMEZONE);
  const nextMidnightUtc = zonedMidnightToUtc(nextDay.year, nextDay.month, nextDay.day, COMPANY_TIMEZONE);
  return Math.max(0, Math.floor((nextMidnightUtc - now.getTime()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getTimeMode(useCompanyTime: boolean): TimeMode {
  return useCompanyTime ? 'company' : 'local';
}

export { COMPANY_TIMEZONE };

function getOffsetMs(timeZone: string, timestampMs: number): number {
  const date = new Date(timestampMs);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT+0';
  const match = label.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes) * 60_000;
}

function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string): number {
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = getOffsetMs(timeZone, guess);
    guess = Date.UTC(year, month - 1, day, 0, 0, 0) - offset;
  }
  return guess;
}
