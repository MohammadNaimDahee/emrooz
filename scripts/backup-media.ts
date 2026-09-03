#!/usr/bin/env tsx
/**
 * Supabase Storage bucket backup for Emrooz. Runs weekly by default because
 * media changes less often than user data.
 *
 * Approach:
 *
 *   For each configured bucket, list every object, download it via the
 *   Supabase JS client (which handles pre-signed URLs and streaming),
 *   encrypt symmetrically with GPG, and upload to the same S3 destination
 *   used by `backup-database.ts` with prefix `emrooz/media/<bucket>/`.
 *
 *   Backups do NOT preserve the original filenames on the server side —
 *   they are stored as `<original_path>.gpg` under the bucket prefix,
 *   preserving the source structure so a restore is a simple rsync.
 *
 * Env: same set as `backup-database.ts`, plus `NEXT_PUBLIC_SUPABASE_URL`
 * and `SUPABASE_SERVICE_ROLE_KEY` for the Storage list/download calls.
 */
import { PassThrough, Readable } from 'node:stream';

import { createClient } from '@supabase/supabase-js';

import { log, requireBackupEnv, requireCommand, run } from './lib/backup';

const BUCKETS = (process.env.BACKUP_STORAGE_BUCKETS ?? 'recipe-images').split(',').map((s) => s.trim());

interface StorageEntry {
  bucket: string;
  path: string;
  size: number;
}

async function listAll(client: ReturnType<typeof createClient>, bucket: string): Promise<StorageEntry[]> {
  const entries: StorageEntry[] = [];
  async function walk(prefix: string) {
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // Placeholder for a subfolder — recurse.
        await walk(fullPath);
      } else {
        entries.push({ bucket, path: fullPath, size: item.metadata?.size ?? 0 });
      }
    }
  }
  await walk('');
  return entries;
}

async function main(): Promise<void> {
  const started = Date.now();
  const env = requireBackupEnv();
  await requireCommand('gpg', 'Install GnuPG.');
  await requireCommand('aws', 'Install the AWS CLI v2.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for media backup.');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const prefix = process.env.BACKUP_S3_PREFIX ?? 'emrooz/media/';
  let totalFiles = 0;
  let totalBytes = 0;

  for (const bucket of BUCKETS) {
    log('info', 'media.bucket.start', { bucket });
    const entries = await listAll(supabase, bucket);
    log('info', 'media.bucket.enumerated', { bucket, files: entries.length });

    for (const entry of entries) {
      const remoteKey = `${prefix}${bucket}/${entry.path}.gpg`;
      const { data, error } = await supabase.storage.from(entry.bucket).download(entry.path);
      if (error || !data) {
        throw new Error(`download ${entry.bucket}/${entry.path}: ${error?.message ?? 'no body'}`);
      }
      const source = Readable.fromWeb(data.stream() as never);
      const encrypted = new PassThrough();

      const encryptPromise = run(
        'gpg',
        ['--batch', '--yes', '--symmetric', '--cipher-algo', 'AES256', '--passphrase-fd', '0'],
        {
          stdinFrom: (() => {
            const combined = new PassThrough();
            combined.write(env.BACKUP_ENCRYPTION_KEY + '\n');
            source.pipe(combined);
            return combined;
          })(),
          stdoutTo: encrypted,
        },
      );

      const uploadArgs = ['s3', 'cp', '-', `s3://${env.BACKUP_S3_BUCKET}/${remoteKey}`, '--region', env.BACKUP_S3_REGION];
      if (process.env.BACKUP_S3_ENDPOINT) {
        uploadArgs.push('--endpoint-url', process.env.BACKUP_S3_ENDPOINT);
      }
      const uploadPromise = run('aws', uploadArgs, {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: env.BACKUP_S3_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: env.BACKUP_S3_SECRET_ACCESS_KEY,
          AWS_DEFAULT_REGION: env.BACKUP_S3_REGION,
        },
        stdinFrom: encrypted,
      });

      await Promise.all([encryptPromise, uploadPromise]);
      totalFiles += 1;
      totalBytes += entry.size;
    }
  }

  log('info', 'media.done', {
    buckets: BUCKETS,
    files: totalFiles,
    bytes: totalBytes,
    durationMs: Date.now() - started,
  });
}

main().catch((err) => {
  log('error', 'media.failed', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
