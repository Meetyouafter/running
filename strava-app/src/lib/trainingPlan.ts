// ─── Single source of truth for race goals ────────────────────────────────
export interface RaceGoal {
  distKm: number;
  label: string;
  targetMin: number;
}

// Benchmark goals shown on the dashboard. Last entry is the main race.
//
// 21 км цель: 130 мин (2:10) — задано пользователем вручную.
// Для справки: прогноз 2:03:41, который раньше показывал дашборд,
// экстраполирован (Riegel) от рекорда на 5 км (26:53) и, скорее всего,
// оптимистичен для бегуна без наработанной выносливости на длинных.
// Экстраполяция от 10 км (1:05:20) даёт ~2:24, фактический PR на дистанции,
// близкой к половинке (21.4 км, март) — 2:17:03, и с 25 июня по 18 июля был
// перерыв (~24 дня) в тренировках. 2:10 (-7 мин к PR) — более амбициозная
// цель, чем говорят данные о текущей форме; план ниже держит тот же темп
// нарастания нагрузки, что и раньше, но финальные недели (5–6) потребуют,
// чтобы фактические темпы обгоняли план — иначе стоит быть готовым сдвинуть
// цель обратно к 2:13–2:15 по факту недель 3–4.
export const RACE_GOALS: RaceGoal[] = [
  { distKm: 5,    label: '5 км',  targetMin: 25 },
  { distKm: 10,   label: '10 км', targetMin: 57 },
  { distKm: 21.1, label: '21 км', targetMin: 130 },
];

export const RACE_DATE = '2026-08-30';

const MAIN_GOAL = RACE_GOALS[RACE_GOALS.length - 1];
export const RACE_DIST_KM         = MAIN_GOAL.distKm;
export const RACE_TARGET_MIN      = MAIN_GOAL.targetMin;
export const RACE_TARGET_PACE_SEC = Math.round(RACE_TARGET_MIN * 60 / RACE_DIST_KM); // 370 = 6:10/km

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

