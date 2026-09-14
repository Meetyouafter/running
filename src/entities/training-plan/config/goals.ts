import type { RaceGoal } from '../model/types';

// ─── Single source of truth for race goals ────────────────────────────────
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

