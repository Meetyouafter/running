import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { isDefaultPlan } from '../../store/useStore';
import { actPaceSec, paceSecToStr, fmt, buildActivityMap } from '../../lib/utils';
import { TRAINING_PLAN, TYPE_LABELS, TYPE_COLORS, RACE_DATE, RACE_TARGET_MIN } from '../../lib/trainingPlan';
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

const T = (t: string) => `<b>${t}</b>`;

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
  const pos = weekIdx / total;
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

export default function PlanTab() {
  const { plan: storePlan } = useStore();
  const [showEditor, setShowEditor] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const nextSession = storePlan.find(p => p.date > today);
  const currentWeekNum = nextSession?.week ?? storePlan[storePlan.length - 1]?.week ?? 1;
  const isModified = !isDefaultPlan(storePlan);
  return (
    <div className={styles.tab}>
      {showEditor && <PlanEditor onClose={() => setShowEditor(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className={styles.planSection} style={{ marginTop: 0, marginBottom: 0 }}>Цель и текущая форма</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isModified && <span className={styles.planModifiedBadge}>Изменён</span>}
          <button className={styles.editPlanBtn} onClick={() => setShowEditor(true)}>✎ Редактировать план</button>
        </div>
      </div>
      <div className={styles.planHero}>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Текущий 10 км</div><div className={styles.planStatVal}>59–62 мин</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Цель {new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div><div className={`${styles.planStatVal} ${styles.hi}`}>{RACE_TARGET_MIN} мин</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Тренировочных недель</div><div className={styles.planStatVal}>6</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Дни</div><div className={styles.planStatVal} style={{ fontSize: 14 }}>Вт · Ср · Чт · Вс</div></div>
      </div>

      <div className={styles.planTip}>📌 <b>Почему 57, а не 55?</b> Лучший 5 км (5:22/км) — максимальное усилие. Расчётный 10 км = 59–62 мин. 57 мин к 27 июня — амбициозная но реальная цель. 55 мин — на 19 июля после 6 недель работы.</div>

      <div className={styles.planSection}>Целевые темпы тренировок</div>
      <div className={styles.zonesGrid}>
        <div className={`${styles.zone} ${styles.z1}`}><div className={styles.zl}>Лёгкий</div><div className={styles.zp}>6:50–7:20</div><div className={styles.zn}>ЧСС &lt;130</div></div>
        <div className={`${styles.zone} ${styles.z2}`}><div className={styles.zl}>Умеренный</div><div className={styles.zp}>6:25–6:45</div><div className={styles.zn}>ЧСС 130–138</div></div>
        <div className={`${styles.zone} ${styles.z3}`}><div className={styles.zl}>Темп / порог</div><div className={styles.zp}>6:10–6:20</div><div className={styles.zn}>ЧСС 140–150</div></div>
        <div className={`${styles.zone} ${styles.z4}`}><div className={styles.zl}>Гоночный</div><div className={styles.zp}>5:35–5:45</div><div className={styles.zn}>ЧСС 150–158</div></div>
        <div className={`${styles.zone} ${styles.z5}`}><div className={styles.zl}>Интервалы МПК</div><div className={styles.zp}>5:28–5:35</div><div className={styles.zn}>ЧСС &gt;158</div></div>
      </div>

      <div className={styles.planSection}>Недельный план</div>

      {isModified ? <DynamicPlanView /> : <>

      <WeekCard id="pw1" title="Неделя 1" phase={{ label: 'База', cls: 'phBase' }} dates="19–25 мая" focus="Первые интервалы" km="~34 км" defaultOpen={currentWeekNum === 1}>
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="19 мая" title="Интервалы 4×800м" km="~9 км"
            desc={`Разминка ${T('2 км @ 7:10')} · 4 × ${T('800м @ 5:33/км')} · отдых 2 мин · заминка ${T('1.5 км')}`}
            tip="🟢 Если легко: сократи отдых до 90 сек · 🔴 Если тяжело: замедлись до 5:40/км или 3 повтора" />
          <Sess type="easy" day="Ср" date="20 мая" title="Восстановительный" km="6 км"
            desc={`Лёгко · ${T('7:00–7:20/км')} · ЧСС не выше 130`}
            tip="🟢 Чем медленнее — тем лучше · 🔴 Если ноги тяжёлые: сократи до 4 км" />
          <Sess type="tempo" day="Чт" date="21 мая" title="Темп 5 км ↑" km="~9 км"
            desc={`Разминка ${T('2 км')} · ${T('5 км @ 6:05/км')} непрерывно · заминка ${T('2 км')}`}
            tip="🟢 Если легко: ускорь последний 1 км до 5:50 · 🔴 Если тяжело: замедлись до 6:10" />
          <Sess type="long" day="Вс" date="25 мая" title="Длинный лёгкий ↑" km="14 км"
            desc={`Равномерно · ${T('7:10–7:25/км')} · ЧСС 115–128 · не торопиться`}
            tip="🟢 Если легко: добавь 1–2 км · 🔴 Если тяжело: стоп на 11–12 км" />
        </div>
        <div className={styles.planTip}><b>Совет:</b> Темп четверга — настоящая пороговая работа. Если первые 2 км нормально — темп правильный. Воскресенье 14 км — строго легко, ЧСС ≤128.</div>
        <WeekActuals weekNum={1} />
      </WeekCard>

      <WeekCard id="pw2" title="Неделя 2" phase={{ label: 'Развитие', cls: 'phBuild' }} dates="26 мая — 1 июня" focus="Объём интервалов растёт" km="~42 км" defaultOpen={currentWeekNum === 2}>
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="26 мая" title="Интервалы 5×1000м" km="~11 км"
            desc={`Разминка ${T('2 км')} · 5 × ${T('1 км @ 5:33/км')} · отдых 90 сек · заминка ${T('1.5 км')}`}
            tip="🟢 Если легко: добавь 6-й повтор · 🔴 Если тяжело: 4 повтора хватит" />
          <Sess type="easy" day="Ср" date="27 мая" title="Лёгкий бег" km="8 км"
            desc={`Лёгко · ${T('7:10–7:30/км')} · ЧСС &lt;125`} />
          <Sess type="tempo" day="Чт" date="28 мая" title="Темп 5 км ↑" km="~10 км"
            desc={`Разминка ${T('2 км')} · ${T('5 км @ 6:15/км')} непрерывно · заминка ${T('2 км')}`}
            tip="🟢 Если легко: ускорь последний 1 км до 6:00 · 🔴 Если тяжело: замедлись до 6:20" />
          <Sess type="long" day="Вс" date="1 июня" title="Длинный с финишем" km="14 км"
            desc={`12 км @ ${T('7:00–7:15/км')} · последние 2 км ускорить до ${T('6:30/км')}`}
            tip="🟢 Если легко: добавь 1 км лёгко в конце · 🔴 Если тяжело: стоп на 12 км без финишного ускорения" />
        </div>
      </WeekCard>

      <WeekCard id="pw3" title="Неделя 3" phase={{ label: 'Развитие', cls: 'phBuild' }} dates="2–8 июня" focus="Знакомство с гоночным темпом" km="~35 км" defaultOpen={currentWeekNum === 3}>
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="2 июня" title="Интервалы 6×1000м" km="~12 км"
            desc={`Разминка ${T('2 км')} · 6 × ${T('1 км @ 5:30/км')} · отдых 90 сек · заминка ${T('1.5 км')}`}
            tip="🟢 Если легко: последние 2 можно чуть ускорить · 🔴 Стоп на 4–5 повторах" />
          <Sess type="easy" day="Ср" date="3 июня" title="Лёгкий" km="6 км"
            desc={`Лёгко · ${T('7:00–7:20/км')}`} />
          <Sess type="race-p" day="Чт" date="4 июня" title="Гоночный темп 4 км" km="~8 км"
            desc={`Разминка ${T('2 км')} · ${T('4 км @ 5:42/км')} — твой целевой темп · заминка ${T('1 км')}`}
            tip="🟢 Если легко: отличный знак! · 🔴 Сократи до 3 км @ 5:42" />
          <Sess type="long" day="Вс" date="8 июня" title="Длинный лёгкий" km="13 км"
            desc={`Равномерно · ${T('6:55–7:15/км')}`} />
        </div>
        <div className={styles.planTip}><b>Ключевая тренировка:</b> четверг, 4 км @ 5:42 — твой гоночный темп. Пробеги уверенно.</div>
      </WeekCard>

      <WeekCard id="pw4" title="Неделя 4" phase={{ label: 'Пик', cls: 'phPeak' }} dates="9–15 июня" focus="Самая тяжёлая неделя" km="~36 км" defaultOpen={currentWeekNum === 4}>
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="9 июня" title="Интервалы 3×2000м" km="~12 км"
            desc={`Разминка ${T('2 км')} · 3 × ${T('2 км @ 5:33/км')} · отдых 2.5 мин · заминка ${T('1.5 км')}`}
            tip="🔴 Если на 3-м темп уходит — завершить что есть, это нормально" />
          <Sess type="easy" day="Ср" date="10 июня" title="Восстановление" km="6 км"
            desc={`Очень легко · ${T('7:10–7:30/км')}`} />
          <Sess type="race-p" day="Чт" date="11 июня" title="Темп + гоночный финиш" km="~10 км"
            desc={`Разминка ${T('2 км')} · ${T('4 км @ 6:15')} → ${T('2 км @ 5:42/км')} · заминка ${T('1 км')}`} />
          <Sess type="long" day="Вс" date="15 июня" title="Длинный умеренный" km="11 км"
            desc={`8 км @ ${T('7:00/км')} · последние 3 км @ ${T('6:20/км')}`} />
        </div>
      </WeekCard>

      <WeekCard id="pw5" title="Неделя 5" phase={{ label: 'Подводка', cls: 'phTaper' }} dates="16–22 июня" focus="Снижение объёма, темп сохраняем" km="~24 км" defaultOpen={currentWeekNum === 5}>
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="16 июня" title="Короткие 4×600м" km="~7 км"
            desc={`Разминка ${T('2 км')} · 4 × ${T('600м @ 5:20/км')} · отдых 2 мин · заминка ${T('1.5 км')}`} />
          <Sess type="easy" day="Ср" date="17 июня" title="Лёгкий" km="5 км"
            desc={`Совсем легко · ${T('7:00–7:20/км')}`} />
          <Sess type="race-p" day="Чт" date="18 июня" title="Репетиция темпа 3 км" km="~7 км"
            desc={`Разминка ${T('2 км')} · ${T('3 км строго @ 5:42/км')} · заминка ${T('1 км')}`}
            tip="🎯 Цель — уверенность, не рекорд. Если тяжело — нужно больше отдыха перед стартом" />
          <Sess type="easy" day="Вс" date="22 июня" title="Лёгкая пробежка" km="6 км"
            desc={`Расслабленно · ${T('7:00/км')}`} />
        </div>
        <div className={styles.planTip}><b>Подводка:</b> объём падает, ноги ощущаются лёгкими — хороший знак. Больше сна, воды.</div>
      </WeekCard>

      <div className={styles.raceBlock}>
        <div className={styles.raceBlockTitle}>🏁 Контрольный забег — {new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · цель {RACE_TARGET_MIN}:00</div>
        <div className={styles.sessList}>
          <Sess type="easy" day="Вт" date="23 июня" title="Активация + ускорения" km="4 км"
            desc={`${T('3 км @ 7:00')} · 4 ускорения 100м`} />
          <Sess type="rest-d" day="Ср" date="24 июня" title="Отдых" km="—" desc="" />
          <Sess type="easy" day="Чт" date="25 июня" title="Лёгкая пробежка" km="3 км"
            desc={`${T('3 км @ 7:00')} + 2 стрейдера 80м`} />
          <Sess type="rest-d" day="Пт" date="26 июня" title="Полный отдых · 8+ часов сна" km="—" desc="" />
          <Sess type="race-p" day="Сб" date="27 июня" title="🎯 10 км — старт @ 5:42/км" km="10 км"
            desc={`Км 1–3: ${T('не быстрее 5:50')} · Км 4–8: ${T('5:42')} · Км 9–10: всё что есть`} />
        </div>
      </div>

      <div className={styles.vacBlock}>
        <div className={styles.vacBlockTitle}>🏖 Отпуск 28 июня — 12 июля</div>
        <p>Две недели без бега — аэробная форма сохраняется ~80%. Отдыхай без чувства вины.</p>
      </div>
      </>}
    </div>
  );
}
