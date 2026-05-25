import { useState } from 'react';
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

export default function PlanTab() {
  return (
    <div className={styles.tab}>
      <div className={styles.planSection} style={{ marginTop: 0 }}>Цель и текущая форма</div>
      <div className={styles.planHero}>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Текущий 10 км</div><div className={styles.planStatVal}>59–62 мин</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Цель 27 июня</div><div className={`${styles.planStatVal} ${styles.hi}`}>57 мин</div></div>
        <div className={styles.planStat}><div className={styles.planStatLabel}>Цель 19 июля</div><div className={`${styles.planStatVal} ${styles.hi}`}>55 мин</div></div>
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

      <WeekCard id="pw1" title="Неделя 1" phase={{ label: 'База', cls: 'phBase' }} dates="19–25 мая" focus="Первые интервалы" km="~34 км" defaultOpen>
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
      </WeekCard>

      <WeekCard id="pw2" title="Неделя 2" phase={{ label: 'Развитие', cls: 'phBuild' }} dates="26 мая — 1 июня" focus="Объём интервалов растёт" km="~33 км">
        <div className={styles.sessList}>
          <Sess type="interval" day="Вт" date="26 мая" title="Интервалы 5×1000м" km="~11 км"
            desc={`Разминка ${T('2 км')} · 5 × ${T('1 км @ 5:33/км')} · отдых 90 сек · заминка ${T('1.5 км')}`}
            tip="🟢 Если легко: добавь 6-й повтор · 🔴 Если тяжело: 4 повтора хватит" />
          <Sess type="easy" day="Ср" date="27 мая" title="Лёгкий бег" km="6 км"
            desc={`Лёгко · ${T('7:10–7:30/км')} · ЧСС &lt;125`} />
          <Sess type="tempo" day="Чт" date="28 мая" title="Темп 4 км" km="~8 км"
            desc={`Разминка ${T('2 км')} · ${T('4 км @ 6:15/км')} · заминка ${T('1 км')}`}
            tip="🟢 Если легко: добавь 5-й км · 🔴 Если тяжело: замедлись до 6:20" />
          <Sess type="long" day="Вс" date="1 июня" title="Длинный с финишем" km="12 км"
            desc={`8 км @ ${T('7:00/км')} · последние 2 км ускорить до ${T('6:30/км')}`} />
        </div>
      </WeekCard>

      <WeekCard id="pw3" title="Неделя 3" phase={{ label: 'Развитие', cls: 'phBuild' }} dates="2–8 июня" focus="Знакомство с гоночным темпом" km="~35 км">
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

      <WeekCard id="pw4" title="Неделя 4" phase={{ label: 'Пик', cls: 'phPeak' }} dates="9–15 июня" focus="Самая тяжёлая неделя" km="~36 км">
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

      <WeekCard id="pw5" title="Неделя 5" phase={{ label: 'Подводка', cls: 'phTaper' }} dates="16–22 июня" focus="Снижение объёма, темп сохраняем" km="~24 км">
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
        <div className={styles.raceBlockTitle}>🏁 Контрольный забег — 27 июня · цель 57:00</div>
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
    </div>
  );
}
