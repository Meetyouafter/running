import { useEffect, useState } from 'react';
import { fetchActivityDetail, fetchActivityStreams } from '../../../lib/api';
import type { StravaActivity, StravaStreams } from '../../../types/strava';
import { fmt, dur, pace, hrColor, dateStr, ICONS, paceSecToStr, actPaceSec, decodePolyline } from '../../../lib/utils';
import { TRAINING_PLAN } from '../../../lib/trainingPlan';
import ProAnalysis from './ProAnalysis';
import IntervalAnalysis, { detectIntervals } from './IntervalAnalysis';
import LineChart from '../../../components/Charts/LineChart';
import styles from './Modal.module.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  activityId: number;
  onClose: () => void;
}

export default function ActivityModal({ activityId, onClose }: Props) {
  const [detail, setDetail]   = useState<StravaActivity | null>(null);
  const [streams, setStreams] = useState<StravaStreams>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([fetchActivityDetail(activityId), fetchActivityStreams(activityId)])
      .then(([d, s]) => { if (!cancelled) { setDetail(d); setStreams(s); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [activityId]);

  // Leaflet map
  useEffect(() => {
    if (!detail?.map?.summary_polyline) return;
    const el = document.getElementById('route-map-container');
    if (!el) return;
    const pts = decodePolyline(detail.map.summary_polyline);
    if (!pts.length) return;
    const map = L.map(el, { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map);
    const poly = L.polyline(pts, { color: '#FC4C02', weight: 3, opacity: .9 });
    poly.addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [16, 16] });
    return () => { map.remove(); };
  }, [detail]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const shiftDate = (iso: string, n: number) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const plan = detail ? (() => {
    const actDate = detail.start_date_local.slice(0, 10);
    return TRAINING_PLAN.find(p => p.date === actDate) ||
           TRAINING_PLAN.find(p => shiftDate(p.date, -1) === actDate) ||
           TRAINING_PLAN.find(p => shiftDate(p.date,  1) === actDate);
  })() : null;

  const ivlData = detail?.type === 'Run' ? detectIntervals(streams) : null;

  const CARDS = detail ? [
    { l: 'Дистанция',      v: `${fmt(detail.distance / 1000)} км` },
    { l: 'Время',          v: dur(detail.moving_time) },
    { l: 'Темп',           v: detail.average_speed > 0 ? pace(detail.average_speed) + '/км' : '—' },
    { l: 'Макс. скорость', v: detail.max_speed ? `${fmt(detail.max_speed * 3.6, 1)} км/ч` : '—' },
    { l: 'Набор высоты',   v: `${fmt(detail.total_elevation_gain, 0)} м` },
    { l: 'Ср. пульс',      v: detail.average_heartrate ? `${fmt(detail.average_heartrate, 0)} bpm` : '—', color: hrColor(detail.average_heartrate) },
    { l: 'Макс. пульс',    v: detail.max_heartrate ? `${detail.max_heartrate} bpm` : '—', color: hrColor(detail.max_heartrate) },
    { l: 'Ср. каденс',    v: detail.average_cadence ? `${fmt(detail.average_cadence * 2, 0)} шаг/мин` : '—' },
    { l: 'Ср. мощность',  v: detail.average_watts ? `${fmt(detail.average_watts, 0)} W` : '—' },
    { l: 'Калории',        v: detail.calories ? `${detail.calories} ккал` : '—' },
{ l: 'Температура',    v: detail.average_temp != null ? `${detail.average_temp}°C` : '—' },
  ] : [];

  const hasHR   = !!streams.heartrate?.data?.length;
  const hasCAD  = !!streams.cadence?.data?.length;
  const hasDist = !!streams.distance?.data?.length;

  let hrChartData: { labels: string[]; data: number[] } | null = null;
  let cadChartData: { labels: string[]; data: number[] } | null = null;
  if (hasHR && hasDist) {
    const dist = streams.distance!.data;
    const hrD  = streams.heartrate!.data;
    const step = Math.max(1, Math.floor(dist.length / 120));
    const xs: string[] = [], ys: number[] = [];
    for (let i = 0; i < dist.length; i += step) { xs.push(fmt(dist[i] / 1000, 1)); ys.push(hrD[i]); }
    hrChartData = { labels: xs, data: ys };
  }
  if (hasCAD && hasDist) {
    const dist2 = streams.distance!.data;
    const cadD  = streams.cadence!.data;
    const step2 = Math.max(1, Math.floor(dist2.length / 120));
    const xs2: string[] = [], ys2: number[] = [];
    for (let j = 0; j < dist2.length; j += step2) { xs2.push(fmt(dist2[j] / 1000, 1)); ys2.push(cadD[j] * 2); }
    cadChartData = { labels: xs2, data: ys2 };
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <button className={styles.close} onClick={onClose}>✕</button>

        {loading && <div className="loading-state"><div className="spinner" />Загружаю детали...</div>}
        {error   && <div className="error-msg">{error}</div>}

        {!loading && detail && (
          <>
            <div className={styles.title}>{ICONS[detail.type] || '🏅'} {detail.name}</div>
            <div className={styles.sub}>
              {dateStr(detail.start_date_local)} · {detail.type}
              {detail.gear?.name ? ` · ${detail.gear.name}` : ''}
            </div>

            {/* Stats grid */}
            <div className={styles.detailGrid}>
              {CARDS.map(c => (
                <div key={c.l} className={styles.detailCard}>
                  <div className={styles.dl}>{c.l}</div>
                  <div className={styles.dv} style={c.color ? { color: c.color } : {}}>{c.v}</div>
                </div>
              ))}
            </div>

            {/* Route map */}
            {detail.map?.summary_polyline && (
              <div id="route-map-container" className={styles.routeMap} />
            )}

            {/* Plan vs Fact */}
            {plan && detail.type === 'Run' && (
              <div className={styles.pvf}>
                <div className={styles.pvfTitle}>📋 {plan.title} · {plan.desc}</div>
                {(() => {
                  // For interval workouts compare plan pace against interval avg pace,
                  // not overall pace (which includes warm-up/cool-down and rest periods)
                  const isInterval = plan.type === 'interval' && ivlData;
                  const ap = isInterval ? ivlData!.avgPaceSec : actPaceSec(detail);
                  const distPct  = detail.distance / 1000 / plan.targetDist;
                  const paceDiff = Math.round(ap - plan.targetPaceSec);
                  const distColor = distPct >= 0.9 ? 'var(--green)' : distPct >= 0.75 ? '#eab308' : '#f44336';
                  const paceColor = Math.abs(paceDiff) <= 20 ? 'var(--green)' : Math.abs(paceDiff) <= 40 ? '#eab308' : '#f44336';
                  return (
                    <>
                      <div className={styles.pvfRow}>
                        <span className={styles.pvfLabel}>Дистанция</span>
                        <span className={styles.pvfPlan}>план {plan.targetDist} км</span>
                        <span className={styles.pvfFact}>факт {fmt(detail.distance / 1000, 1)} км</span>
                        <span style={{ color: distColor, fontFamily: 'Space Mono', fontSize: 11 }}>{Math.round(distPct * 100)}%</span>
                      </div>
                      <div className={styles.pvfRow}>
                        <span className={styles.pvfLabel}>Темп{isInterval ? ' (интервалы)' : ''}</span>
                        <span className={styles.pvfPlan}>план {paceSecToStr(plan.targetPaceSec)}/км</span>
                        <span className={styles.pvfFact}>факт {ap ? paceSecToStr(Math.round(ap)) + '/км' : '—'}</span>
                        <span style={{ color: paceColor, fontFamily: 'Space Mono', fontSize: 11 }}>{paceDiff > 0 ? '+' : ''}{paceDiff}с/км</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Intervals */}
            {ivlData && <IntervalAnalysis ivl={ivlData} plan={plan ?? null} />}

            {/* Pro analysis */}
            <ProAnalysis detail={detail} streams={streams} />

            {/* Stream charts */}
            {(hrChartData || cadChartData) && (
              <>
                <div className={styles.sectionTitle}>Графики по дистанции</div>
                <div className="two-col">
                  {hrChartData && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Пульс</div>
                      <div className="chart-container" style={{ padding: 14 }}>
                        <LineChart labels={hrChartData.labels} data={hrChartData.data} color="#f44336" yMin={60} />
                      </div>
                    </div>
                  )}
                  {cadChartData && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Каденс</div>
                      <div className="chart-container" style={{ padding: 14 }}>
                        <LineChart labels={cadChartData.labels} data={cadChartData.data} color="#eab308" yMin={120} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Splits */}
            {detail.splits_metric && detail.splits_metric.length > 0 && (
              <>
                <div className={styles.sectionTitle}>Км-сплиты</div>
                <table className={styles.table}>
                  <thead><tr><th>Км</th><th>Время</th><th>Темп</th><th>Пульс</th><th>Высота</th></tr></thead>
                  <tbody>
                    {detail.splits_metric.map((s, i) => (
                      <tr key={i}>
                        <td className={styles.lapNum}>{i + 1}</td>
                        <td>{dur(s.moving_time)}</td>
                        <td>{s.average_speed > 0 ? pace(s.average_speed) + '/км' : '—'}</td>
                        <td><span style={{ color: hrColor(s.average_heartrate) }}>{s.average_heartrate ? fmt(s.average_heartrate, 0) + ' bpm' : '—'}</span></td>
                        <td>{(s.elevation_difference >= 0 ? '+' : '') + fmt(s.elevation_difference, 0)} м</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Laps */}
            {detail.laps && detail.laps.length > 1 && (
              <>
                <div className={styles.sectionTitle}>Круги</div>
                <table className={styles.table}>
                  <thead><tr><th>#</th><th>Дист.</th><th>Время</th><th>Темп</th><th>Пульс</th><th>Каденс</th></tr></thead>
                  <tbody>
                    {detail.laps.map((lap, i) => (
                      <tr key={i}>
                        <td className={styles.lapNum}>{i + 1}</td>
                        <td>{fmt(lap.distance / 1000)} км</td>
                        <td>{dur(lap.moving_time)}</td>
                        <td>{lap.average_speed > 0 ? pace(lap.average_speed) + '/км' : '—'}</td>
                        <td><span style={{ color: hrColor(lap.average_heartrate) }}>{lap.average_heartrate ? fmt(lap.average_heartrate, 0) + ' bpm' : '—'}</span></td>
                        <td>{lap.average_cadence ? fmt(lap.average_cadence * 2, 0) + ' шаг/мин' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

          </>
        )}
      </div>
    </div>
  );
}
