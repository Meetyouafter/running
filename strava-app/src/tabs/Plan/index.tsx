import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { isDefaultPlan } from '../../store/useStore';
import { actPaceSec, paceSecToStr, fmt, buildActivityMap, hmFromMin } from '../../lib/utils';
import { TRAINING_PLAN, TYPE_LABELS, TYPE_COLORS, RACE_DATE, RACE_DIST_KM, RACE_TARGET_MIN, RACE_TARGET_PACE_SEC, HR_ZONES } from '../../lib/trainingPlan';
import type { PlanSession } from '../../lib/trainingPlan';
import styles from './Plan.module.css';

interface WeekCardProps {
  id: string;
  title: string;
  phase: { label: string; cls: string };
  dates: string;
  focus: string;
  km: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function WeekCard({ title, phase, dates, focus, km, children, defaultOpen }: WeekCardProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={`${styles.weekCard} ${open ? styles.open : ''}`}>
      <div className={styles.weekHdr} onClick={() => setOpen(!open)}>
        <div>
          <div className={styles.weekTitle}>{title} <span className={`${styles.phase} ${styles[phase.cls]}`}>{phase.label}</span></div>
          <div className={styles.weekDates}>{dates}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={styles.weekFocus}>{focus}</div>
          <div className={styles.weekKm}>{km}</div>
        </div>
        <div className={styles.arrow}>▾</div>
      </div>
      {open && <div className={styles.weekBody}>{children}</div>}
    </div>
  );
}

function Sess({ type, day, date, title, desc, km, tip }: {
  type: string; day: string; date: string; title: string; desc: string; km: string; tip?: string;
}) {
  return (
    <div className={`${styles.sess} ${styles[type]}`}>
      <div><div className={styles.sessDay}>{day}</div><div className={styles.sessDayName}>{date}</div></div>
      <div>
        <div className={styles.sessTitle}>{title}</div>
        {tip && <div className={styles.planTip} style={{ marginTop: 8, fontSize: 11 }}>{tip}</div>}
        <div className={styles.sessDesc} dangerouslySetInnerHTML={{ __html: desc }} />
      </div>
      <div className={styles.sessKm}>{km}</div>
    </div>
  );
}

function qualityCheck(type: string, act: { average_heartrate?: number; splits_metric?: { moving_time: number; distance: number }[]; distance: number; average_speed: number } | null, targetPaceSec: number): { emoji: string; note: string } {
  if (!act) return { emoji: '❌', note: 'пропущено' };
  if (['easy', 'long'].includes(type)) return { emoji: '✅', note: '' };

  const splits = act.splits_metric ?? [];
  if (splits.length > 0) {
    const needed = type === 'tempo' ? 2 : 1;
    const fast = splits.filter(s => s.moving_time / (s.distance / 1000) <= targetPaceSec * 1.07);
    if (fast.length >= needed) return { emoji: '✅', note: `${fast.length} сплит(а) в темпе` };
    return { emoji: '⚠️', note: 'темп ниже цели' };
  }

  const hr = act.average_heartrate;
  if (hr) {
    if (hr >= 133) return { emoji: '✅', note: `ЧСС ${Math.round(hr)}` };
    if (hr >= 128) return { emoji: '⚠️', note: `ЧСС ${Math.round(hr)} — умеренно` };
    return { emoji: '⚠️', note: `ЧСС ${Math.round(hr)} — легко` };
  }

  const distKm = act.distance / 1000;
  const avgPace = act.average_speed > 0 ? 1000 / act.average_speed : 0;
  if (avgPace > 0 && distKm > 4) {
    const wucd = Math.min(3.5, distKm * 0.4);
    const qPace = (avgPace * distKm - 420 * wucd) / (distKm - wucd);
    if (qPace <= targetPaceSec * 1.08) return { emoji: '✅', note: '' };
    return { emoji: '⚠️', note: 'темп ниже цели' };
  }
  return { emoji: '✅', note: '' };
}

