import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const CONFIG_DIR = join(homedir(), '.config', 'replynodes-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiKey?: string;
  apiUrl?: string;
}

export const DEFAULT_API_URL = 'https://app.replynodes.com/api';

function readConfigFile(): CliConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
}

export function resolveConfig(): { apiKey: string; apiUrl: string } {
  const file = readConfigFile();
  const apiKey = process.env.REPLYNODES_API_KEY || file.apiKey;
  const apiUrl = process.env.REPLYNODES_API_URL || file.apiUrl || DEFAULT_API_URL;

  if (!apiKey) {
    console.error(
      'No API key found. Set REPLYNODES_API_KEY, or run `replynodes login <api-key>`.\n' +
        'Get a key at https://app.replynodes.com → Settings → API Keys.'
    );
    process.exit(1);
  }

  return { apiKey, apiUrl: apiUrl.replace(/\/+$/, '') };
}

export { CONFIG_FILE };
