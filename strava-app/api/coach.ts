const GEMINI_MODEL = 'gemini-2.5-flash';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function sse(data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `data: ${payload}\n\n`;
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : (request.body ?? {});

    const { messages, systemPrompt } = body as {
      messages?: Message[];
      systemPrompt?: string;
    };

    if (!messages?.length) {
      return response.status(400).json({ error: 'messages required' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return response.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    const contents = messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?key=${key}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt ?? '' }] },
          contents,
          generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error('Gemini request failed', { status: geminiRes.status, body: errorText });
      response.statusCode = geminiRes.status;
      response.write(sse({ error: errorText }));
      response.end();
      return;
    }

    const upstreamBody = geminiRes.body;
    if (!upstreamBody) {
      response.write(sse('[DONE]'));
      response.end();
      return;
    }

    const reader = upstreamBody.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              response.write(sse({ text }));
            }
          } catch {
            // Ignore malformed upstream chunks.
          }
        }
      }

      response.write(sse('[DONE]'));
      response.end();
    } catch (error) {
      response.write(sse({ error: String(error) }));
      response.end();
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Coach function crashed', error);
    response.statusCode = 500;
    response.write(sse({ error: String(error) }));
    response.end();
  }
}
