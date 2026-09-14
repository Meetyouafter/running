import { useState } from 'react';
import { fmt } from '@/shared/lib';
import {
  DISTANCES, digits, paceToSec, timeToSec, secToPace, secToTime, formatTime,
  type PaceParts, type TimeParts,
} from '../lib/pace';
import styles from './PaceCalcPage.module.css';

type Source = 'pace' | 'time';

export default function PaceCalcPage() {
  const [distKm, setDistKm]     = useState<number>(10);
  const [customKm, setCustomKm] = useState('');
  const [pace, setPace]         = useState<PaceParts>({ min: '6', sec: '00' });
  const [time, setTime]         = useState<TimeParts>({ h: '1', m: '00', s: '00' });
  // The last edited side is the source of truth; the other side is derived from it.
  const [source, setSource]     = useState<Source>('pace');

  const isCustom = !DISTANCES.some(d => d.km === distKm);
  const paceSec  = source === 'pace' ? paceToSec(pace) : (distKm > 0 ? timeToSec(time) / distKm : 0);
  const totalSec = source === 'pace' ? paceSec * distKm : timeToSec(time);

  const shownPace = source === 'pace' ? pace : secToPace(paceSec);
  const shownTime = source === 'time' ? time : secToTime(totalSec);
  const speedKmh  = paceSec > 0 ? 3600 / paceSec : 0;

  function editPace(patch: Partial<PaceParts>) {
    setPace({ ...shownPace, ...patch });
    setSource('pace');
  }
  function editTime(patch: Partial<TimeParts>) {
    setTime({ ...shownTime, ...patch });
    setSource('time');
  }
  function nudgePace(deltaSec: number) {
    setPace(secToPace(Math.max(0, paceSec + deltaSec)));
    setSource('pace');
  }
  function pickCustom(value: string) {
    const clean = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setCustomKm(clean);
    const km = parseFloat(clean);
    if (km > 0) setDistKm(km);
  }

  return (
    <div className={styles.page}>
      <div className="section-title">⏱ Калькулятор темпа</div>

      <div className={styles.card}>
        <div className={styles.chips}>
          {DISTANCES.map(d => (
            <button
              key={d.km}
              className={`${styles.chip} ${distKm === d.km ? styles.chipActive : ''}`}
              onClick={() => setDistKm(d.km)}
            >
              {d.label}
            </button>
          ))}
          <div className={styles.customWrap}>
            <input
              className={`${styles.customInput} ${isCustom ? styles.customInputActive : ''}`}
              inputMode="decimal"
              placeholder="своя"
              value={customKm}
              onChange={e => pickCustom(e.target.value)}
              onFocus={() => { if (parseFloat(customKm) > 0) setDistKm(parseFloat(customKm)); }}
            />
            <span className={styles.customUnit}>км</span>
          </div>
        </div>

        <div className={styles.calc}>
          {/* Pace */}
          <div className={`${styles.panel} ${source === 'pace' ? styles.panelActive : ''}`}>
            <div className={styles.panelLabel}>
              <span>Темп</span>
              {source === 'time' && <span className={styles.panelHint}>считается</span>}
            </div>
            <div className={styles.fields}>
              <input className={styles.field} inputMode="numeric" placeholder="6"
                value={shownPace.min} onChange={e => editPace({ min: digits(e.target.value, 2) })} />
              <span className={styles.colon}>:</span>
              <input className={styles.field} inputMode="numeric" placeholder="00"
                value={shownPace.sec} onChange={e => editPace({ sec: digits(e.target.value, 2) })}
                onBlur={() => editPace({ sec: shownPace.sec.padStart(2, '0') })} />
              <span className={styles.unit}>/км</span>
            </div>
            <div className={styles.steppers}>
              <button className={styles.step} onClick={() => nudgePace(-10)}>−10с</button>
              <button className={styles.step} onClick={() => nudgePace(-5)}>−5с</button>
              <button className={styles.step} onClick={() => nudgePace(5)}>+5с</button>
              <button className={styles.step} onClick={() => nudgePace(10)}>+10с</button>
            </div>
          </div>

          <div className={styles.swap}>⇄</div>

          {/* Time */}
          <div className={`${styles.panel} ${source === 'time' ? styles.panelActive : ''}`}>
            <div className={styles.panelLabel}>
              <span>Время на {isCustom ? `${fmt(distKm, 1)} км` : DISTANCES.find(d => d.km === distKm)!.label}</span>
              {source === 'pace' && <span className={styles.panelHint}>считается</span>}
            </div>
            <div className={styles.fields}>
              <input className={styles.field} inputMode="numeric" placeholder="0"
                value={shownTime.h} onChange={e => editTime({ h: digits(e.target.value, 2) })} />
              <span className={styles.colon}>:</span>
              <input className={styles.field} inputMode="numeric" placeholder="00"
                value={shownTime.m} onChange={e => editTime({ m: digits(e.target.value, 2) })}
                onBlur={() => editTime({ m: shownTime.m.padStart(2, '0') })} />
              <span className={styles.colon}>:</span>
              <input className={styles.field} inputMode="numeric" placeholder="00"
                value={shownTime.s} onChange={e => editTime({ s: digits(e.target.value, 2) })}
                onBlur={() => editTime({ s: shownTime.s.padStart(2, '0') })} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.result}>
          <div className={styles.resultLabel}>Скорость</div>
          <div className={styles.resultValue}>{fmt(speedKmh, 1)}</div>
          <div className={styles.resultSub}>км/ч</div>
        </div>
        {DISTANCES.map(d => (
          <div key={d.km} className={`${styles.result} ${d.km === distKm ? styles.resultActive : ''}`}>
            <div className={styles.resultLabel}>{d.label}</div>
            <div className={styles.resultValue}>{paceSec > 0 ? formatTime(paceSec * d.km) : '—'}</div>
            <div className={styles.resultSub}>в этом темпе</div>
          </div>
        ))}
      </div>
    </div>
  );
}
