// ─── Single source of truth for the race goal ────────────────────────────
export const RACE_DATE            = '2026-07-19';
export const RACE_DIST_KM         = 10;
export const RACE_TARGET_MIN      = 57;
export const RACE_TARGET_PACE_SEC = Math.round(RACE_TARGET_MIN * 60 / RACE_DIST_KM); // 342 = 5:42/km

export interface PlanSession {
  date: string;
  week: number;
  type: 'interval' | 'easy' | 'tempo' | 'long' | 'race-p';
  title: string;
  targetDist: number;
  targetPaceSec: number;
  desc: string;
}

export const TRAINING_PLAN: PlanSession[] = [
  // Неделя 1
  { date: '2026-05-19', week: 1, type: 'interval', title: 'Интервалы 4×800м',     targetDist: 9,  targetPaceSec: 333, desc: '4×800м @ 5:33/км' },
  { date: '2026-05-20', week: 1, type: 'easy',     title: 'Восстановительный',    targetDist: 6,  targetPaceSec: 440, desc: '6 км @ 7:20/км' },
  { date: '2026-05-21', week: 1, type: 'tempo',    title: 'Темп 5 км',             targetDist: 9,  targetPaceSec: 365, desc: '5 км @ 6:05/км' },
  { date: '2026-05-25', week: 1, type: 'long',     title: 'Длинный лёгкий',        targetDist: 14, targetPaceSec: 435, desc: '14 км @ 7:15/км' },
  // Неделя 2
  { date: '2026-05-26', week: 2, type: 'interval', title: 'Интервалы 5×1000м',    targetDist: 11, targetPaceSec: 333, desc: '5×1000м @ 5:33/км' },
  { date: '2026-05-27', week: 2, type: 'easy',     title: 'Лёгкий бег',           targetDist: 8,  targetPaceSec: 450, desc: '8 км @ 7:30/км' },
  { date: '2026-05-28', week: 2, type: 'tempo',    title: 'Темп 5 км',             targetDist: 10, targetPaceSec: 375, desc: '5 км @ 6:15/км' },
  { date: '2026-06-01', week: 2, type: 'long',     title: 'Длинный с финишем',     targetDist: 14, targetPaceSec: 435, desc: '14 км @ 7:15/км' },
  // Неделя 3
  { date: '2026-06-02', week: 3, type: 'interval', title: 'Интервалы 6×1000м',    targetDist: 12, targetPaceSec: 330, desc: '6×1000м @ 5:30/км' },
  { date: '2026-06-03', week: 3, type: 'easy',     title: 'Лёгкий',               targetDist: 6,  targetPaceSec: 440, desc: '6 км @ 7:20/км' },
  { date: '2026-06-04', week: 3, type: 'race-p',   title: 'Гоночный темп 4 км',   targetDist: 8,  targetPaceSec: 342, desc: '4 км @ 5:42/км' },
  { date: '2026-06-08', week: 3, type: 'long',     title: 'Длинный лёгкий',        targetDist: 13, targetPaceSec: 435, desc: '13 км @ 7:15/км' },
  // Неделя 4
  { date: '2026-06-09', week: 4, type: 'interval', title: 'Интервалы 3×2000м',    targetDist: 12, targetPaceSec: 333, desc: '3×2000м @ 5:33/км' },
  { date: '2026-06-10', week: 4, type: 'easy',     title: 'Восстановление',        targetDist: 6,  targetPaceSec: 450, desc: '6 км @ 7:30/км' },
  { date: '2026-06-11', week: 4, type: 'race-p',   title: 'Темп + гоночный финиш', targetDist: 10, targetPaceSec: 342, desc: '4+2 км @ 5:42/км' },
  { date: '2026-06-15', week: 4, type: 'long',     title: 'Длинный умеренный',     targetDist: 11, targetPaceSec: 400, desc: '11 км @ 6:40/км' },
  // Неделя 5
  { date: '2026-06-16', week: 5, type: 'interval', title: '4×600м',               targetDist: 7,  targetPaceSec: 320, desc: '4×600м @ 5:20/км' },
  { date: '2026-06-17', week: 5, type: 'easy',     title: 'Лёгкий',               targetDist: 5,  targetPaceSec: 440, desc: '5 км @ 7:20/км' },
  { date: '2026-06-18', week: 5, type: 'race-p',   title: 'Репетиция темпа 3 км', targetDist: 7,  targetPaceSec: 342, desc: '3 км @ 5:42/км' },
  { date: '2026-06-22', week: 5, type: 'easy',     title: 'Лёгкая пробежка',      targetDist: 6,  targetPaceSec: 420, desc: '6 км @ 7:00/км' },
];

export const TYPE_LABELS: Record<string, string> = {
  interval: 'Интервалы', easy: 'Лёгкий', tempo: 'Темп', long: 'Длинный', 'race-p': 'Гоночный',
};
export const TYPE_COLORS: Record<string, string> = {
  interval: 'var(--orange)', easy: 'var(--green)', tempo: '#eab308',
  long: 'var(--blue)', 'race-p': '#f44336',
};
