// ─── Single source of truth for race goals ────────────────────────────────
export interface RaceGoal {
  distKm: number;
  label: string;
  targetMin: number;
}

// Benchmark goals shown on the dashboard. Last entry is the main race.
export const RACE_GOALS: RaceGoal[] = [
  { distKm: 5,    label: '5 км',  targetMin: 25 },
  { distKm: 10,   label: '10 км', targetMin: 57 },
  { distKm: 21.1, label: '21 км', targetMin: 128 },
];

export const RACE_DATE = '2026-08-30';

const MAIN_GOAL = RACE_GOALS[RACE_GOALS.length - 1];
export const RACE_DIST_KM         = MAIN_GOAL.distKm;
export const RACE_TARGET_MIN      = MAIN_GOAL.targetMin;
export const RACE_TARGET_PACE_SEC = Math.round(RACE_TARGET_MIN * 60 / RACE_DIST_KM); // 364 = 6:04/km

// Real HR zones from Strava (GET /athlete/zones), bpm.
export const HR_ZONES = {
  z1: [0, 124],
  z2: [124, 154],
  z3: [154, 169],
  z4: [169, 184],
  z5: [184, 220],
} as const;

export interface PlanSession {
  date: string;
  week: number;
  type: 'interval' | 'easy' | 'tempo' | 'long' | 'race-p';
  title: string;
  targetDist: number;
  targetPaceSec: number;
  desc: string;
}

