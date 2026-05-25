import { useState, useEffect, useCallback } from 'react';
import type { Race, RaceMark } from '../../types/races';
import styles from './Races.module.css';

/* ─── Seeded races ─── */
const SEEDED: Race[] = [
  { id: 'danang-2026',      name: 'Danang International Marathon', date: '2026-03-22', city: 'Da Nang',          country: 'Vietnam',   countryCode: 'VN', distances: [1.5, 5, 21, 42], url: 'https://rundanang.com/en/', source: 'pre-seeded' },
  { id: 'ironman-danang',   name: 'Ironman 70.3 Vietnam',          date: '2026-05-10', city: 'Da Nang',          country: 'Vietnam',   countryCode: 'VN', distances: [113], url: 'https://www.ironman.com/im703-vietnam', source: 'pre-seeded', note: 'Triathlon — swim 1.9 / bike 90 / run 21.1' },
  { id: 'hcmc-2027',        name: 'Ho Chi Minh City Marathon',     date: '2027-01-10', city: 'Ho Chi Minh City', country: 'Vietnam',   countryCode: 'VN', distances: [5, 10, 21, 42], url: 'https://hcmcmarathon.com', source: 'pre-seeded' },
  { id: 'hanoi-2026',       name: 'Hanoi Marathon',                date: '2026-10-18', city: 'Hanoi',            country: 'Vietnam',   countryCode: 'VN', distances: [5, 10, 21, 42], url: 'https://hanoimarathon.com', source: 'pre-seeded' },
  { id: 'sapa-trail-2026',  name: 'Vietnam Mountain Marathon',     date: '2026-09-19', city: 'Sa Pa',            country: 'Vietnam',   countryCode: 'VN', distances: [10, 21, 42, 70], url: 'https://vietnammountainmarathon.com', source: 'pre-seeded' },
  { id: 'bangkok-2026',     name: 'Bangkok Marathon',              date: '2026-11-22', city: 'Bangkok',          country: 'Thailand',  countryCode: 'TH', distances: [10.5, 21, 42], url: 'https://bangkokmarathon.com', source: 'pre-seeded' },
  { id: 'singapore-2026',   name: 'Singapore Marathon',            date: '2026-12-06', city: 'Singapore',        country: 'Singapore', countryCode: 'SG', distances: [5, 10, 21, 42], url: 'https://singaporemarathon.com', source: 'pre-seeded' },
  { id: 'tokyo-2027',       name: 'Tokyo Marathon',                date: '2027-03-07', city: 'Tokyo',            country: 'Japan',     countryCode: 'JP', distances: [42], url: 'https://www.marathon.tokyo/en/', source: 'pre-seeded' },
];

/* ─── Helpers ─── */
function loadStorage(): { marks: Record<string, RaceMark>; customs: Race[] } {
  try {
    const marks   = JSON.parse(localStorage.getItem('raceMarks')   || '{}');
    const customs = JSON.parse(localStorage.getItem('customRaces') || '[]');
    return { marks, customs };
  } catch { return { marks: {}, customs: [] }; }
}

function saveMarks(marks: Record<string, RaceMark>) {
  try { localStorage.setItem('raceMarks', JSON.stringify(marks)); } catch { /* */ }
}

function saveCustomRaces(races: Race[]) {
  const customs = races.filter(r => r.source === 'manual');
  try { localStorage.setItem('customRaces', JSON.stringify(customs)); } catch { /* */ }
}

