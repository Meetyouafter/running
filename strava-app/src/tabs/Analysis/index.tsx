import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { StravaActivity } from '../../types/strava';
import { actPaceSec, paceSecToStr, fmt, buildActivityMap, weekMondayKey } from '../../lib/utils';
import { TRAINING_PLAN, TYPE_LABELS, TYPE_COLORS, RACE_DATE, RACE_TARGET_MIN, RACE_DIST_KM, type PlanSession } from '../../lib/trainingPlan';
import LineChart from '../../components/Charts/LineChart';
import BarChart from '../../components/Charts/BarChart';
import styles from './Analysis.module.css';

function scoreSession(plan: PlanSession, act: StravaActivity | null): { status: string; emoji: string; note?: string } {
  if (!act) return { status: 'miss', emoji: '❌' };
  const today = new Date().toISOString().slice(0, 10);
  if (plan.date > today) return { status: 'future', emoji: '🔜' };

  const distKm  = act.distance / 1000;
  const distPct = distKm / plan.targetDist;

  if (distPct < 0.65) return { status: 'miss', emoji: '❌', note: 'слишком коротко' };
  const distOk = distPct >= 0.82;

  // Easy/long: distance is the only criterion
  if (['easy', 'long'].includes(plan.type)) {
    return distOk ? { status: 'done', emoji: '✅' } : { status: 'partial', emoji: '⚠️', note: `${fmt(distKm,1)}/${plan.targetDist}км` };
  }

  if (!distOk) return { status: 'partial', emoji: '⚠️', note: `${fmt(distKm,1)}/${plan.targetDist}км` };

  // Quality sessions — prefer splits_metric (only present after fetchActivityDetail),
  // then fall back to avg HR, then to weighted-pace heuristic.
  const splits = act.splits_metric ?? [];
  if (splits.length > 0) {
    const needed = plan.type === 'tempo' ? 2 : 1;
    const fast = splits.filter(s => {
      const splitPace = s.moving_time / (s.distance / 1000);
      return splitPace <= plan.targetPaceSec * 1.07;
    });
    if (fast.length >= needed) return { status: 'done', emoji: '✅', note: `${fast.length} сплит(а) в темпе` };
    return { status: 'partial', emoji: '⚠️', note: 'темп ниже цели' };
  }

  // HR fallback: for a ~9km mixed session, avg HR ≥ 133 reliably indicates quality work
  const hr = act.average_heartrate;
  if (hr) {
    if (hr >= 133) return { status: 'done', emoji: '✅' };
    if (hr >= 128) return { status: 'partial', emoji: '⚠️', note: `ЧСС ${Math.round(hr)} — умеренно` };
    return { status: 'partial', emoji: '⚠️', note: `ЧСС ${Math.round(hr)} — легко` };
  }

  // Pace heuristic: back-calculate quality portion by subtracting expected WU/CD
  const avgPace = actPaceSec(act);
  if (avgPace > 0 && distKm > 4) {
    const wucdKm  = Math.min(3.5, distKm * 0.4);
    const qualPace = (avgPace * distKm - 420 * wucdKm) / (distKm - wucdKm);
    if (qualPace <= plan.targetPaceSec * 1.08) return { status: 'done', emoji: '✅' };
    return { status: 'partial', emoji: '⚠️', note: 'темп ниже цели' };
  }

  return { status: 'done', emoji: '✅' };
}

/* ─── AI Analysis ─── */
function saveKey(k: string) { try { localStorage.setItem('geminiKey', k); } catch(e) {} }
function loadKey() { try { return localStorage.getItem('geminiKey') || ''; } catch(e) { return ''; } }

