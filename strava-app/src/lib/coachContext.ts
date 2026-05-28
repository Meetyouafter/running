import type { StravaActivity, StravaSplit } from '../types/strava';
import { TYPE_LABELS, RACE_DATE, RACE_TARGET_PACE_SEC } from './trainingPlan';
import type { PlanSession } from './trainingPlan';
import { dur, fmt, paceSecToStr } from './utils';

const GOAL_DATE = RACE_DATE;
const GOAL_PACE = RACE_TARGET_PACE_SEC;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function s2p(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function splitPace(sp: StravaSplit): number {
  return sp.average_speed > 0 ? Math.round(1000 / sp.average_speed) : 999;
}

// ─── Detect warmup/cooldown boundary from splits ──────────────────────────
function partitionSplits(splits: StravaSplit[], targetPaceSec: number): {
  warmup: StravaSplit[];
  work: StravaSplit[];
  cooldown: StravaSplit[];
} {
  if (!splits.length) return { warmup: [], work: [], cooldown: [] };

  // Primary: splits faster than target + 40s
  let threshold = targetPaceSec + 40;
  let isWork = splits.map(s => splitPace(s) <= threshold);

  // Fallback: if nothing found, use fastest 40% of splits as "work"
  if (!isWork.includes(true) && splits.length >= 3) {
    const sorted = [...splits].map(splitPace).sort((a, b) => a - b);
    threshold = sorted[Math.floor(sorted.length * 0.4)];
    isWork = splits.map(s => splitPace(s) <= threshold);
  }

  const first = isWork.indexOf(true);
  const last  = isWork.lastIndexOf(true);
  if (first === -1) return { warmup: splits, work: [], cooldown: [] };

  return {
    warmup:   splits.slice(0, first),
    work:     splits.slice(first, last + 1),
    cooldown: splits.slice(last + 1),
  };
}

// ─── Interval session: find the N fast "rep" splits within work portion ──
function formatIntervalSplits(splits: StravaSplit[], plan: PlanSession): string {
  if (!splits.length) return '  (нет данных по сплитам)';

  const { warmup, work, cooldown } = partitionSplits(splits, plan.targetPaceSec);

  // Among work splits, alternate fast (reps) and slow (recovery)
  const repThreshold = plan.targetPaceSec + 20;
  const reps      = work.filter(s => splitPace(s) <= repThreshold);
  const recoveries = work.filter(s => splitPace(s) > repThreshold);

  const lines: string[] = [];

  if (warmup.length) {
    const wuPace = Math.round(warmup.reduce((s, sp) => s + splitPace(sp), 0) / warmup.length);
    const wuKm   = fmt(warmup.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
    lines.push(`  Разминка: ${wuKm}км @ ${s2p(wuPace)}/км`);
  }

  if (reps.length) {
    lines.push(`  Интервалы (${reps.length} повтор${reps.length > 1 ? 'а' : ''}):`)
    reps.forEach((r, i) => {
      const p   = splitPace(r);
      const km  = fmt(r.distance / 1000, 2);
      const hr  = r.average_heartrate ? ` ЧСС ${Math.round(r.average_heartrate)}` : '';
      const rec = recoveries[i];
      const recStr = rec ? ` → восст. ${s2p(splitPace(rec))}/км` : '';
      lines.push(`    ${i + 1}. ${km}км @ ${s2p(p)}/км${hr}${recStr}`);
    });
    const avgRepPace = Math.round(reps.reduce((s, r) => s + splitPace(r), 0) / reps.length);
    lines.push(`  Средний темп интервалов: ${s2p(avgRepPace)}/км (план: ${paceSecToStr(plan.targetPaceSec)}/км, разница: ${avgRepPace > plan.targetPaceSec ? '+' : ''}${avgRepPace - plan.targetPaceSec}с)`);
  } else if (work.length) {
    // Couldn't separate reps, show work block
    const wPace = Math.round(work.reduce((s, sp) => s + splitPace(sp), 0) / work.length);
    lines.push(`  Рабочая часть: ${fmt(work.reduce((s, sp) => s + sp.distance, 0) / 1000, 1)}км @ ${s2p(wPace)}/км (план: ${paceSecToStr(plan.targetPaceSec)}/км)`);
  }

  if (cooldown.length) {
    const cdPace = Math.round(cooldown.reduce((s, sp) => s + splitPace(sp), 0) / cooldown.length);
    const cdKm   = fmt(cooldown.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
    lines.push(`  Заминка: ${cdKm}км @ ${s2p(cdPace)}/км`);
  }

  return lines.join('\n');
}

// ─── Tempo session ────────────────────────────────────────────────────────
function formatTempoSplits(splits: StravaSplit[], plan: PlanSession): string {
  if (!splits.length) return '  (нет данных по сплитам)';

  const { warmup, work, cooldown } = partitionSplits(splits, plan.targetPaceSec);
  const lines: string[] = [];

  if (warmup.length) {
    const p  = Math.round(warmup.reduce((s, sp) => s + splitPace(sp), 0) / warmup.length);
    const km = fmt(warmup.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
    lines.push(`  Разминка: ${km}км @ ${s2p(p)}/км`);
  }

  if (work.length) {
    const p  = Math.round(work.reduce((s, sp) => s + splitPace(sp), 0) / work.length);
    const km = fmt(work.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
    const hr = work.filter(sp => sp.average_heartrate).length
      ? `ЧСС ${Math.round(work.filter(sp => sp.average_heartrate).reduce((s, sp) => s + (sp.average_heartrate || 0), 0) / work.filter(sp => sp.average_heartrate).length)}`
      : '';
    const diff = p - plan.targetPaceSec;
    lines.push(`  Темповый блок: ${km}км @ ${s2p(p)}/км${hr ? ' ' + hr : ''} (план: ${paceSecToStr(plan.targetPaceSec)}/км, разница: ${diff > 0 ? '+' : ''}${diff}с)`);

    // First vs second half drift
    const mid = Math.floor(work.length / 2);
    if (work.length >= 4 && mid > 0) {
      const p1 = Math.round(work.slice(0, mid).reduce((s, sp) => s + splitPace(sp), 0) / mid);
      const p2 = Math.round(work.slice(mid).reduce((s, sp) => s + splitPace(sp), 0) / (work.length - mid));
      lines.push(`  Дрифт: первая половина ${s2p(p1)}/км → вторая ${s2p(p2)}/км (${p2 > p1 ? '+' : ''}${p2 - p1}с)`);
    }
  }

  if (cooldown.length) {
    const p  = Math.round(cooldown.reduce((s, sp) => s + splitPace(sp), 0) / cooldown.length);
    const km = fmt(cooldown.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
    lines.push(`  Заминка: ${km}км @ ${s2p(p)}/км`);
  }

  return lines.join('\n');
}

// ─── Long / easy run ──────────────────────────────────────────────────────
function formatLongSplits(splits: StravaSplit[], plan: PlanSession): string {
  if (!splits.length) return '  (нет данных по сплитам)';
  const lines: string[] = [];

  const overall = Math.round(splits.reduce((s, sp) => s + splitPace(sp), 0) / splits.length);
  const km = fmt(splits.reduce((s, sp) => s + sp.distance, 0) / 1000, 1);
  const diff = overall - plan.targetPaceSec;
  lines.push(`  Итого: ${km}км @ ${s2p(overall)}/км (план: ${paceSecToStr(plan.targetPaceSec)}/км, разница: ${diff > 0 ? '+' : ''}${diff}с)`);

  // First/last quarter for fade analysis
  const q = Math.floor(splits.length / 4);
  if (q > 0) {
    const p1 = Math.round(splits.slice(0, q).reduce((s, sp) => s + splitPace(sp), 0) / q);
    const p4 = Math.round(splits.slice(-q).reduce((s, sp) => s + splitPace(sp), 0) / q);
    lines.push(`  Начало: ${s2p(p1)}/км → Конец: ${s2p(p4)}/км (fade: ${p4 > p1 ? '+' : ''}${p4 - p1}с)`);
  }

  // HR drift
  const hrSplits = splits.filter(sp => sp.average_heartrate);
  if (hrSplits.length >= 4) {
    const midHr = Math.floor(hrSplits.length / 2);
    const hr1 = Math.round(hrSplits.slice(0, midHr).reduce((s, sp) => s + (sp.average_heartrate || 0), 0) / midHr);
    const hr2 = Math.round(hrSplits.slice(midHr).reduce((s, sp) => s + (sp.average_heartrate || 0), 0) / (hrSplits.length - midHr));
    lines.push(`  Аэробный декаплинг: ЧСС ${hr1}→${hr2} (${hr2 > hr1 ? '+' : ''}${hr2 - hr1} уд)`);
  }

  return lines.join('\n');
}

// ─── Find plan session for activity ───────────────────────────────────────
function matchPlan(activity: StravaActivity, plan: PlanSession[]): PlanSession | null {
  const date = activity.start_date_local.slice(0, 10);
  return plan.find(s => s.date === date) ?? null;
}

// ─── Format one activity with phase breakdown ─────────────────────────────
function formatActivity(a: StravaActivity, index: number, plan: PlanSession[]): string {
  const date    = a.start_date_local.slice(0, 10);
  const km      = fmt(a.distance / 1000, 2);
  const paceSec = a.average_speed > 0 ? Math.round(1000 / a.average_speed) : 0;
  const hrStr   = a.average_heartrate ? ` ЧСС ${Math.round(a.average_heartrate)}` : '';
  const session = matchPlan(a, plan);
  const planTag = session ? ` [план: ${TYPE_LABELS[session.type]}]` : '';

  const isWorkout = session && (session.type === 'interval' || session.type === 'tempo' || session.type === 'race-p');

  // For workouts, mark avg pace as full-run average (includes warmup/cooldown) — NOT the work pace
  const paceLabel = isWorkout
    ? `средн.вся ${paceSec ? s2p(paceSec) : '—'}/км⚠`
    : (paceSec ? `${s2p(paceSec)}/км` : '—');

  const header = `${index + 1}. ${date} "${a.name}"${planTag} — ${km}км · ${paceLabel} · ${dur(a.moving_time)}${hrStr}`;

  if (!session) return header;

  // No splits: show explicit warning for workouts
  if (!a.splits_metric?.length) {
    if (isWorkout) {
      return header + `\n  ⚠ Нет данных по сплитам. Средний темп ${paceSec ? s2p(paceSec) : '—'}/км — это вся пробежка включая разминку/заминку, НЕ является темпом рабочих отрезков.`;
    }
    return header;
  }

  let detail = '';
  if (session.type === 'interval') {
    detail = '\n' + formatIntervalSplits(a.splits_metric, session);
  } else if (session.type === 'tempo' || session.type === 'race-p') {
    detail = '\n' + formatTempoSplits(a.splits_metric, session);
  } else if (session.type === 'long' || session.type === 'easy') {
    detail = '\n' + formatLongSplits(a.splits_metric, session);
  }

  return header + detail;
}

// ─── Plan status ──────────────────────────────────────────────────────────
function planStatus(plan: PlanSession[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  let week = 0, completed = 0, total = 0;

  for (const s of plan) {
    if (s.week !== week) { week = s.week; lines.push(`\nНЕДЕЛЯ ${week}:`); }
    const icon = s.date < today ? '✓' : s.date === today ? '▶' : '○';
    if (s.date < today) completed++;
    total++;
    lines.push(`  ${icon} ${s.date} [${TYPE_LABELS[s.type]}] ${s.title} — ${s.desc} (${s.targetDist}км @ ${paceSecToStr(s.targetPaceSec)}/км)`);
  }
  lines.push(`\nВыполнено: ${completed}/${total} тренировок`);
  return lines.join('\n');
}

function nextSession(plan: PlanSession[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const next  = plan.find(s => s.date >= today);
  if (!next) return 'Все тренировки выполнены.';
  const days = daysUntil(next.date);
  const when = days === 0 ? 'СЕГОДНЯ' : days === 1 ? 'завтра' : `через ${days} дней (${next.date})`;
  return `${when}: [${TYPE_LABELS[next.type]}] ${next.title} — ${next.desc} (${next.targetDist}км @ ${paceSecToStr(next.targetPaceSec)}/км)`;
}

// ─── Weekly volume ────────────────────────────────────────────────────────
function weeklyVolume(runs: StravaActivity[]): string {
  const map: Record<string, number> = {};
  for (const a of runs) {
    const d = new Date(a.start_date_local);
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = mon.toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + a.distance / 1000;
  }
  const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6);

  // Check 10% rule violation
  const volumes = entries.map(([, v]) => v);
  const notes: string[] = [];
  for (let i = 1; i < volumes.length; i++) {
    const growth = (volumes[i] - volumes[i - 1]) / volumes[i - 1] * 100;
    if (growth > 12) notes.push(`⚠ Рост объёма на ${fmt(growth, 0)}% (>10%, риск перегрузки)`);
  }

  return entries.map(([w, km]) => `  Неделя с ${w}: ${fmt(km, 1)} км`).join('\n')
    + (notes.length ? '\n' + notes.join('\n') : '');
}

// ─── Easy run discipline ──────────────────────────────────────────────────
function easyRunDiscipline(runs: StravaActivity[], plan: PlanSession[]): string {
  const easyPaceThreshold = GOAL_PACE + 78; // ~7:00/km
  const easyRuns = runs.filter(a => {
    const s = matchPlan(a, plan);
    return s?.type === 'easy' || s?.type === 'long';
  }).slice(0, 8);

  if (!easyRuns.length) return 'Нет данных';

  const tooFast = easyRuns.filter(a => {
    const p = a.average_speed > 0 ? Math.round(1000 / a.average_speed) : 999;
    return p < easyPaceThreshold;
  });

  if (tooFast.length === 0) return 'Лёгкие пробежки — в норме';
  return `⚠ ${tooFast.length}/${easyRuns.length} лёгких пробежек выполнены слишком быстро (норма >${s2p(easyPaceThreshold)}/км)`;
}

// ─── TSB fatigue ──────────────────────────────────────────────────────────
function fatigue(runs: StravaActivity[]): string {
  const now = Date.now();
  let acute = 0, chronic = 0;
  for (const a of runs) {
    const age  = (now - new Date(a.start_date).getTime()) / 86400000;
    const load = (a.moving_time / 60) * (a.average_heartrate || 140) / 100;
    if (age <= 7)  acute   += load;
    if (age <= 28) chronic += load;
  }
  const atl = acute / 7, ctl = chronic / 28, tsb = ctl - atl;
  const status = tsb > 10 ? 'свежий' : tsb > 0 ? 'норма' : tsb > -10 ? 'накопленная усталость' : 'высокая усталость';
  return `ATL ${fmt(atl, 1)} / CTL ${fmt(ctl, 1)} / TSB ${fmt(tsb, 1)} → ${status}`;
}

// ─── Progress toward goal ─────────────────────────────────────────────────
function goalProgress(runs: StravaActivity[]): string {
  // Use best recent 5km or 10km effort as proxy
  const recent = runs.slice(0, 10);
  const bestPace = recent.reduce((best, a) => {
    const p = a.average_speed > 0 ? Math.round(1000 / a.average_speed) : 999;
    return p < best ? p : best;
  }, 999);

  if (bestPace === 999) return 'Нет данных';
  const gap = bestPace - GOAL_PACE;
  if (gap <= 0) return `✓ Лучший темп ${s2p(bestPace)}/км уже быстрее цели`;
  return `Лучший темп за последние 10 пробежек: ${s2p(bestPace)}/км (до цели: −${gap}с/км)`;
}

// ─── Main export ──────────────────────────────────────────────────────────
export function buildSystemPrompt(recentActivities: StravaActivity[], plan: PlanSession[]): string {
  const today    = new Date().toISOString().slice(0, 10);
  const daysLeft = daysUntil(GOAL_DATE);
  const runs     = recentActivities.filter(a => a.type === 'Run');
  const last20   = runs.slice(0, 20);

  const kmLast7  = runs.filter(a => Date.now() - new Date(a.start_date).getTime() < 7 * 86400000).reduce((s, a) => s + a.distance / 1000, 0);
  const kmLast30 = runs.filter(a => Date.now() - new Date(a.start_date).getTime() < 30 * 86400000).reduce((s, a) => s + a.distance / 1000, 0);

  return `Ты — персональный тренер по бегу Антона Левуса. Говоришь прямо, конкретно, без воды.

══════════════════════════════════════════
ПРОФИЛЬ АТЛЕТА
══════════════════════════════════════════
Имя: Антон Левус · Да Нанг, Вьетнам
Дата: ${today} · Осталось до забега: ${daysLeft} дней
ЦЕЛЬ: 10 км за 57:00 (темп ${s2p(GOAL_PACE)}/км) · ${GOAL_DATE}

Объём 7д: ${fmt(kmLast7, 1)} км / 30д: ${fmt(kmLast30, 1)} км
Нагрузка (TSB): ${fatigue(last20)}
Прогресс: ${goalProgress(last20)}
Дисциплина лёгких пробежек: ${easyRunDiscipline(last20, plan)}

КЛИМАТ: Да Нанг +30°С, влажность 80%+ → поправка к темпу +20–30с/км.
При оценке интервалов и темпа сначала вычти климатическую поправку.

══════════════════════════════════════════
ТРЕНИРОВОЧНЫЙ ПЛАН
══════════════════════════════════════════
${planStatus(plan)}

СЛЕДУЮЩАЯ: ${nextSession(plan)}

══════════════════════════════════════════
ОБЪЁМ ПО НЕДЕЛЯМ (последние 6)
══════════════════════════════════════════
${weeklyVolume(runs)}

══════════════════════════════════════════
ПОСЛЕДНИЕ ПРОБЕЖКИ С РАЗБИВКОЙ ПО ФАЗАМ
══════════════════════════════════════════
Для интервальных: разминка / каждый повтор / заминка
Для темповых: разминка / темповый блок (с дрифтом) / заминка
Для длинных/лёгких: целиком + fade + аэробный декаплинг

Темп плана — это темп РАБОЧЕЙ части, не всей пробежки.

${last20.map((a, i) => formatActivity(a, i, plan)).join('\n\n')}

══════════════════════════════════════════
ЦЕЛЕВЫЕ ТЕМПЫ
══════════════════════════════════════════
  Восстановительный: >7:30/км
  Лёгкий:            7:00–7:30/км
  Темп/порог:        5:27–6:10/км
  Гоночный:          5:32–5:52/км (с климат. поправкой: 5:52–6:12/км)
  Интервальный:      <5:27/км

══════════════════════════════════════════
ПРАВИЛА ТРЕНЕРА
══════════════════════════════════════════
1. Никаких вводных слов ("Конечно!", "Отличный вопрос!") — сразу к делу
2. КРИТИЧНО — для интервальных и темповых сессий:
   - Строка "средн.вся Х/км⚠" = средний темп ВСЕЙ пробежки включая разминку и заминку
   - НИКОГДА не сравнивай этот темп с целевым темпом интервалов/темпа
   - Для оценки качества работы используй ТОЛЬКО данные из раздела "Разминка / Интервалы / Заминка"
   - Если написано "⚠ Нет данных по сплитам" — нельзя делать вывод о том, выполнены ли интервалы в нужном темпе
3. Климатическую поправку применяй автоматически — не надо объяснять каждый раз
4. Если видишь нарушение правила 10% по объёму — предупреждай
5. Если лёгкие пробежки стабильно быстрее нормы — говори, что это съедает восстановление
6. Если пропущена тренировка — не ругай, предложи как скорректировать план
7. Давай конкретные цифры: дату, темп, дистанцию, ЧСС
8. ИЗМЕНЕНИЕ ПЛАНА: когда пользователь просит изменить/переделать план, ОБЯЗАТЕЛЬНО выводи в конце ответа полный обновлённый план в блоке:
\`\`\`plan-update
[{"date":"YYYY-MM-DD","week":N,"type":"interval|easy|tempo|long|race-p","title":"...","targetDist":N,"targetPaceSec":N,"desc":"..."}]
\`\`\`
Выводи ПОЛНЫЙ список всех сессий (не только изменённые).`;
}