// 5 training days/week: Пн Вт Ср Чт Сб. Weekly volume ≥30км except the taper
// week (week 6, deliberately cut ~45% before the race). Quality-session work
// portions stay ≤20% of weekly volume (80/20).
export const TRAINING_PLAN: PlanSession[] = [
  // Неделя 1 (20.07–26.07) — Втягивание после перерыва, 32 км, без качественных
  { date: '2026-07-20', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 425, desc: '6 км @ 7:05/км, Z2 124–154' },
  { date: '2026-07-21', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 425, desc: '6 км @ 7:05/км, Z2 124–154' },
  { date: '2026-07-22', week: 1, type: 'easy', title: 'Лёгкий + ускорения', targetDist: 6, targetPaceSec: 420, desc: '6 км @ 7:00/км + 4×20с ускорения, Z2' },
  { date: '2026-07-23', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 425, desc: '6 км @ 7:05/км, Z2 124–154' },
  { date: '2026-07-25', week: 1, type: 'long', title: 'Длинный',       targetDist: 8, targetPaceSec: 415, desc: '8 км @ 6:55/км, Z2' },

  // Неделя 2 (27.07–02.08) — Первая нагрузка, 34 км
  { date: '2026-07-27', week: 2, type: 'easy',  title: 'Лёгкий',       targetDist: 6, targetPaceSec: 420, desc: '6 км @ 7:00/км, Z2' },
  { date: '2026-07-28', week: 2, type: 'easy',  title: 'Лёгкий',       targetDist: 6, targetPaceSec: 415, desc: '6 км @ 6:55/км, Z2' },
  { date: '2026-07-29', week: 2, type: 'tempo', title: 'Темп 15 мин',  targetDist: 7, targetPaceSec: 350, desc: '2 км разм. + 15 мин темп 5:50/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-07-30', week: 2, type: 'easy',  title: 'Лёгкий',       targetDist: 6, targetPaceSec: 420, desc: '6 км @ 7:00/км, Z2' },
  { date: '2026-08-01', week: 2, type: 'long',  title: 'Длинный',      targetDist: 9, targetPaceSec: 410, desc: '9 км @ 6:50/км, Z2' },

  // Неделя 3 (03.08–09.08) — Развитие, 36 км
  { date: '2026-08-03', week: 3, type: 'easy',     title: 'Лёгкий',            targetDist: 6, targetPaceSec: 415, desc: '6 км @ 6:55/км, Z2' },
  { date: '2026-08-04', week: 3, type: 'easy',     title: 'Лёгкий',            targetDist: 6, targetPaceSec: 410, desc: '6 км @ 6:50/км, Z2' },
  { date: '2026-08-05', week: 3, type: 'interval', title: 'Интервалы 5×800м',  targetDist: 8, targetPaceSec: 320, desc: '2 км разм. + 5×800м @ 5:20/км (Z4–Z5), отдых 400м трусцой + 2 км зам.' },
  { date: '2026-08-06', week: 3, type: 'easy',     title: 'Лёгкий',            targetDist: 6, targetPaceSec: 415, desc: '6 км @ 6:55/км, Z2' },
  { date: '2026-08-08', week: 3, type: 'long',     title: 'Длинный',           targetDist: 10, targetPaceSec: 405, desc: '10 км @ 6:45/км, Z2' },

  // Неделя 4 (10.08–16.08) — Пик объёма, 38 км
  { date: '2026-08-10', week: 4, type: 'easy',  title: 'Лёгкий',      targetDist: 7, targetPaceSec: 415, desc: '7 км @ 6:55/км, Z2' },
  { date: '2026-08-11', week: 4, type: 'easy',  title: 'Лёгкий',      targetDist: 6, targetPaceSec: 410, desc: '6 км @ 6:50/км, Z2' },
  { date: '2026-08-12', week: 4, type: 'tempo', title: 'Темп 20 мин', targetDist: 7, targetPaceSec: 345, desc: '2 км разм. + 20 мин темп 5:45/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-08-13', week: 4, type: 'easy',  title: 'Лёгкий',      targetDist: 6, targetPaceSec: 420, desc: '6 км @ 7:00/км, Z2' },
  { date: '2026-08-15', week: 4, type: 'long',  title: 'Длинный с финишем', targetDist: 12, targetPaceSec: 400, desc: '12 км, старт 6:40–7:00/км (Z2), последние 3 км ближе к 6:05–6:15/км (Z3)' },

  // Неделя 5 (17.08–23.08) — Пиковая длинная + заточка, 38 км
  { date: '2026-08-17', week: 5, type: 'easy',     title: 'Лёгкий',           targetDist: 6, targetPaceSec: 410, desc: '6 км @ 6:50/км, Z2' },
  { date: '2026-08-18', week: 5, type: 'easy',     title: 'Лёгкий',           targetDist: 6, targetPaceSec: 405, desc: '6 км @ 6:45/км, Z2' },
  { date: '2026-08-19', week: 5, type: 'interval', title: 'Интервалы 5×800м', targetDist: 8, targetPaceSec: 318, desc: '2 км разм. + 5×800м @ 5:18/км (Z4–Z5), отдых 400м + 2 км зам.' },
  { date: '2026-08-20', week: 5, type: 'easy',     title: 'Лёгкий',           targetDist: 5, targetPaceSec: 420, desc: '5 км @ 7:00/км, Z2' },
  { date: '2026-08-22', week: 5, type: 'long',     title: 'Ключевая длинная', targetDist: 13, targetPaceSec: 400, desc: 'Ключевая: старт 6:40–7:00/км (Z2), последние 3 км в целевом темпе 6:02–6:10/км (Z3)' },

  // Неделя 6 (24.08–30.08) — Тейпер и гонка, 20 км (сознательно ниже 30 — снижение объёма перед стартом)
  { date: '2026-08-24', week: 6, type: 'easy', title: 'Лёгкий',              targetDist: 5, targetPaceSec: 415, desc: '5 км @ 6:55/км, Z2' },
  { date: '2026-08-25', week: 6, type: 'easy', title: 'Лёгкий + ускорения',  targetDist: 5, targetPaceSec: 410, desc: '5 км @ 6:50/км + 5×200м ускорения @ 5:05/км (Z4–Z5)' },
  { date: '2026-08-26', week: 6, type: 'easy', title: 'Совсем легко',        targetDist: 4, targetPaceSec: 420, desc: '4 км @ 7:00/км, Z2' },
  { date: '2026-08-27', week: 6, type: 'easy', title: 'Разгрузка',           targetDist: 3, targetPaceSec: 425, desc: '3 км @ 7:05/км, Z1–Z2' },
  { date: '2026-08-29', week: 6, type: 'easy', title: 'Шарк-аут',            targetDist: 3, targetPaceSec: 415, desc: '3 км @ 6:55/км + пара ускорений, перед стартом' },

  // Вс 30.08 — ГОНКА. Целевой темп 6:02–6:10/км (Z3), финиш ≈2:08:00.
];

export const TYPE_LABELS: Record<string, string> = {
  interval: 'Интервалы', easy: 'Лёгкий', tempo: 'Темп', long: 'Длинный', 'race-p': 'Гоночный',
};
export const TYPE_COLORS: Record<string, string> = {
  interval: 'var(--orange)', easy: 'var(--green)', tempo: '#eab308',
  long: 'var(--blue)', 'race-p': '#f44336',
};
