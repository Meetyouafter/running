export const DISTANCES = [
  { km: 5,    label: '5 км' },
  { km: 10,   label: '10 км' },
  { km: 21.1, label: '21.1 км' },
  { km: 42.2, label: '42.2 км' },
] as const;

export interface PaceParts { min: string; sec: string }
export interface TimeParts { h: string; m: string; s: string }

/** Keeps only digits and caps length so inputs never hold garbage. */
export function digits(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

const num = (s: string) => Number(s) || 0;

export const paceToSec = (p: PaceParts) => num(p.min) * 60 + num(p.sec);
export const timeToSec = (t: TimeParts) => num(t.h) * 3600 + num(t.m) * 60 + num(t.s);

export function secToPace(sec: number): PaceParts {
  const total = Math.round(sec);
  return { min: String(Math.floor(total / 60)), sec: String(total % 60).padStart(2, '0') };
}

export function secToTime(sec: number): TimeParts {
  const total = Math.round(sec);
  return {
    h: String(Math.floor(total / 3600)),
    m: String(Math.floor((total % 3600) / 60)).padStart(2, '0'),
    s: String(total % 60).padStart(2, '0'),
  };
}

/** h:mm:ss, or m:ss when under an hour. */
export function formatTime(sec: number): string {
  const { h, m, s } = secToTime(sec);
  return h === '0' ? `${Number(m)}:${s}` : `${h}:${m}:${s}`;
}
