import { useState } from 'react';
import { askGemini, loadGeminiKey, saveGeminiKey } from '@/shared/api';
import { Markdown } from '@/shared/ui';
import styles from './AiAnalysisBlock.module.css';

interface Props {
  title: string;
  placeholder: string;
  /** Built lazily so callers don't assemble a big prompt on every render. */
  buildPrompt: () => string;
}

/** Gemini key input + "analyse" button + markdown answer. Shared by all AI panels. */
export function AiAnalysisBlock({ title, placeholder, buildPrompt }: Props) {
  const [key, setKey]       = useState(loadGeminiKey);
  const [answer, setAnswer] = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);

  function onKeyChange(value: string) {
    setKey(value);
    saveGeminiKey(value);
  }

  async function analyze() {
    if (!key) { setError('Вставь Gemini API ключ'); return; }
    setBusy(true);
    setError(null);
    setAnswer('');
    try {
      setAnswer(await askGemini(key, buildPrompt()));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        <input
          type="password"
          className={styles.keyInput}
          placeholder="Gemini API key..."
          value={key}
          onChange={e => onKeyChange(e.target.value)}
        />
        <button className={styles.btn} disabled={busy} onClick={analyze}>
          {busy ? 'Думаю...' : '✦ Анализировать'}
        </button>
      </div>
      {error && <div className={styles.error}>⚠️ {error}</div>}
      {answer && <Markdown className={styles.out}>{answer}</Markdown>}
      {!error && !answer && <div className={styles.placeholder}>{busy ? '...' : placeholder}</div>}
    </div>
  );
}