function WeekActuals({ weekNum }: { weekNum: number }) {
  const { activities, plan: storePlan } = useStore();
  const runs = activities.filter(a => a.type === 'Run');
  const plan = storePlan.filter(p => p.week === weekNum);
  const actMap = useMemo(() => buildActivityMap(runs, storePlan), [runs, storePlan]);
  if (!runs.length) return null;

  const today = new Date().toISOString().slice(0, 10);
  const matched = plan.map(p => ({ plan: p, act: actMap.get(p.date) ?? null }));

  const totalKm = matched.reduce((s, { act }) => s + (act ? act.distance / 1000 : 0), 0);

  return (
    <div className={styles.weekActuals}>
      <div className={styles.weekActualsTitle}>Факт недели</div>
      {matched.map(({ plan: p, act }) => {
        const isPast = p.date <= today;
        const distKm = act ? act.distance / 1000 : 0;
        // For interval sessions the list API only has average_speed (whole run incl. warmup/recovery),
        // which is ~52s/km slower than interval target — don't show it, it's misleading
        const paceStr = act && actPaceSec(act) > 0 && p.type !== 'interval'
          ? paceSecToStr(Math.round(actPaceSec(act))) : null;
        const hrStr = act?.average_heartrate ? `ЧСС ${Math.round(act.average_heartrate)}` : null;
        const { emoji, note } = isPast ? qualityCheck(p.type, act, p.targetPaceSec) : { emoji: '⏳', note: '' };
        return (
          <div key={p.date} className={styles.actualsRow}>
            <span className={styles.actualsDate}>{p.date.slice(5)}</span>
            <span className={styles.actualsType}>{p.title}</span>
            <span className={styles.actualsVal}>
              {act ? `${fmt(distKm, 1)}км${paceStr ? ' @ ' + paceStr : ''}${hrStr ? ' · ' + hrStr : ''}` : (isPast ? '—' : '')}
            </span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13 }}>{emoji}</span>
              {note && <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.2 }}>{note}</div>}
            </span>
          </div>
        );
      })}
      {totalKm > 0 && <div className={styles.actualsSummary}>Итого: <b>{fmt(totalKm, 0)} км</b></div>}
    </div>
  );
}


// ─── Dynamic plan view (used when plan is modified) ──────────────────────
const RU_DAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function phaseInfo(weekIdx: number, total: number): { label: string; cls: string } {
  const pos = (weekIdx + 1) / total; // 1-based: last week always resolves to 1.0 (taper)
  if (pos < 0.3) return { label: 'База',     cls: 'phBase'  };
  if (pos < 0.6) return { label: 'Развитие', cls: 'phBuild' };
  if (pos < 0.85) return { label: 'Пик',      cls: 'phPeak'  };
  return                 { label: 'Подводка', cls: 'phTaper' };
}

function DynamicPlanView() {
  const { plan } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const nextSess = plan.find(s => s.date >= today);
  const currentWeek = nextSess?.week ?? plan[plan.length - 1]?.week ?? 1;

  const weekMap: Record<number, PlanSession[]> = {};
  for (const s of plan) {
    if (!weekMap[s.week]) weekMap[s.week] = [];
    weekMap[s.week].push(s);
  }
  const weekNums = Object.keys(weekMap).map(Number).sort((a, b) => a - b);

  return (
    <>
      {weekNums.map((wn, idx) => {
        const sessions = weekMap[wn];
        const dates = sessions.map(s => s.date).sort();
        const fmt2 = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        const dateRange = dates.length ? `${fmt2(dates[0])}${dates.length > 1 ? ` — ${fmt2(dates[dates.length - 1])}` : ''}` : '';
        const totalKm = sessions.reduce((s, p) => s + p.targetDist, 0);
        const phase = phaseInfo(idx, weekNums.length);

        return (
          <WeekCard key={wn} id={`dw${wn}`} title={`Неделя ${wn}`}
            phase={phase} dates={dateRange} focus="" km={`~${totalKm} км`}
            defaultOpen={currentWeek === wn}
          >
            <div className={styles.sessList}>
              {sessions.map(s => {
                const d = new Date(s.date);
                const day = RU_DAYS[d.getDay()];
                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                const desc = `<b>${paceSecToStr(s.targetPaceSec)}/км</b>${s.desc ? ' · ' + s.desc : ''}`;
                return (
                  <Sess key={s.date} type={s.type} day={day} date={dateStr}
                    title={s.title} km={`${s.targetDist} км`} desc={desc} />
                );
              })}
            </div>
            <WeekActuals weekNum={wn} />
          </WeekCard>
        );
      })}
    </>
  );
}