function countdown(dateStr: string) {
  const d     = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { text: 'Прошёл', cls: styles.countdownPast };
  if (diff === 0) return { text: 'Сегодня!', cls: '' };
  if (diff <= 60) return { text: diff + 'д', cls: styles.countdownSoon };
  return { text: diff + 'д', cls: '' };
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function distLabel(d: number) {
  if (d >= 20 && d <= 22) return 'Полумарафон';
  if (d >= 42 && d <= 43) return 'Марафон';
  if (d >= 70 || d === 113) return 'Ironman';
  return d + ' км';
}

const STATUS_CYCLE = ['', 'interested', 'registered', 'target', 'completed'] as const;
type Status = typeof STATUS_CYCLE[number];

const STATUS_LABEL: Record<string, string> = {
  interested: '👀 Интересует',
  registered: '✅ Зарегистрирован',
  target:     '🎯 Целевой',
  completed:  '🏅 Финишировал',
};

const DIST_FILTERS = [
  { label: 'Все', value: 'all' },
  { label: '5 км', value: '5' },
  { label: '10 км', value: '10' },
  { label: 'Полумарафон', value: '21' },
  { label: 'Марафон', value: '42' },
];

const REGION_FILTERS = [
  { label: 'Все регионы', value: 'all' },
  { label: '🇻🇳 Вьетнам', value: 'VN' },
  { label: 'Азия', value: 'asia' },
];

const ASIA_CODES = ['VN', 'TH', 'SG', 'JP', 'KR', 'MY', 'ID', 'PH', 'CN', 'IN'];

/* ─── Form state ─── */
interface FormState {
  name: string;
  date: string;
  city: string;
  country: string;
  url: string;
  status: Status;
  note: string;
  distances: number[];
}

const emptyForm = (): FormState => ({
  name: '', date: '', city: '', country: '', url: '', status: '', note: '', distances: [],
});

const DIST_OPTIONS = [
  { label: '1.5 км', val: 1.5 },
  { label: '5 км',   val: 5 },
  { label: '10 км',  val: 10 },
  { label: '21 км',  val: 21 },
  { label: '42 км',  val: 42 },
  { label: '100 км', val: 100 },
];

/* ─── Component ─── */
export default function RacesTab() {
  const { marks: savedMarks, customs } = loadStorage();

  const [races,     setRaces]    = useState<Race[]>(() => [...SEEDED, ...customs]);
  const [marks,     setMarks]    = useState<Record<string, RaceMark>>(savedMarks);
  const [distFlt,   setDistFlt]  = useState('all');
  const [regionFlt, setRegionFlt] = useState('all');
  const [search,    setSearch]   = useState('');
  const [loadStatus, setLoadStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  useEffect(() => {
    loadActiup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  async function loadActiup() {
    const urls = [
      'https://api.actiup.net/v2/content/event/homepage?event_type=sports&event_category_id=&limit=50',
    ];
    let added = 0;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: 'application/json', Origin: 'https://actiup.net', Referer: 'https://actiup.net/' },
        });
        if (!res.ok) continue;
        const data = await res.json() as Record<string, unknown>;
        const items = (data.data || data.items || data.results || []) as Record<string, unknown>[];
        const today = new Date();
        items.forEach(ev => {
          const id = 'actiup-' + String(ev.id || ev._id || ev.slug || Math.random());
          const date = String(ev.start_date || ev.date || '').slice(0, 10);
          if (!date || new Date(date) < today) return;
          setRaces(prev => {
            if (prev.find(r => r.id === id)) return prev;
            added++;
            const name = String(ev.name || ev.title || '—');
            const dists: number[] = [];
            const cats = ((ev.categories || ev.distances || []) as Record<string, string>[]);
            cats.forEach(c => {
              const lbl = (c.name || c.label || '').toLowerCase();
              if (lbl.includes('42') || (lbl.includes('marathon') && !lbl.includes('half'))) dists.push(42);
              else if (lbl.includes('21') || lbl.includes('half')) dists.push(21);
              else if (lbl.includes('10')) dists.push(10);
              else if (lbl.includes('5')) dists.push(5);
            });
            return [...prev, {
              id, name, date,
              city: String(ev.city || ev.location || ''),
              country: String(ev.country || 'Vietnam'),
              countryCode: 'VN',
              distances: dists,
              url: String(ev.url || ev.link || ''),
              source: 'actiup',
            }];
          });
        });
      } catch { /* CORS or network error – silently ignore */ }
    }
    if (added > 0) setLoadStatus(`✅ ActiUp: +${added} событий`);
  }

  const updateMarks = useCallback((next: Record<string, RaceMark>) => {
    setMarks(next);
    saveMarks(next);
  }, []);

  function cycleStatus(id: string) {
    const cur   = STATUS_CYCLE.indexOf((marks[id]?.status || '') as Status);
    const next  = STATUS_CYCLE[(cur + 1) % STATUS_CYCLE.length];
    const updated = { ...marks };
    if (!updated[id]) updated[id] = {};
    if (next) updated[id] = { ...updated[id], status: next };
    else { const { status: _, ...rest } = updated[id]; updated[id] = rest; }
    updateMarks(updated);
  }

  function matchesDist(r: Race) {
    if (distFlt === 'all') return true;
    const fd = parseFloat(distFlt);
    return r.distances.some(d => {
      if (fd === 5)  return d >= 4.5 && d <= 5.5;
      if (fd === 10) return d >= 9 && d <= 11;
      if (fd === 21) return d >= 20 && d <= 22;
      if (fd === 42) return d >= 42 && d <= 43;
      return false;
    });
  }

  function matchesRegion(r: Race) {
    if (regionFlt === 'all')  return true;
    if (regionFlt === 'VN')   return r.countryCode === 'VN';
    if (regionFlt === 'asia') return ASIA_CODES.includes(r.countryCode || '');
    return true;
  }

  function matchesSearch(r: Race) {
    if (!search) return true;
    return (r.name + r.city + r.country).toLowerCase().includes(search.toLowerCase());
  }

  const filtered = races
    .filter(r => matchesDist(r) && matchesRegion(r) && matchesSearch(r))
    .sort((a, b) => a.date.localeCompare(b.date));

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const myRaces    = filtered.filter(r => marks[r.id]?.status);
  const upcoming   = filtered.filter(r => new Date(r.date) >= today);
  const past       = filtered.filter(r => new Date(r.date) < today);
  const allDisplay = [...upcoming, ...past];

  /* ─── Modal ─── */
  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(r: Race) {
    const mark = marks[r.id] || {};
    setEditingId(r.id);
    setForm({
      name:    r.name,
      date:    r.date,
      city:    r.city,
      country: r.country,
      url:     r.url || '',
      status:  (mark.status || '') as Status,
      note:    mark.note || '',
      distances: r.distances,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function saveRace() {
    if (!form.name || !form.date) { alert('Название и дата обязательны'); return; }
    const nextRaces = [...races];
    const nextMarks = { ...marks };

    if (editingId) {
      const idx = nextRaces.findIndex(r => r.id === editingId);
      if (idx >= 0 && nextRaces[idx].source === 'manual') {
        nextRaces[idx] = { ...nextRaces[idx], name: form.name, date: form.date, city: form.city, country: form.country, url: form.url, distances: form.distances };
      }
      if (form.status || form.note) {
        nextMarks[editingId] = { ...nextMarks[editingId], status: form.status || undefined, note: form.note || undefined };
      } else {
        delete nextMarks[editingId];
      }
    } else {
      const id = 'manual-' + Date.now();
      nextRaces.push({ id, name: form.name, date: form.date, city: form.city, country: form.country, url: form.url, distances: form.distances, source: 'manual' });
      if (form.status || form.note) {
        nextMarks[id] = { status: form.status || undefined, note: form.note || undefined };
      }
    }

    setRaces(nextRaces);
    saveCustomRaces(nextRaces);
    updateMarks(nextMarks);
    closeModal();
  }

  function deleteRace() {
    if (!editingId || !confirm('Удалить этот забег?')) return;
    const nextRaces = races.filter(r => r.id !== editingId);
    const nextMarks = { ...marks };
    delete nextMarks[editingId];
    setRaces(nextRaces);
    saveCustomRaces(nextRaces);
    updateMarks(nextMarks);
    closeModal();
  }

  function toggleDist(val: number) {
    setForm(f => ({
      ...f,
      distances: f.distances.includes(val) ? f.distances.filter(d => d !== val) : [...f.distances, val],
    }));
  }

  /* ─── Race Card ─── */
  function RaceCard({ r }: { r: Race }) {
    const mark     = marks[r.id] || {};
    const status   = mark.status || '';
    const cd       = countdown(r.date);
    const statusCls = status ? styles[`status_${status}` as keyof typeof styles] : '';

    return (
      <div className={`${styles.card} ${statusCls}`}>
        <div className={styles.cardTop}>
          <div className={styles.cardMeta}>
            <span className={styles.cardDate}>{fmtDate(r.date)}</span>
            <span className={`${styles.countdown} ${cd.cls}`}>{cd.text}</span>
          </div>
          <div className={styles.cardName}>{r.name}</div>
          <div className={styles.cardLocation}>📍 {r.city}{r.country && r.country !== r.city ? ', ' + r.country : ''}</div>
          <div className={styles.cardDists}>
            {r.distances.map(d => (
              <span key={d} className={`${styles.distBadge} ${mark.targetDist && Math.round(d) === Math.round(mark.targetDist) ? styles.distBadgeHL : ''}`}>
                {distLabel(d)}
              </span>
            ))}
          </div>
          {(mark.note || r.note) && <div className={styles.cardNote}>💬 {mark.note || r.note}</div>}
          <div className={styles.cardSource}>{r.source === 'manual' ? '✏️ мой' : r.source === 'actiup' ? '📍 ActiUp' : '📍'}</div>
        </div>
        <div className={styles.cardBottom}>
          <button className={`${styles.statusBtn} ${status ? styles[`s_${status}` as keyof typeof styles] : ''}`} onClick={() => cycleStatus(r.id)}>
            {status ? STATUS_LABEL[status] : 'Отметить'}
          </button>
          {r.url && (
            <a className={styles.cardLink} href={r.url} target="_blank" rel="noreferrer" title="Открыть">↗</a>
          )}
          <button className={styles.cardEdit} title="Редактировать" onClick={() => openEdit(r)}>✎</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tab}>
      {/* Filter bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Поиск по названию или городу..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.pills}>
          {DIST_FILTERS.map(f => (
            <button key={f.value} className={`${styles.pill} ${distFlt === f.value ? styles.pillActive : ''}`} onClick={() => setDistFlt(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.pills}>
          {REGION_FILTERS.map(f => (
            <button key={f.value} className={`${styles.pill} ${regionFlt === f.value ? styles.pillActive : ''}`} onClick={() => setRegionFlt(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <button className="btn" onClick={openAdd} style={{ marginLeft: 'auto' }}>+ Добавить</button>
      </div>

      {loadStatus && <div className={styles.loadStatus}>{loadStatus}</div>}

      {/* My races */}
      {myRaces.length > 0 && (
        <>
          <div className="an-section" style={{ marginTop: 0 }}>
            Мои забеги <span className={styles.count}>{myRaces.length}</span>
          </div>
          <div className={styles.grid}>
            {myRaces.map(r => <RaceCard key={r.id} r={r} />)}
          </div>
        </>
      )}

      {/* All races */}
      <div className="an-section" style={{ marginTop: myRaces.length ? undefined : 0 }}>
        Предстоящие <span className={styles.count}>{upcoming.length}</span>
      </div>
      {allDisplay.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <div className={styles.emptyTitle}>Ничего не найдено</div>
          <div className={styles.emptySub}>Попробуй другой фильтр или добавь забег вручную</div>
        </div>
      ) : (
        <div className={styles.grid}>
          {allDisplay.map(r => <RaceCard key={r.id} r={r} />)}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>{editingId ? 'Редактировать' : 'Добавить забег'}</div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Название *</label>
              <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Danang Marathon 2026" />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Дата *</label>
                <input className={styles.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Статус</label>
                <select className={styles.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
                  <option value="">—</option>
                  <option value="interested">👀 Интересует</option>
                  <option value="registered">✅ Зарегистрирован</option>
                  <option value="target">🎯 Целевой</option>
                  <option value="completed">🏅 Финишировал</option>
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Город</label>
                <input className={styles.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Da Nang" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Страна</label>
                <input className={styles.input} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Vietnam" />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Сайт / ссылка</label>
              <input className={styles.input} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Дистанции</label>
              <div className={styles.distChecks}>
                {DIST_OPTIONS.map(opt => (
                  <label key={opt.val} className={`${styles.distCheck} ${form.distances.includes(opt.val) ? styles.distCheckActive : ''}`}>
                    <input type="checkbox" checked={form.distances.includes(opt.val)} onChange={() => toggleDist(opt.val)} style={{ display: 'none' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Заметка</label>
              <input className={styles.input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Личный рекорд, цель..." />
            </div>

            <div className={styles.formActions}>
              <button className="btn" style={{ flex: 1 }} onClick={saveRace}>Сохранить</button>
              <button className="btn-secondary" onClick={closeModal}>Отмена</button>
              {editingId && races.find(r => r.id === editingId)?.source === 'manual' && (
                <button className={`btn-secondary ${styles.deleteBtn}`} onClick={deleteRace}>Удалить</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
