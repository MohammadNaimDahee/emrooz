/**
 * Shared helpers for the backup scripts. Kept dependency-free (Node stdlib
 * only) so backups don't inherit runtime bugs from packages under active
 * development.
 */
import { spawn } from 'node:child_process';

export interface BackupResult {
  destination: string;
  bytes: number;
  durationMs: number;
}

export interface BackupEnv {
  DATABASE_URL: string;
  BACKUP_S3_BUCKET: string;
  BACKUP_S3_REGION: string;
  BACKUP_S3_ACCESS_KEY_ID: string;
  BACKUP_S3_SECRET_ACCESS_KEY: string;
  BACKUP_ENCRYPTION_KEY: string;
}

/** Read the backup env vars and fail hard if any are missing. */
export function requireBackupEnv(): BackupEnv {
  const required = [
    'DATABASE_URL',
    'BACKUP_S3_BUCKET',
    'BACKUP_S3_REGION',
    'BACKUP_S3_ACCESS_KEY_ID',
    'BACKUP_S3_SECRET_ACCESS_KEY',
    'BACKUP_ENCRYPTION_KEY',
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing env vars for backup: ${missing.join(', ')}`);
  }
  return Object.fromEntries(required.map((key) => [key, process.env[key]!])) as unknown as BackupEnv;
}

/** Log a structured event to stdout so the caller can pipe to a log stream. */
export function log(level: 'info' | 'warn' | 'error', event: string, extra: Record<string, unknown> = {}): void {
  const entry = { timestamp: new Date().toISOString(), level, event, ...extra };
  console.log(JSON.stringify(entry));
}

/**
 * Spawn a child process and wait for it to finish. Rejects with structured
 * error info if the process exits non-zero.
 */
export function run(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; stdinFrom?: NodeJS.ReadableStream; stdoutTo?: NodeJS.WritableStream } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: [options.stdinFrom ? 'pipe' : 'ignore', options.stdoutTo ? 'pipe' : 'inherit', 'pipe'],
    });
    if (options.stdinFrom && child.stdin) options.stdinFrom.pipe(child.stdin);
    if (options.stdoutTo && child.stdout) child.stdout.pipe(options.stdoutTo);
    let stderr = '';
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr.trim()}`));
    });
  });
}

/**
 * Verify that a command exists on the PATH before we attempt to run it.
 * Fails with an actionable hint rather than a cryptic ENOENT.
 */
export async function requireCommand(command: string, hint: string): Promise<void> {
  try {
    await run('which', [command]);
  } catch {
    throw new Error(`Required command "${command}" not found on PATH. ${hint}`);
  }
}