export default function AnalysisTab() {
  const { activities } = useStore();
  const [geminiKey, setGeminiKey] = useState(loadKey);
  const [aiResult, setAiResult]   = useState('');
  const [aiBusy, setAiBusy]       = useState(false);

  if (!activities.length) {
    return (
      <div style={{ padding: '20px 28px' }}>
        <div className="loading-state"><div className="spinner" />Загрузи данные Strava чтобы увидеть анализ</div>
      </div>
    );
  }

  const runs = [...activities.filter(a => a.type === 'Run')]
    .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

  const today = new Date().toISOString().slice(0, 10);
  const now   = Date.now();

  const last30 = runs.filter(a => new Date(a.start_date_local) >= new Date(now - 30 * 86400000));
  const last90 = runs.filter(a => new Date(a.start_date_local) >= new Date(now - 90 * 86400000));

  const totalKm30  = last30.reduce((s, a) => s + a.distance / 1000, 0);
  const avgKmWeek  = totalKm30 / 4.3;
  const easyRuns   = last30.filter(a => actPaceSec(a) > 380 && a.distance > 4000);
  const avgEasyPace = easyRuns.length ? easyRuns.reduce((s, a) => s + actPaceSec(a), 0) / easyRuns.length : 0;
  const fastRuns   = last90.filter(a => a.distance >= 4000 && a.distance <= 7000).sort((a, b) => actPaceSec(a) - actPaceSec(b));
  const bestPace   = fastRuns.length ? actPaceSec(fastRuns[0]) : 0;
  const estimated10k = bestPace > 0 ? bestPace * 1.06 * 10 / 60 : 0;

  const hrRuns  = last30.filter(a => a.average_heartrate && actPaceSec(a) > 380);
  const hrEffNow = hrRuns.length ? hrRuns.reduce((s, a) => s + actPaceSec(a) / a.average_heartrate!, 0) / hrRuns.length : 0;
  const hrRunsOld = runs.filter(a => {
    const d = new Date(a.start_date_local);
    return a.average_heartrate && actPaceSec(a) > 380 &&
           d < new Date(now - 60 * 86400000) && d >= new Date(now - 90 * 86400000);
  });
  const hrEffOld = hrRunsOld.length ? hrRunsOld.reduce((s, a) => s + actPaceSec(a) / a.average_heartrate!, 0) / hrRunsOld.length : 0;
  const hrEffTrend = hrEffOld > 0 ? (hrEffNow - hrEffOld) / hrEffOld * 100 : 0;

  const paceRuns = runs.filter(a => a.distance >= 5000).slice(-20);
  const distrib  = { easy: 0, moderate: 0, hard: 0 };
  last30.forEach(a => {
    const p = actPaceSec(a);
    if (p > 400) distrib.easy++; else if (p > 360) distrib.moderate++; else distrib.hard++;
  });

  // Build activity map once — each run matched to at most one plan session
  const actMap = buildActivityMap(runs, TRAINING_PLAN);

  // Plan vs Fact
  const pvfRows = TRAINING_PLAN.map(plan => {
    const act   = actMap.get(plan.date) ?? null;
    const score = scoreSession(plan, act);
    const actStr = act
      ? `${fmt(act.distance / 1000, 1)}км @ ${paceSecToStr(Math.round(actPaceSec(act)))}/км${act.average_heartrate ? ' ЧСС ' + Math.round(act.average_heartrate) : ''}`
      : plan.date <= today ? '—' : '⏳';
    let paceDiffEl = null;
    if (act && plan.date <= today && actPaceSec(act) > 0) {
      const diff = Math.round(actPaceSec(act) - plan.targetPaceSec);
      const cls  = diff > 15 ? styles.diffNeg : diff < -15 ? styles.diffPos : styles.diffOk;
      paceDiffEl = <span className={cls}>{diff > 0 ? '+' : ''}{diff}с/км</span>;
    }
    return { plan, score, actStr, paceDiffEl };
  });

  // Week compliance
  const weekMap: Record<number, { total: number; done: number }> = {};
  TRAINING_PLAN.forEach(plan => {
    if (plan.date > today) return;
    if (!weekMap[plan.week]) weekMap[plan.week] = { total: 0, done: 0 };
    weekMap[plan.week].total++;
    const act   = actMap.get(plan.date) ?? null;
    const score = scoreSession(plan, act);
    if (score.status === 'done' || score.status === 'partial') weekMap[plan.week].done++;
  });

  // Race readiness
  const raceDate = new Date(RACE_DATE);
  const todayDate  = new Date(); todayDate.setHours(0, 0, 0, 0);
  const daysToRace = Math.round((raceDate.getTime() - todayDate.getTime()) / 86400000);

  const weeklyKm: Record<string, number> = {};
  runs.forEach(a => {
    const k = weekMondayKey(a.start_date_local);
    weeklyKm[k] = (weeklyKm[k] || 0) + a.distance / 1000;
  });
  const peakKm = Math.max(0, ...Object.values(weeklyKm));
  const curWeekKm = weeklyKm[weekMondayKey(today)] || 0;
  const taperPct  = peakKm > 0 ? Math.round(curWeekKm / peakKm * 100) : 100;
  const taperOk   = taperPct <= 65;

  const hardRuns2  = runs.filter(a => a.average_speed > 0 && actPaceSec(a) < 370 && a.distance > 3000);
  const lastHard   = hardRuns2.length ? hardRuns2[hardRuns2.length - 1] : null;
  const daysSinceH = lastHard ? Math.round((todayDate.getTime() - new Date(lastHard.start_date_local).getTime()) / 86400000) : 999;
  const hardOk     = daysSinceH >= 5;

  const longRuns   = runs.filter(a => a.distance >= 9000);
  const lastLong   = longRuns.length ? longRuns[longRuns.length - 1] : null;
  const daysSinceL = lastLong ? Math.round((todayDate.getTime() - new Date(lastLong.start_date_local).getTime()) / 86400000) : 999;
  const longOk     = daysSinceL >= 3;

  const efData = runs.filter(a => a.average_heartrate && a.average_speed > 0 && a.distance > 3000)
    .map(a => ({ date: a.start_date_local.slice(0, 10), ef: a.average_speed / a.average_heartrate! * 1000 }));
  let efOk = false;
  if (efData.length >= 4) {
    const n   = efData.length;
    const ef1 = efData.slice(0, Math.floor(n / 2)).reduce((s, x) => s + x.ef, 0) / Math.floor(n / 2);
    const ef2 = efData.slice(Math.floor(n / 2)).reduce((s, x) => s + x.ef, 0) / (n - Math.floor(n / 2));
    efOk = ef2 > ef1;
  }
  const score     = Math.round([taperOk, hardOk, longOk, efOk, daysToRace > 0].filter(Boolean).length / 5 * 100);
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? '#eab308' : '#f44336';

  // 80/20
  let easyKm = 0, hardKm = 0, modKm = 0;
  runs.forEach(a => {
    const km = a.distance / 1000;
    const p  = actPaceSec(a);
    const hr = a.average_heartrate || 0;
    const plan = TRAINING_PLAN.find(pl => pl.date === a.start_date_local.slice(0, 10));
    if (plan && ['interval', 'tempo', 'race-p'].includes(plan.type)) {
      hardKm += Math.min(plan.targetDist * 0.55, km);
      easyKm += km - Math.min(plan.targetDist * 0.55, km);
    } else if (plan?.type === 'long') {
      easyKm += km;
    } else {
      if ((hr >= 140) || (p > 0 && p <= 370)) hardKm += km;
      else if ((hr > 0 && hr < 133) || (p > 0 && p > 420)) easyKm += km;
      else modKm += km;
    }
  });
  const total8020 = easyKm + hardKm + modKm || 1;
  const easyPct   = Math.round(easyKm / total8020 * 100);
  const hardPct   = Math.round(hardKm / total8020 * 100);
  const modPct    = Math.round(modKm  / total8020 * 100);
  const verdict8020 = easyPct >= 75 && easyPct <= 85 && hardPct >= 15 && hardPct <= 25
    ? '✅ Отлично — точно в 80/20'
    : hardPct > 25 ? '⚠️ Много тяжёлых — риск перегрузки'
    : hardPct < 10 ? '⚠️ Мало тяжёлых — добавь скоростную работу'
    : '➡️ Близко к 80/20';

  // Build AI prompt
  const runSummary = runs.slice(-30).map(a =>
    `${a.start_date_local.slice(0, 10)} | ${fmt(a.distance / 1000, 1)}км | ${paceSecToStr(Math.round(actPaceSec(a)))}/км${a.average_heartrate ? ' | ЧСС ' + Math.round(a.average_heartrate) : ''}`
  ).reverse().join('\n');
  const planFact = TRAINING_PLAN.filter(p => p.date <= today).map(plan => {
    const act   = actMap.get(plan.date) ?? null;
    const score = scoreSession(plan, act);
    return `${plan.date} ${plan.title}: план ${plan.desc} → ${score.emoji} ${act ? fmt(act.distance / 1000, 1) + 'км @ ' + paceSecToStr(Math.round(actPaceSec(act))) + '/км' : 'пропущено'}`;
  }).join('\n') || '(план ещё не начался)';

  const aiPrompt = `Ты тренер по бегу. Проанализируй подготовку.\n\nЦЕЛЬ: ${RACE_DIST_KM} км за ${RACE_TARGET_MIN} минут к ${RACE_DATE}.\n\nТЕКУЩИЕ МЕТРИКИ:\n- Лучший темп на 5 км: 5:22/км (ЧСС 153)\n- Ср. темп лёгких (30 дней): ${avgEasyPace ? paceSecToStr(Math.round(avgEasyPace)) : '-'}/км\n- Объём за 30 дней: ${fmt(totalKm30, 0)} км (~${fmt(avgKmWeek, 0)} км/нед)\n- Расчётный 10 км: ${estimated10k ? fmt(estimated10k, 1) + ' мин' : 'нет данных'}\n\nПОСЛЕДНИЕ 30 ПРОБЕЖЕК:\n${runSummary}\n\nПЛАН vs ФАКТ:\n${planFact}\n\nОтветь по-русски:\n### Общая оценка\n### Что идёт хорошо\n### Что вызывает вопросы\n### Ключевые выводы\n### Корректировка плана\nБудь конкретен, давай точные темпы.`;

  async function runAI() {
    if (!geminiKey) { setAiResult('⚠️ Вставь Gemini API ключ'); return; }
    saveKey(geminiKey);
    setAiBusy(true);
    setAiResult('...');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: aiPrompt }] }], generationConfig: { maxOutputTokens: 3000, temperature: 0.7 } }),
      });
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      let text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) throw new Error('Пустой ответ');
      text = text.replace(/###\s*(.+)/g, '<h3 style="font-family:Bebas Neue;font-size:16px;letter-spacing:1px;color:var(--orange);margin:14px 0 6px">$1</h3>');
      setAiResult(text);
    } catch (e) {
      setAiResult(`<span style="color:#f44336">Ошибка: ${e}</span>`);
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div style={{ padding: '20px 28px' }}>

      {/* Race Readiness */}
      {daysToRace > 0 && (
        <div className={styles.readiness}>
          <div className={styles.readinessHeader}>
            <div>
              <div className={styles.readinessTitle}>🏁 Готовность к старту</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Контрольный забег {new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {daysToRace} дней</div>
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: 40, color: scoreColor }}>{score}%</div>
          </div>
          <div className={styles.readinessItems}>
            {[
              { ok: daysToRace <= 14, neutral: daysToRace > 14, label: `До старта ${daysToRace} дней`, val: new Date(RACE_DATE).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) },
              { ok: taperOk, neutral: false, label: 'Тейпер (снижение объёма)', val: `${taperPct}% от пика${taperOk ? '' : ' — нужно ≤65%'}` },
              { ok: hardOk, neutral: false, label: 'Последняя скоростная', val: lastHard ? `${daysSinceH}д назад` : 'нет' },
              { ok: longOk, neutral: false, label: 'Последний длинный бег', val: lastLong ? `${daysSinceL}д назад` : 'нет' },
              { ok: efOk, neutral: !efData.length, label: 'Аэробная эффективность', val: efOk ? 'растёт 📈' : 'нет данных' },
            ].map((it, i) => (
              <div key={i} className={styles.ri}>
                <span>{it.neutral ? '⏳' : it.ok ? '✅' : '⚠️'}</span>
                <span style={{ flex: 1, color: it.neutral ? 'var(--muted)' : it.ok ? 'var(--text)' : '#eab308' }}>{it.label}</span>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--muted)' }}>{it.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 80/20 */}
      <div className={styles.block8020}>
        <div className="an-section" style={{ margin: '0 0 14px' }}>📊 Принцип 80/20</div>
        <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ width: Math.max(2, easyPct) + '%', background: 'var(--green)', opacity: .8 }} />
          <div style={{ width: Math.max(1, modPct) + '%',  background: '#eab308', opacity: .8 }} />
          <div style={{ width: Math.max(1, hardPct) + '%', background: 'var(--orange)' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: 'var(--green)', borderRadius: 2 }} />Лёгкие: <b>{easyPct}%</b> ({Math.round(easyKm)} км)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: '#eab308', borderRadius: 2 }} />Умеренные: <b>{modPct}%</b></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, background: 'var(--orange)', borderRadius: 2 }} />Тяжёлые: <b>{hardPct}%</b> ({Math.round(hardKm)} км)</div>
        </div>
        <div style={{ fontSize: 13 }}>{verdict8020}</div>
      </div>

      {/* Metrics */}
      <div className="an-section">Форма сейчас <small>последние 30 дней</small></div>
      <div className="metrics-row">
        <div className="metric-card c-orange"><div className="ml">Расч. 10 км</div><div className="mv">~{estimated10k ? fmt(estimated10k, 0) : '?'}мин</div></div>
        <div className="metric-card c-blue"><div className="ml">Объём / нед</div><div className="mv">{fmt(avgKmWeek, 0)} км</div></div>
        <div className="metric-card c-green"><div className="ml">Лёгкий темп</div><div className="mv">{avgEasyPace ? paceSecToStr(Math.round(avgEasyPace)) : '—'}/км</div></div>
        <div className={`metric-card ${hrEffTrend < -2 ? 'c-green' : hrEffTrend > 2 ? 'c-red' : 'c-yellow'}`}>
          <div className="ml">HR-эффективность</div>
          <div className="mv">{hrEffTrend ? fmt(Math.abs(hrEffTrend), 1) + '%' : '—'}</div>
          <div className="ms">{hrEffTrend < 0 ? '↑ улучшается' : hrEffTrend > 0 ? '↓ ухудшается' : 'нет данных'}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="an-section">Тренды</div>
      <div className="chart-row">
        <div className="chart-box">
          <div className="chart-box-title">Темп по пробежкам 5+ км</div>
          {paceRuns.length > 1 && (
            <LineChart
              labels={paceRuns.map(a => a.start_date_local.slice(5))}
              data={paceRuns.map(a => Math.round(actPaceSec(a)))}
              color="#FC4C02" yMin={300}
            />
          )}
        </div>
        <div className="chart-box">
          <div className="chart-box-title">Распределение нагрузки (30 дней)</div>
          {last30.length > 0 && (
            <BarChart
              labels={['Лёгкий', 'Умеренный', 'Тяжёлый']}
              data={[distrib.easy, distrib.moderate, distrib.hard]}
              color="#FC4C02" yMin={0}
            />
          )}
        </div>
      </div>

      {/* Week compliance */}
      <div className="an-section">Соответствие плану</div>
      {Object.keys(weekMap).length === 0
        ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>План стартует 19 мая — данные появятся после первых тренировок</div>
        : Object.keys(weekMap).map(w => {
            const wk = weekMap[parseInt(w)];
            const pct = wk.total > 0 ? Math.round(wk.done / wk.total * 100) : 0;
            const clr = pct >= 75 ? 'var(--green)' : pct >= 50 ? '#eab308' : '#f44336';
            return (
              <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 80 }}>Нед. {w}</span>
                <div style={{ flex: 1, height: 6, background: '#222', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: clr, borderRadius: 99 }} />
                </div>
                <span style={{ fontFamily: 'Space Mono', fontSize: 11, width: 36, textAlign: 'right' }}>{pct}%</span>
              </div>
            );
          })
      }

      {/* Plan vs Fact */}
      <div className="an-section" style={{ marginTop: 20 }}>
        План vs Факт <small>— пополняется по мере тренировок</small>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.pvfTable}>
          <thead>
            <tr><th>Дата</th><th>Тип</th><th>План</th><th>Факт</th><th>Δ Темп</th><th>✓</th></tr>
          </thead>
          <tbody>
            {pvfRows.map(({ plan, score, actStr, paceDiffEl }) => (
              <tr key={plan.date}>
                <td style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--muted)' }}>{plan.date.slice(5)}</td>
                <td><span style={{ color: TYPE_COLORS[plan.type], fontSize: 11 }}>{TYPE_LABELS[plan.type]}</span></td>
                <td style={{ fontSize: 11, color: 'var(--muted)' }}>{plan.desc}</td>
                <td style={{ fontFamily: 'Space Mono', fontSize: 11 }}>{actStr}</td>
                <td>{paceDiffEl}</td>
                <td style={{ textAlign: 'center', fontSize: 14 }}>
                  {score.emoji}
                  {score.note && <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.2, marginTop: 2 }}>{score.note}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Analysis */}
      <div className={styles.aiBlock}>
        <div className={styles.aiBlockHeader}>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 1 }}>✦ AI-анализ подготовки</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <input
              type="password"
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); saveKey(e.target.value); }}
              placeholder="Gemini API key..."
              style={{ background: '#111', border: '1px solid #333', borderRadius: 7, color: 'var(--text)', fontSize: 11, padding: '7px 10px', outline: 'none', minWidth: 160 }}
            />
            <button
              className={styles.aiBtn}
              disabled={aiBusy}
              onClick={runAI}
            >
              {aiBusy ? '...' : '✦ Анализировать'}
            </button>
          </div>
        </div>
        {aiResult
          ? <div className={styles.aiResponse} dangerouslySetInnerHTML={{ __html: aiResult }} />
          : <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Нажми «Анализировать» для AI-разбора подготовки</div>
        }
      </div>

    </div>
  );
}
