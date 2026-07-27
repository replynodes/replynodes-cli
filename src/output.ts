import { readFileSync } from 'node:fs';

export function printResult(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function readJsonArg(raw: string): unknown {
  // Accepts inline JSON, or @path/to/file.json to read from disk.
  if (raw.startsWith('@')) {
    return JSON.parse(readFileSync(raw.slice(1), 'utf8'));
  }
  return JSON.parse(raw);
}

export async function handle(fn: () => Promise<unknown>): Promise<void> {
  try {
    printResult(await fn());
  } catch (err: any) {
    console.error(err?.message || String(err));
    process.exitCode = 1;
  }
}
