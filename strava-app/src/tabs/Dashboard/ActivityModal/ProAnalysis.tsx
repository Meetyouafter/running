import { type JSX } from 'react';
import type { StravaActivity, StravaStreams } from '../../../types/strava';
import { fmt } from '../../../lib/utils';
import styles from './ProAnalysis.module.css';

interface Props {
  detail:  StravaActivity;
  streams: StravaStreams;
}

export default function ProAnalysis({ streams }: Props) {
  const hasCAD  = !!streams.cadence?.data?.length;
  const hasHR   = !!streams.heartrate?.data?.length;
  const hasVel  = !!streams.velocity_smooth?.data?.length;
  const hasDist = !!streams.distance?.data?.length;

  const cards: { l: string; v: string; n: string; verdict: string; cls: string }[] = [];

  // Cadence
  if (hasCAD) {
    const avg = streams.cadence!.data.reduce((s, v) => s + v, 0) / streams.cadence!.data.length * 2;
    const verdict = avg >= 170 ? 'Отлично' : avg >= 160 ? 'Приемлемо' : 'Низкий — риск оверстрайда';
    const cls     = avg >= 170 ? 'good'     : avg >= 160 ? 'warn'      : 'bad';
    cards.push({ l: 'Каденс', v: String(Math.round(avg)), n: 'шаг/мин · норма 170–180', verdict, cls });
  }

  // Aerobic decoupling
  if (hasHR && hasVel && hasDist) {
    const dist = streams.distance!.data, hr = streams.heartrate!.data, vel = streams.velocity_smooth!.data;
    const mid  = Math.floor(dist.length / 2);
    let ef1 = 0, ef2 = 0, c1 = 0, c2 = 0;
    for (let i = 0; i < dist.length; i++) {
      if (vel[i] > 0 && hr[i] > 0) {
        const ef = vel[i] / hr[i];
        if (i < mid) { ef1 += ef; c1++; } else { ef2 += ef; c2++; }
      }
    }
    if (c1 > 0 && c2 > 0) {
      const dc = Math.abs((ef1 / c1 - ef2 / c2) / (ef1 / c1) * 100);
      const verdict = dc < 5 ? 'Отлично — аэробная зона' : dc < 10 ? 'Умеренный дрейф' : 'Высокий — перегрев?';
      const cls     = dc < 5 ? 'good'                     : dc < 10 ? 'warn'             : 'bad';
      cards.push({ l: 'Аэробный декаплинг', v: fmt(dc, 1) + '%', n: 'норма <5%', verdict, cls });
    }
  }

  // Pace consistency
  if (hasVel) {
    const vels = streams.velocity_smooth!.data.filter(v => v > 0);
    const mean = vels.reduce((s, v) => s + v, 0) / vels.length;
    const cv   = Math.sqrt(vels.reduce((s, v) => s + (v - mean) ** 2, 0) / vels.length) / mean * 100;
    const verdict = cv < 5 ? 'Отлично — равномерно' : cv < 10 ? 'Хорошо' : 'Неравномерный темп';
    const cls     = cv < 5 ? 'good'                  : cv < 10 ? 'warn'   : 'bad';
    cards.push({ l: 'Равномерность темпа', v: fmt(cv, 1) + '%', n: 'CV · норма <5%', verdict, cls });
  }

  // EF
  if (hasHR && hasVel) {
    const vArr = streams.velocity_smooth!.data, hArr = streams.heartrate!.data;
    let s = 0, c = 0;
    for (let k = 0; k < Math.min(vArr.length, hArr.length); k++) {
      if (vArr[k] > 0 && hArr[k] > 0) { s += vArr[k] / hArr[k]; c++; }
    }
    if (c) {
      const ef = s / c * 1000;
      cards.push({ l: 'EF (эффективность)', v: fmt(ef, 2), n: 'скорость/ЧСС · растёт со временем', verdict: '', cls: '' });
    }
  }

  if (!cards.length) return null;

  // HR Zones
  let zonesHTML: JSX.Element | null = null;
  if (hasHR) {
    const zones = [0, 0, 0, 0, 0];
    streams.heartrate!.data.forEach(h => {
      if (h < 120) zones[0]++; else if (h < 140) zones[1]++; else if (h < 155) zones[2]++; else if (h < 168) zones[3]++; else zones[4]++;
    });
    const total = zones.reduce((s, v) => s + v, 0) || 1;
    const zLabels = ['З1 <120', 'З2 120–140', 'З3 140–155', 'З4 155–168', 'З5 >168'];
    const zColors = ['#22c55e', '#3b82f6', '#eab308', '#FC4C02', '#f44336'];
    zonesHTML = (
      <>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, margin: '12px 0 8px' }}>
          Распределение по ЧСС-зонам
        </div>
        {zones.map((z, i) => {
          const pct = Math.round(z / total * 100);
          return (
            <div key={i} className={styles.zoneRow}>
              <span className={styles.zoneLabel}>{zLabels[i]}</span>
              <div className={styles.zoneBar}><div style={{ width: pct + '%', height: '100%', background: zColors[i], borderRadius: 99 }} /></div>
              <span className={styles.zonePct}>{pct}%</span>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 18, color: 'var(--orange)', letterSpacing: 1, margin: '18px 0 10px' }}>
        🔬 Профессиональный анализ
      </div>
      <div className={styles.grid}>
        {cards.map(c => (
          <div key={c.l} className={styles.card}>
            <div className={styles.pl}>{c.l}</div>
            <div className={styles.pv}>{c.v}</div>
            <div className={styles.pn}>{c.n}</div>
            {c.verdict && <span className={`${styles.pb} ${styles[c.cls]}`}>{c.verdict}</span>}
          </div>
        ))}
      </div>
      {zonesHTML}
    </div>
  );
}
