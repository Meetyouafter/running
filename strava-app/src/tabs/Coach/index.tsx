import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../../store/useStore';
import { buildSystemPrompt } from '../../lib/coachContext';
import type { PlanSession } from '../../lib/trainingPlan';
import { RACE_DATE, RACE_DIST_KM, RACE_TARGET_MIN } from '../../lib/trainingPlan';
import styles from './Coach.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  planUpdate?: PlanSession[];
}

const SUGGESTIONS = [
  { label: 'Тренировка сегодня',    text: 'Какая тренировка сегодня по плану? Расскажи детально: темп, дистанцию, структуру.' },
  { label: 'Итоги месяца',          text: 'Оцени мой прогресс и результаты за последний месяц: объём, качество тренировок, динамику темпа.' },
  { label: 'Неделя: план vs факт',  text: 'Как идёт прогресс на этой неделе? Сравни план с фактом.' },
  { label: 'Прогресс к цели',       text: `Оцени мой текущий прогресс к цели ${RACE_DIST_KM} км за ${RACE_TARGET_MIN} минут ${RACE_DATE}. Успею ли я?` },
  { label: 'Анализ плана недели',   text: 'Проанализируй план на следующую неделю, сравни с выполнением этого месяца и предложи изменения если требуются.' },
];

// Extract ```plan-update ... ``` block from assistant response
function extractPlanUpdate(text: string): PlanSession[] | null {
  const match = text.match(/```plan-update\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].date) return parsed as PlanSession[];
  } catch { /* ignore */ }
  return null;
}

// Strip plan-update block from displayed text
function stripPlanBlock(text: string): string {
  return text.replace(/```plan-update[\s\S]*?```/g, '').trim();
}

export default function CoachTab() {
  const { activities, plan, setPlan } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError('');
    const userMsg: Message = { role: 'user', content: trimmed };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
    setInput('');
    setBusy(true);

    const systemPrompt = buildSystemPrompt(activities, plan);
    const apiMessages = history.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, systemPrompt }),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = text;
        if (text.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(text.slice(6));
            detail = parsed.error || text;
          } catch {
            detail = text;
          }
        }
        throw new Error(`Server error ${res.status}${detail ? ` - ${detail}` : ''}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: accumulated, streaming: true };
                return next;
              });
            }
          } catch (e) {
            if ((e as Error).message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      const planUpdate = extractPlanUpdate(accumulated);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: accumulated,
          streaming: false,
          planUpdate: planUpdate ?? undefined,
        };
        return next;
      });
    } catch (e) {
      setMessages(prev => prev.slice(0, -1));
      setError(`Ошибка: ${e}`);
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }, [messages, activities, plan, busy]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function applyPlan(newPlan: PlanSession[], msgIdx: number) {
    setPlan(newPlan);
    setAppliedIdx(msgIdx);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>AI Тренер</div>
        <div className={styles.subtitle}>Цель: {RACE_DIST_KM} км за {RACE_TARGET_MIN} мин · {RACE_DATE}</div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏃</div>
            <div className={styles.emptyText}>
              Привет! Я твой тренер. Знаю твой план и последние пробежки. Спрашивай.
            </div>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <button key={s.label} className={styles.chip} onClick={() => send(s.text)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i}>
              <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                {m.role === 'assistant'
                  ? <div className={styles.md}><ReactMarkdown>{stripPlanBlock(m.content)}</ReactMarkdown></div>
                  : m.content}
                {m.streaming && <span className={styles.cursor} />}
              </div>
              {m.planUpdate && !m.streaming && (
                <div className={styles.planBanner}>
                  <span className={styles.planBannerText}>
                    Тренер предлагает обновить план ({m.planUpdate.length} сессий)
                  </span>
                  {appliedIdx === i ? (
                    <span className={styles.planApplied}>Применён</span>
                  ) : (
                    <button className={styles.planApplyBtn} onClick={() => applyPlan(m.planUpdate!, i)}>
                      Применить
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Спроси тренера..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
        />
        <button
          className={styles.sendBtn}
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          title="Отправить"
        >
          {busy ? '⏳' : '↑'}
        </button>
      </div>
    </div>
  );
}