// 5 training days/week: Пн Вт Ср Чт Сб.
//
// Неделя 1 (база, без качественных): сохранена как есть для уже прошедших/
// сегодняшней тренировок (20, 21, 22.07 — не трогаем задним числом). Ср 23.07
// и Сб 25.07 смягчены — темп и дистанция снижены под факт: 20–21.07 пробежки
// прошли на 7:37 и 8:09/км при пульсе в норме (125, 128), заметно медленнее
// плановых 7:05/км — значит текущая лёгкая форма сейчас медленнее.
//
// С недели 2 — новая структура 5 тренировок: 2 лёгких + 1 темповая +
// 1 интервалы + 1 длинная (было 3 лёгких + 1 темповая + 1 длинная, интервалы
// начинались только с недели 3). Порядок дней: Пн лёгкий, Вт интервалы,
// Ср лёгкий, Чт темповая, Сб длинная — между качественными днями всегда
// минимум один лёгкий/выходной для восстановления.
//
// Объём недель 1–2 снижен и почти не растёт (31 → ~30 км) — неделя 2 работает
// как консолидация после первой нагрузки на фоне перерыва, а не разгон.
// Дальше рост ~12–15%/нед до пика недели 5 (~38 км, было 38 — вернулись к
// исходному пику, но позже и постепенно, а не со старта). Интервалы стартуют
// с более длинных пауз и коротких отрезков (400м) и постепенно удлиняются до
// 800м к неделе 4–5 — безопасное возвращение к качественной работе после
// перерыва, а не сразу пиковая интенсивность.
//
// Неделя 6 (тейпер) — сознательно НЕ повторяет схему 2+1+1+1 из недель 2–5:
// полноценная интервальная и длинная тренировки за неделю до старта не нужны
// и рискованны. Вместо этого — лёгкие пробежки, короткие ускорения и
// короткая настройка на целевой темп, объём снижен ~45% от пика (было ~20 км,
// сейчас ~21.5 км, т.к. пик ниже исходного).
export const TRAINING_PLAN: PlanSession[] = [
  // Неделя 1 (20.07–26.07) — База, без качественных. 20–22.07 не менялись
  // (прошли/идут сегодня). 23 и 25.07 смягчены под факт последних пробежек.
  { date: '2026-07-20', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 425, desc: '6 км @ 7:05/км, Z2 124–154' },
  { date: '2026-07-21', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 425, desc: '6 км @ 7:05/км, Z2 124–154' },
  { date: '2026-07-22', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 450, desc: '6 км @ 7:30/км, Z2 124–154' },
  { date: '2026-07-23', week: 1, type: 'easy', title: 'Лёгкий',        targetDist: 6, targetPaceSec: 450, desc: '6 км @ 7:30/км, Z2 124–154 (темп снижен: 20–21.07 фактически было 7:37–8:09/км при ЧСС в норме)' },
  { date: '2026-07-25', week: 1, type: 'long', title: 'Длинный',       targetDist: 7, targetPaceSec: 440, desc: '7 км @ 7:20/км, Z2 (дистанция и темп немного снижены после перерыва в июне–июле)' },

  // Неделя 2 (27.07–01.08) — Консолидация, ~30 км. Первая неделя с интервалами.
  { date: '2026-07-27', week: 2, type: 'easy',     title: 'Лёгкий',            targetDist: 5,   targetPaceSec: 440, desc: '5 км @ 7:20/км, Z2 124–154' },
  { date: '2026-07-28', week: 2, type: 'interval', title: 'Интервалы 6×400м',  targetDist: 5.5, targetPaceSec: 345, desc: '2 км разм. + 6×400м @ 5:45/км (Z4), отдых 200м трусцой + 1.5 км зам.' },
  { date: '2026-07-29', week: 2, type: 'easy',     title: 'Лёгкий',            targetDist: 5,   targetPaceSec: 435, desc: '5 км @ 7:15/км, Z2 124–154' },
  { date: '2026-07-30', week: 2, type: 'tempo',    title: 'Темп 12 мин',       targetDist: 6,   targetPaceSec: 365, desc: '2 км разм. + 12 мин темп 6:05/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-08-01', week: 2, type: 'long',     title: 'Длинный',           targetDist: 8,   targetPaceSec: 420, desc: '8 км @ 7:00/км, Z2' },

  // Неделя 3 (03.08–08.08) — Развитие, ~33.5 км
  { date: '2026-08-03', week: 3, type: 'easy',     title: 'Лёгкий',            targetDist: 5.5, targetPaceSec: 425, desc: '5.5 км @ 7:05/км, Z2 124–154' },
  { date: '2026-08-04', week: 3, type: 'interval', title: 'Интервалы 6×500м',  targetDist: 6,   targetPaceSec: 330, desc: '2 км разм. + 6×500м @ 5:30/км (Z4–Z5), отдых 300м трусцой + 1.5 км зам.' },
  { date: '2026-08-05', week: 3, type: 'easy',     title: 'Лёгкий',            targetDist: 5.5, targetPaceSec: 420, desc: '5.5 км @ 7:00/км, Z2 124–154' },
  { date: '2026-08-06', week: 3, type: 'tempo',    title: 'Темп 15 мин',       targetDist: 6.5, targetPaceSec: 355, desc: '2 км разм. + 15 мин темп 5:55/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-08-08', week: 3, type: 'long',     title: 'Длинный',           targetDist: 10,  targetPaceSec: 410, desc: '10 км @ 6:50/км, Z2' },

  // Неделя 4 (10.08–15.08) — Приближение к пику, ~36.5 км
  { date: '2026-08-10', week: 4, type: 'easy',     title: 'Лёгкий',                    targetDist: 5.5, targetPaceSec: 415, desc: '5.5 км @ 6:55/км, Z2 124–154' },
  { date: '2026-08-11', week: 4, type: 'interval', title: 'Интервалы 5×800м',          targetDist: 8,   targetPaceSec: 325, desc: '2 км разм. + 5×800м @ 5:25/км (Z4–Z5), отдых 400м трусцой + 2 км зам.' },
  { date: '2026-08-12', week: 4, type: 'easy',     title: 'Лёгкий',                    targetDist: 5.5, targetPaceSec: 410, desc: '5.5 км @ 6:50/км, Z2 124–154' },
  { date: '2026-08-13', week: 4, type: 'tempo',    title: 'Темп 18 мин',               targetDist: 6.5, targetPaceSec: 350, desc: '2 км разм. + 18 мин темп 5:50/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-08-15', week: 4, type: 'long',     title: 'Длинный с ускорением в конце', targetDist: 11, targetPaceSec: 400, desc: '11 км, старт 6:40–7:00/км (Z2), последние 3 км ближе к 6:15–6:20/км (Z3)' },

  // Неделя 5 (17.08–22.08) — Пик, ~38.5 км
  { date: '2026-08-17', week: 5, type: 'easy',     title: 'Лёгкий',           targetDist: 5.5, targetPaceSec: 410, desc: '5.5 км @ 6:50/км, Z2 124–154' },
  { date: '2026-08-18', week: 5, type: 'interval', title: 'Интервалы 5×800м', targetDist: 8,   targetPaceSec: 320, desc: '2 км разм. + 5×800м @ 5:20/км (Z4–Z5), отдых 400м трусцой + 2 км зам.' },
  { date: '2026-08-19', week: 5, type: 'easy',     title: 'Лёгкий',           targetDist: 5,   targetPaceSec: 405, desc: '5 км @ 6:45/км, Z2 124–154' },
  { date: '2026-08-20', week: 5, type: 'tempo',    title: 'Темп 20 мин',      targetDist: 7,   targetPaceSec: 345, desc: '2 км разм. + 20 мин темп 5:45/км (Z3–Z4) + 2 км зам.' },
  { date: '2026-08-22', week: 5, type: 'long',     title: 'Ключевая длинная', targetDist: 13,  targetPaceSec: 400, desc: 'Ключевая: старт 6:40–7:00/км (Z2), последние 3 км в целевом темпе 6:20–6:25/км (Z3)' },

  // Неделя 6 (24.08–29.08) — Тейпер, ~21.5 км. Намеренно НЕ по схеме 2+1+1+1:
  // полная интервальная/длинная тренировка перед стартом не нужна и рискованна.
  { date: '2026-08-24', week: 6, type: 'easy',  title: 'Лёгкий',             targetDist: 5,   targetPaceSec: 415, desc: '5 км @ 6:55/км, Z2' },
  { date: '2026-08-25', week: 6, type: 'easy',  title: 'Лёгкий + ускорения', targetDist: 5,   targetPaceSec: 410, desc: '5 км @ 6:50/км + 5×200м ускорения @ 5:05/км (Z4–Z5)' },
  { date: '2026-08-26', week: 6, type: 'easy',  title: 'Совсем легко',       targetDist: 4,   targetPaceSec: 420, desc: '4 км @ 7:00/км, Z2' },
  { date: '2026-08-27', week: 6, type: 'tempo', title: 'Настройка темпа',    targetDist: 4.5, targetPaceSec: 370, desc: '1.5 км разм. + 8 мин в целевом темпе 6:10/км (Z3) + 1.5 км зам.' },
  { date: '2026-08-29', week: 6, type: 'easy',  title: 'Шарк-аут',           targetDist: 3,   targetPaceSec: 415, desc: '3 км @ 6:55/км + пара ускорений, перед стартом' },

  // Вс 30.08 — ГОНКА. Целевой темп 6:05–6:15/км (Z3), финиш ≈2:10:00.
];

export const TYPE_LABELS: Record<string, string> = {
  interval: 'Интервалы', easy: 'Лёгкий', tempo: 'Темп', long: 'Длинный', 'race-p': 'Гоночный',
};
export const TYPE_COLORS: Record<string, string> = {
  interval: 'var(--orange)', easy: 'var(--green)', tempo: '#eab308',
  long: 'var(--blue)', 'race-p': '#f44336',
};
