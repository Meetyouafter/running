import type { PlanSession } from '@/entities/training-plan';
import { useAthleteStore } from '@/entities/athlete';
import { dur, paceSecToStr, hrColor } from '@/shared/lib';
import type { IvlData } from '../lib/detectIntervals';
import styles from './IntervalAnalysis.module.css';

interface Props {
  ivl:  IvlData;
  plan: PlanSession | null;
}

export default function IntervalAnalysis({ ivl, plan }: Props) {
  const { hrZones } = useAthleteStore();
  const planPace = plan?.type === 'interval' ? plan.targetPaceSec : null;
  const diffPace = planPace ? ivl.avgPaceSec - planPace : null;
  const verdict  = planPace
    ? (Math.abs(diffPace!) <= 15 ? '✅ В цель' : diffPace! > 15 ? `⚠️ Медленнее на ${diffPace}с/км` : `⚡ Быстрее на ${Math.abs(diffPace!)}с/км`)
    : '';

  function paceColor(ps: number) {
    if (!planPace) return 'var(--text)';
    const d = Math.abs(ps - planPace);
    return d <= 15 ? 'var(--green)' : d <= 30 ? '#eab308' : '#f44336';
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.title}>Анализ интервалов</div>
        <span className={styles.badge}>{ivl.count}×интервал{verdict ? ` · ${verdict}` : ''}</span>
      </div>

      <div className={styles.summary}>
        <div className={styles.sumCard}><div className={styles.sumLabel}>Интервалов</div><div className={styles.sumVal}>{ivl.count}</div></div>
        <div className={styles.sumCard}><div className={styles.sumLabel}>Ср. темп</div><div className={styles.sumVal}>{paceSecToStr(ivl.avgPaceSec)}/км</div></div>
        {planPace && (
          <div className={styles.sumCard}>
            <div className={styles.sumLabel}>План</div>
            <div className={styles.sumVal} style={{ color: paceColor(ivl.avgPaceSec) }}>{paceSecToStr(planPace)}/км</div>
          </div>
        )}
        <div className={styles.sumCard}>
          <div className={styles.sumLabel}>Стабильность</div>
          <div className={styles.sumVal} style={{ color: ivl.consistency >= 90 ? 'var(--green)' : ivl.consistency >= 80 ? '#eab308' : '#f44336' }}>
            {ivl.consistency}%
          </div>
        </div>
      </div>

      <table className={styles.table}>
        <thead><tr><th>#</th><th>Дист.</th><th>Темп</th><th>Время</th><th>Ср.ЧСС</th><th>Восст.</th></tr></thead>
        <tbody>
          {ivl.intervals.map(iv => {
            const rec = ivl.recoveries[iv.num - 1];
            return (
              <tr key={iv.num}>
                <td className={styles.num}>{iv.num}</td>
                <td>{iv.distance}м</td>
                <td style={{ color: paceColor(iv.paceSec) }}>{paceSecToStr(iv.paceSec)}/км</td>
                <td>{dur(iv.duration)}</td>
                <td>{iv.avgHR ? <span style={{ color: hrColor(iv.avgHR, hrZones?.heart_rate?.zones) }}>{iv.avgHR}</span> : '—'}</td>
                <td style={{ color: 'var(--muted)' }}>{rec ? dur(rec.duration) + (rec.avgHR ? ` ${rec.avgHR}bpm` : '') : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.note}>
        Стабильность: <b>{ivl.consistency}%</b>
        {ivl.consistency >= 90 ? ' — отлично' : ivl.consistency >= 80 ? ' — хорошо' : ' — начинай сдержаннее'}
        {planPace && diffPace !== null && ` · Ошибка от плана: ${diffPace > 0 ? '+' : ''}${diffPace}с/км`}
      </div>
    </div>
  );
}
