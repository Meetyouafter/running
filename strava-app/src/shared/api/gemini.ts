const KEY_STORAGE = 'geminiKey';
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export function loadGeminiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; }
}

export function saveGeminiKey(key: string) {
  try { localStorage.setItem(KEY_STORAGE, key); } catch { /* quota */ }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

/** Sends a single-turn prompt to Gemini and returns the concatenated text answer. */
export async function askGemini(key: string, prompt: string): Promise<string> {
  const res = await fetch(`${MODEL_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 3000, temperature: 0.7 },
    }),
  });
  const data = await res.json() as GeminiResponse;
  if (!res.ok) throw new Error(JSON.stringify(data.error?.message));
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error('Пустой ответ');
  return text;
}
