import { useState } from 'react';
import type { StravaActivity, StravaStreams } from '../../../types/strava';
import type { PlanSession } from '../../../lib/trainingPlan';
import { RACE_DATE, RACE_DIST_KM, RACE_TARGET_MIN } from '../../../lib/trainingPlan';
import type { IvlData } from './IntervalAnalysis';
import { fmt, dur, pace, paceSecToStr } from '../../../lib/utils';
import styles from './RunAIBlock.module.css';

interface Props {
  detail:  StravaActivity;
  streams: StravaStreams;
  ivl:     IvlData | null;
  plan:    PlanSession | null;
}

function saveKey(k: string) { try { localStorage.setItem('geminiKey', k); } catch(e) {} }
function loadKey() { try { return localStorage.getItem('geminiKey') || ''; } catch(e) { return ''; } }

export default function RunAIBlock({ detail, streams, ivl, plan }: Props) {
  const [key, setKey]     = useState(loadKey);
  const [out, setOut]     = useState('');
  const [busy, setBusy]   = useState(false);

  async function analyze() {
    if (!key) { setOut('⚠️ Вставь Gemini API ключ'); return; }
    saveKey(key);
    setBusy(true);
    setOut('...');

    let splitsText = '';
    if (detail.splits_metric?.length) {
      splitsText = 'Сплиты по км:\n';
      detail.splits_metric.forEach((s, i) => {
        splitsText += `${i+1}км: ${paceSecToStr(Math.round(1000/s.average_speed))}/км${s.average_heartrate ? ' ЧСС '+Math.round(s.average_heartrate) : ''} высота ${s.elevation_difference >= 0 ? '+' : ''}${Math.round(s.elevation_difference)}м\n`;
      });
    }

    let decoupText = '';
    if (streams.heartrate && streams.velocity_smooth && streams.distance) {
      const dist = streams.distance.data, hr = streams.heartrate.data, vel = streams.velocity_smooth.data;
      const mid  = Math.floor(dist.length / 2);
      let ef1 = 0, ef2 = 0, c1 = 0, c2 = 0;
      for (let i = 0; i < dist.length; i++) {
        if (vel[i] > 0 && hr[i] > 0) { if (i < mid) { ef1 += vel[i]/hr[i]; c1++; } else { ef2 += vel[i]/hr[i]; c2++; } }
      }
      if (c1 && c2) decoupText = `Аэробный декаплинг: ${fmt(Math.abs((ef1/c1 - ef2/c2)/(ef1/c1)*100), 1)}% (норма <5%)\n`;
    }

    let cadText = '';
    if (streams.cadence?.data) {
      const avg = streams.cadence.data.reduce((s, v) => s + v, 0) / streams.cadence.data.length * 2;
      cadText = `Средний каденс: ${Math.round(avg)} шаг/мин (норма 170–180)\n`;
    }

    let ivlText = '';
    if (ivl) {
      ivlText = `\nОБНАРУЖЕНЫ ИНТЕРВАЛЫ (${ivl.count} повторов):\nСредний темп: ${paceSecToStr(ivl.avgPaceSec)}/км\nСтабильность: ${ivl.consistency}%\n`;
      ivl.intervals.forEach(iv => {
        const rec = ivl.recoveries[iv.num - 1];
        ivlText += `${iv.num}. ${iv.distance}м @ ${paceSecToStr(iv.paceSec)}/км ${dur(iv.duration)}${iv.avgHR ? ' ЧСС '+iv.avgHR : ''}${rec ? ' → восст. '+dur(rec.duration)+(rec.avgHR ? ' ЧСС '+rec.avgHR : '') : ''}\n`;
      });
    }

    const planText = plan
      ? `ПЛАН: ${plan.title} — ${plan.desc}\nПлановая дистанция: ${plan.targetDist} км, темп: ${paceSecToStr(plan.targetPaceSec)}/км\n`
      : '(вне плана)\n';

    const prompt =
      `Ты тренер по бегу. Дай детальный анализ пробежки.\n\nПРОБЕЖКА: ${detail.name}\nДата: ${detail.start_date_local.slice(0,10)}\nДистанция: ${fmt(detail.distance/1000,2)} км\nВремя: ${dur(detail.moving_time)}\nСредний темп: ${pace(detail.average_speed)}/км\nЧСС средняя: ${detail.average_heartrate ? Math.round(detail.average_heartrate)+' bpm' : 'нет'}\nЧСС макс: ${detail.max_heartrate || 'нет'}\nКалории: ${detail.calories || 'нет'}\nНабор высоты: ${fmt(detail.total_elevation_gain,0)} м\n${decoupText}${cadText}${ivlText}\n${planText}\n${splitsText}\nЦЕЛЬ: ${RACE_DIST_KM} км за ${RACE_TARGET_MIN} минут к ${RACE_DATE}.\n\nОтветь структурированно по-русски:\n### Общая оценка\n### Что хорошо\n### Что улучшить\n### Сравнение с планом\n### Рекомендации на следующую тренировку\n${ivl ? '### Анализ интервалов\n' : ''}Будь конкретен, давай точные значения.`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 3000, temperature: 0.7 } }),
      });
      const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      if (!res.ok) throw new Error(JSON.stringify((data as unknown as { error: { message: string } }).error?.message));
      let text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) throw new Error('Пустой ответ');
      text = text.replace(/###\s*(.+)/g, '<h3 style="font-family:Bebas Neue;font-size:15px;color:var(--orange);letter-spacing:1px;margin:12px 0 4px">$1</h3>');
      setOut(text);
    } catch (e) {
      setOut(`<span style="color:#f44336">Ошибка: ${e}</span>`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>✨ AI-анализ этой пробежки</div>
        <input
          type="password"
          className={styles.keyInput}
          placeholder="Gemini API key..."
          value={key}
          onChange={e => { setKey(e.target.value); saveKey(e.target.value); }}
        />
        <button className={styles.btn} disabled={busy} onClick={analyze}>
          {busy ? 'Думаю...' : 'Анализировать'}
        </button>
      </div>
      {out ? (
        <div className={styles.out} dangerouslySetInnerHTML={{ __html: out }} />
      ) : (
        <div className={styles.placeholder}>Нажми чтобы получить детальный анализ</div>
      )}
    </div>
  );
}