// ─── Plan Editor ──────────────────────────────────────────────────────────
const TYPE_OPTIONS = ['interval', 'easy', 'tempo', 'long', 'race-p'] as const;

function PlanEditor({ onClose }: { onClose: () => void }) {
  const { plan, setPlan, resetPlan } = useStore();
  const [sessions, setSessions] = useState<PlanSession[]>([...plan]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlanSession | null>(null);

  function startEdit(i: number) {
    setEditIdx(i);
    setEditForm({ ...sessions[i] });
  }

  function saveEdit() {
    if (editIdx === null || !editForm) return;
    const next = [...sessions];
    next[editIdx] = editForm;
    setSessions(next);
    setEditIdx(null);
    setEditForm(null);
  }

  function deleteSession(i: number) {
    setSessions(sessions.filter((_, idx) => idx !== i));
    if (editIdx === i) { setEditIdx(null); setEditForm(null); }
  }

  function addSession() {
    const last = sessions[sessions.length - 1];
    const newSess: PlanSession = {
      date: '', week: (last?.week ?? 1), type: 'easy',
      title: 'Новая тренировка', targetDist: 6, targetPaceSec: 420, desc: '6 км @ 7:00/км',
    };
    setSessions([...sessions, newSess]);
    setEditIdx(sessions.length);
    setEditForm(newSess);
  }

  function applyAndClose() {
    setPlan(sessions);
    onClose();
  }

  function handleReset() {
    if (confirm('Сбросить план к исходному?')) { resetPlan(); setSessions([...TRAINING_PLAN]); }
  }

  const paceToStr = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const strToPace = (v: string) => { const [m, s] = v.split(':').map(Number); return (m || 0) * 60 + (s || 0); };

  return (
    <div className={styles.editorOverlay}>
      <div className={styles.editorModal}>
        <div className={styles.editorHeader}>
          <div className={styles.editorTitle}>Редактор плана</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.editorResetBtn} onClick={handleReset}>Сбросить</button>
            <button className={styles.editorSaveBtn} onClick={applyAndClose}>Сохранить</button>
            <button className={styles.editorCloseBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div className={styles.editorList}>
          {sessions.map((s, i) => (
            <div key={i} className={styles.editorRow}>
              {editIdx === i && editForm ? (
                <div className={styles.editorForm}>
                  <div className={styles.editorFormRow}>
                    <label>Дата</label>
                    <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Неделя</label>
                    <input type="number" min={1} max={10} value={editForm.week} onChange={e => setEditForm({ ...editForm, week: +e.target.value })} />
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Тип</label>
                    <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value as PlanSession['type'] })}>
                      {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Название</label>
                    <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Дистанция (км)</label>
                    <input type="number" step="0.5" value={editForm.targetDist} onChange={e => setEditForm({ ...editForm, targetDist: +e.target.value })} />
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Целевой темп (м:сс)</label>
                    <input placeholder="5:42" value={paceToStr(editForm.targetPaceSec)} onChange={e => setEditForm({ ...editForm, targetPaceSec: strToPace(e.target.value) })} />
                  </div>
                  <div className={styles.editorFormRow}>
                    <label>Описание</label>
                    <input value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className={styles.editorSaveBtn} onClick={saveEdit}>OK</button>
                    <button className={styles.editorCloseBtn} onClick={() => { setEditIdx(null); setEditForm(null); }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.editorRowMeta}>
                    <span className={styles.editorRowDate}>{s.date}</span>
                    <span className={styles.editorRowType} style={{ color: TYPE_COLORS[s.type] }}>
                      {TYPE_LABELS[s.type]}
                    </span>
                    <span className={styles.editorRowTitle}>{s.title}</span>
                    <span className={styles.editorRowPace}>{s.targetDist}км @ {paceToStr(s.targetPaceSec)}/км</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.editorEditBtn} onClick={() => startEdit(i)}>✎</button>
                    <button className={styles.editorDeleteBtn} onClick={() => deleteSession(i)}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button className={styles.editorAddBtn} onClick={addSession}>+ Добавить тренировку</button>
      </div>
    </div>
  );
}

// ─── Pace/HR zone table, derived from whatever's currently in the plan ────
const ZONE_STYLE: Record<string, { cls: string; label: string; hrRange: readonly [number, number] }> = {
  easy:     { cls: 'z1', label: 'Лёгкий / длинный', hrRange: [HR_ZONES.z1[0], HR_ZONES.z2[1]] },
  long:     { cls: 'z1', label: 'Лёгкий / длинный', hrRange: [HR_ZONES.z1[0], HR_ZONES.z2[1]] },
  tempo:    { cls: 'z3', label: 'Темп / порог',      hrRange: [HR_ZONES.z3[0], HR_ZONES.z4[1]] },
  'race-p': { cls: 'z4', label: 'Гоночный темп',     hrRange: [HR_ZONES.z3[0], HR_ZONES.z4[1]] },
  interval: { cls: 'z5', label: 'Интервалы',         hrRange: [HR_ZONES.z4[0], HR_ZONES.z5[1]] },
};

function PaceZoneTable({ plan }: { plan: PlanSession[] }) {
  const byType: Record<string, number[]> = {};
  plan.forEach(s => { (byType[s.type] ??= []).push(s.targetPaceSec); });

  // 'easy' and 'long' share one visual zone — merge their pace ranges.
  const merged: Record<string, number[]> = {};
  Object.entries(byType).forEach(([type, paces]) => {
    const key = (type === 'long') ? 'easy' : type;
    (merged[key] ??= []).push(...paces);
  });

  const order = ['easy', 'tempo', 'race-p', 'interval'];
  const cards = order.filter(t => merged[t]?.length);
  if (!cards.length) return null;

  return (
    <div className={styles.zonesGrid}>
      {cards.map(type => {
        const paces = merged[type];
        const min = Math.min(...paces), max = Math.max(...paces);
        const z = ZONE_STYLE[type];
        return (
          <div key={type} className={`${styles.zone} ${styles[z.cls]}`}>
            <div className={styles.zl}>{z.label}</div>
            <div className={styles.zp}>{paceSecToStr(min)}{max !== min ? `–${paceSecToStr(max)}` : ''}</div>
            <div className={styles.zn}>ЧСС {z.hrRange[0]}–{z.hrRange[1]}</div>
          </div>
        );
      })}
    </div>
  );
}

const RU_DAY_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function PlanTab() {
  const { plan: storePlan } = useStore();
  const [showEditor, setShowEditor] = useState(false);
  const isModified = !isDefaultPlan(storePlan);

  const weeksCount = new Set(storePlan.map(s => s.week)).size;
  const trainDays = Array.from(new Set(storePlan.map(s => RU_DAYS[new Date(s.date).getDay()])))
    .sort((a, b) => RU_DAY_ORDER.indexOf(a) - RU_DAY_ORDER.indexOf(b));

  return (
    <div className={styles.tab}>
      {showEditor && <PlanEditor onClose={() => setShowEditor(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className={styles.planSection} style={{ marginTop: 0, marginBottom: 0 }}>Цель и план</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isModified && <span className={styles.planModifiedBadge}>Изменён</span>}
          <button className={styles.editPlanBtn} onClick={() => setShowEditor(true)}>✎ Редактировать план</button>
        </div>
      </div>
      <div className={styles.planHero}>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Дистанция</div><div className={styles.planStatVal}>{RACE_DIST_KM} км</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Цель {new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div><div className={`${styles.planStatVal} ${styles.hi}`}>{hmFromMin(RACE_TARGET_MIN)}</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Тренировочных недель</div><div className={styles.planStatVal}>{weeksCount}</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Дни</div><div className={styles.planStatVal} style={{ fontSize: 14 }}>{trainDays.join(' · ')}</div></div>
      </div>

      <div className={styles.planSection}>Целевые темпы тренировок</div>
      <PaceZoneTable plan={storePlan} />

      <div className={styles.planSection}>Недельный план</div>
      <DynamicPlanView />

      <div className={styles.raceBlock}>
        <div className={styles.raceBlockTitle}>🏁 Старт — {new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Цель: {RACE_DIST_KM} км за {hmFromMin(RACE_TARGET_MIN)} — темп {paceSecToStr(RACE_TARGET_PACE_SEC)}/км
        </div>
      </div>
    </div>
  );
}
