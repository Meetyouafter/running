import { useState, useEffect } from 'react';
import { fetchICUData } from '../../lib/api';
import { paceSecToStr, fmt } from '../../lib/utils';
import MultiLineChart from '../../components/Charts/MultiLineChart';
import LineChart from '../../components/Charts/LineChart';
import styles from './Intervals.module.css';

interface IcuActivity {
  name?: string;
  start_date_local?: string;
  start_date?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  average_speed?: number;
  average_pace?: number;
  average_hr?: number;
  training_load?: number;
}

interface IcuWellness {
  id?: string;
  date?: string;
  ctl?: number;
  atl?: number;
  hrv?: number;
  restingHR?: number;
}

const DAYS_OPTIONS = [30, 60, 90, 180];

export default function IntervalsTab() {
  const [days, setDays]       = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [acts, setActs]       = useState<IcuActivity[]>([]);
  const [wellness, setWellness] = useState<IcuWellness[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchICUData(days);
      setActs((data.activities || []) as IcuActivity[]);
      setWellness((data.wellness || []) as IcuWellness[]);
      setUpdatedAt(data.updated_at || '');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('404') ? 'Intervals.icu недоступен — проверь сервер (порт 3001)' : `Ошибка: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  const runs = acts.filter(a => a.type === 'Run' || a.sport_type === 'Run');

  // PMC data from wellness
  const pmcData = [...wellness]
    .filter(w => w.ctl != null || w.atl != null)
    .sort((a, b) => (a.id || a.date || '') > (b.id || b.date || '') ? 1 : -1)
    .slice(-60);

  // Summary
  const totalDist  = runs.reduce((s, a) => s + (a.distance || 0), 0);
  const totalLoad  = runs.reduce((s, a) => s + (a.training_load || 0), 0);
  const latest     = wellness.length ? wellness[wellness.length - 1] : {} as IcuWellness;

  // Wellness trends
  const hrvArr  = wellness.filter(w => w.hrv).slice(-14);
  const tsb     = (latest.ctl != null && latest.atl != null) ? latest.ctl! - latest.atl! : null;
  const tsbColor = tsb == null ? 'c-blue' : tsb > 5 ? 'c-green' : tsb < -10 ? 'c-red' : 'c-yellow';
  const tsbLabel = tsb == null ? '' : tsb > 5 ? '✅ свеж' : tsb < -10 ? '⚠️ усталость' : '⚡ в тонусе';

  return (
    <div className={styles.tab}>
      <div className={styles.topBar}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 22, letterSpacing: 1 }}>Intervals.icu</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Период:</span>
          {DAYS_OPTIONS.map(d => (
            <button
              key={d}
              className={`${styles.dayBtn} ${days === d ? styles.dayBtnActive : ''}`}
              onClick={() => setDays(d)}
            >
              {d === 30 ? '30 дн' : d === 60 ? '2 мес' : d === 90 ? '3 мес' : '6 мес'}
            </button>
          ))}
          <button className="btn" style={{ padding: '7px 14px', fontSize: 12 }} onClick={load}>↻</button>
        </div>
      </div>

      {loading && (
        <div className="loading-state"><div className="spinner" />Загружаю Intervals.icu...</div>
      )}
      {error && !loading && (
        <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {!loading && !error && acts.length === 0 && (
        <div className="loading-state">Нет данных — убедись что сервер запущен (npm run dev:server)</div>
      )}

      {!loading && runs.length > 0 && (
        <>
          {/* Summary metrics */}
          <div className="an-section" style={{ marginTop: 0 }}>
            Обзор периода
            {updatedAt && <small>обновлено {updatedAt}</small>}
          </div>
          <div className="metrics-row">
            <div className="metric-card c-blue">
              <div className="ml">Дистанция</div>
              <div className="mv">{fmt(totalDist / 1000, 0)} км</div>
            </div>
            <div className="metric-card c-orange">
              <div className="ml">Training Load</div>
              <div className="mv">{fmt(totalLoad, 0)}</div>
              <div className="ms">сумма за период</div>
            </div>
            {latest.ctl != null && (
              <div className="metric-card c-green">
                <div className="ml">CTL (форма)</div>
                <div className="mv">{fmt(latest.ctl, 0)}</div>
                <div className="ms">chronic training load</div>
              </div>
            )}
            {latest.atl != null && (
              <div className="metric-card c-yellow">
                <div className="ml">ATL (усталость)</div>
                <div className="mv">{fmt(latest.atl, 0)}</div>
                <div className="ms">acute training load</div>
              </div>
            )}
            {tsb != null && (
              <div className={`metric-card ${tsbColor}`}>
                <div className="ml">TSB (готовность)</div>
                <div className="mv">{fmt(tsb, 0)}</div>
                <div className="ms">{tsbLabel}</div>
              </div>
            )}
            {latest.hrv != null && (
              <div className="metric-card c-green">
                <div className="ml">HRV (сегодня)</div>
                <div className="mv">{fmt(latest.hrv, 0)}</div>
                <div className="ms">мс, выше = лучше</div>
              </div>
            )}
            {latest.restingHR != null && (
              <div className="metric-card c-blue">
                <div className="ml">ЧСС покоя</div>
                <div className="mv">{latest.restingHR}</div>
                <div className="ms">bpm</div>
              </div>
            )}
          </div>

          {/* PMC Chart */}
          {pmcData.length > 1 && (
            <>
              <div className="an-section">Форма · Усталость · Готовность (PMC)</div>
              <div className={styles.pmcWrap}>
                <div className={styles.pmcLegend}>
                  <div className={styles.pmcLegendItem}><div className={styles.pmcDot} style={{ background: '#3b82f6' }} />CTL — форма</div>
                  <div className={styles.pmcLegendItem}><div className={styles.pmcDot} style={{ background: '#f44336' }} />ATL — усталость</div>
                  <div className={styles.pmcLegendItem}><div className={styles.pmcDot} style={{ background: '#22c55e' }} />TSB — готовность</div>
                </div>
                <MultiLineChart
                  labels={pmcData.map(w => (w.id || w.date || '').slice(5))}
                  series={[
                    { data: pmcData.map(w => w.ctl || 0), color: '#3b82f6' },
                    { data: pmcData.map(w => w.atl || 0), color: '#f44336' },
                    { data: pmcData.map(w => (w.ctl || 0) - (w.atl || 0)), color: '#22c55e' },
                  ]}
                />
              </div>
            </>
          )}

          {/* HRV trend */}
          {hrvArr.length > 2 && (
            <>
              <div className="an-section">HRV тренд (14 дней)</div>
              <div className="chart-box" style={{ marginBottom: 20 }}>
                <LineChart
                  labels={hrvArr.map(w => (w.id || w.date || '').slice(5))}
                  data={hrvArr.map(w => w.hrv!)}
                  color="#22c55e"
                  yMin={20}
                />
              </div>
            </>
          )}

          {/* Activities table */}
          <div className="an-section">Пробежки ({runs.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.actTable}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Название</th>
                  <th>Км</th>
                  <th>Темп</th>
                  <th>ЧСС</th>
                  <th>Load</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 30).map((a, i) => {
                  const pace = a.average_pace
                    ? a.average_pace
                    : a.average_speed ? 1000 / a.average_speed : 0;
                  const dateStr = (a.start_date_local || a.start_date || '').slice(0, 10);
                  return (
                    <tr key={i}>
                      <td className={styles.mono}>{dateStr}</td>
                      <td>{a.name || '—'}</td>
                      <td className={styles.mono}>{fmt((a.distance || 0) / 1000, 1)} км</td>
                      <td className={styles.mono}>{pace ? paceSecToStr(Math.round(pace)) + '/км' : '—'}</td>
                      <td className={styles.mono}>{a.average_hr ? Math.round(a.average_hr) + ' bpm' : '—'}</td>
                      <td className={`${styles.mono} ${styles.loadCell}`}>{a.training_load ? Math.round(a.training_load) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
