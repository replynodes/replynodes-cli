import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { resolveConfig } from './config.js';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(
      `Replynodes API error (${status}): ${
        typeof body === 'string' ? body : JSON.stringify(body)
      }`
    );
  }
}

function toQueryString(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  opts: { query?: Record<string, unknown>; body?: unknown } = {}
): Promise<T> {
  const { apiKey, apiUrl } = resolveConfig();
  const qs = opts.query ? toQueryString(opts.query) : '';
  const res = await fetch(`${apiUrl}/public/v1${path}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const body = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  filePath: string
): Promise<T> {
  const { apiKey, apiUrl } = resolveConfig();
  const buffer = readFileSync(filePath);
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const mime: Record<string, string> =
    {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
    };
  const type = mime[ext] || 'application/octet-stream';

  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), basename(filePath));

  const res = await fetch(`${apiUrl}/public/v1${path}`, {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: form,
  });

  const body = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
