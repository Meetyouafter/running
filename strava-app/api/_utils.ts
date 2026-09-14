export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export async function readJson<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

// Minimal shape of Vercel's Node.js serverless request/response — only what the handlers use.
export interface NodeRequest {
  method?: string;
  url?: string;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface NodeResponse {
  statusCode: number;
  status(code: number): NodeResponse;
  json(data: unknown): NodeResponse;
  setHeader(name: string, value: string): NodeResponse;
  write(chunk: string): boolean;
  end(): void;
}
