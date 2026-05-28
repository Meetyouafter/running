import { readJson, requireEnv } from './_utils';

export const runtime = 'nodejs';

const GEMINI_MODEL = 'gemini-2.5-flash';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CoachRequestBody {
  messages: Message[];
  systemPrompt: string;
}

function sse(data: unknown): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return `data: ${payload}\n\n`;
}

export async function POST(request: Request): Promise<Response> {
  const { messages, systemPrompt } = await readJson<CoachRequestBody>(request);

  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const key = requireEnv('GEMINI_API_KEY');
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
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
      },
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      return new Response(sse({ error: errorText }), {
        status: geminiRes.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const body = geminiRes.body;
    if (!body) {
      return new Response(null, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const stream = new ReadableStream<string>({
      async start(controller) {
        const reader = body.getReader();
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
                  controller.enqueue(sse({ text }));
                }
              } catch {
                // Ignore malformed chunks from upstream SSE.
              }
            }
          }

          controller.enqueue(sse('[DONE]'));
        } catch (error) {
          controller.enqueue(sse({ error: String(error) }));
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(sse({ error: String(error) }), {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
}
