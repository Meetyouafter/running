import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();
const GEMINI_MODEL = 'gemini-2.5-flash';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

router.post('/', async (req, res) => {
  const { messages, systemPrompt } = req.body as { messages: Message[]; systemPrompt: string };

  if (!messages?.length) {
    res.status(400).json({ error: 'messages required' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Gemini uses "model" instead of "assistant"
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${key}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      res.write(`data: ${JSON.stringify({ error: err })}\n\n`);
      res.end();
      return;
    }

    const body = geminiRes.body;
    if (!body) { res.end(); return; }

    let buffer = '';
    body.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch { /* skip malformed */ }
      }
    });

    body.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    body.on('error', (e: Error) => {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    });
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: String(e) })}\n\n`);
    res.end();
  }
});

export default router;
