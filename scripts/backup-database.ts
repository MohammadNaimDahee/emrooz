#!/usr/bin/env tsx
/**
 * Logical Postgres backup for Emrooz. Called via `pnpm backup:database` and
 * expected to run daily under a scheduler (cron, GitHub Actions, or the
 * hosting platform's cron primitive).
 *
 * Pipeline:
 *
 *   pg_dump → gpg symmetric encrypt → aws s3 cp → S3 (or S3-compatible) bucket
 *
 * Design decisions:
 *
 *   - We shell out to `pg_dump` and `gpg` and `aws` so we inherit their
 *     well-audited behaviour rather than reimplementing dump / crypto in JS.
 *   - The AWS CLI is the transport because it's already used by most infra
 *     teams and handles retries, multi-part uploads, and STS credentials.
 *     Any S3-compatible endpoint works via BACKUP_S3_ENDPOINT.
 *   - Encryption happens BEFORE upload so plaintext never leaves the host.
 *   - Naming pattern: `pg-YYYY-MM-DDTHH-MM-SS.sql.gpg` — timestamp-sortable
 *     and safe for shell glob patterns.
 *   - Non-zero exit on any failure so schedulers surface the alert.
 *
 * Env:
 *
 *   DATABASE_URL                    postgres:// connection string
 *   BACKUP_S3_BUCKET                target bucket
 *   BACKUP_S3_REGION                target region
 *   BACKUP_S3_ENDPOINT              (optional) custom S3-compatible endpoint
 *   BACKUP_S3_ACCESS_KEY_ID         creds
 *   BACKUP_S3_SECRET_ACCESS_KEY     creds
 *   BACKUP_ENCRYPTION_KEY           GPG symmetric passphrase (32+ bytes recommended)
 *   BACKUP_S3_PREFIX                (optional) key prefix, defaults to `emrooz/database/`
 */
import { PassThrough } from 'node:stream';

import { log, requireBackupEnv, requireCommand, run } from './lib/backup';

async function main(): Promise<void> {
  const started = Date.now();
  const env = requireBackupEnv();
  await requireCommand(
    'pg_dump',
    'Install PostgreSQL client tools (e.g. `brew install libpq && brew link --force libpq`).',
  );
  await requireCommand('gpg', 'Install GnuPG (e.g. `brew install gnupg`).');
  await requireCommand('aws', 'Install the AWS CLI v2.');

  const prefix = process.env.BACKUP_S3_PREFIX ?? 'emrooz/database/';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `${prefix}pg-${timestamp}.sql.gpg`;
  const bucketUrl = `s3://${env.BACKUP_S3_BUCKET}/${key}`;

  log('info', 'backup.start', { destination: bucketUrl });

  // Two-stage pipeline: pg_dump → gpg (in-process pipe), then aws s3 cp reads
  // from stdin. We use PassThrough as the glue.
  const pgToGpg = new PassThrough();
  const gpgToAws = new PassThrough();

  const dump = run(
    'pg_dump',
    ['--format=plain', '--no-owner', '--no-privileges', env.DATABASE_URL],
    {
      stdoutTo: pgToGpg,
    },
  );

  const encrypt = run(
    'gpg',
    ['--batch', '--yes', '--symmetric', '--cipher-algo', 'AES256', '--passphrase-fd', '0'],
    {
      env: {
        ...process.env,
        // GPG reads the passphrase from stdin fd 0 — we splice it in.
      },
      stdinFrom: (() => {
        // Provide the passphrase then the input stream.
        const combined = new PassThrough();
        combined.write(env.BACKUP_ENCRYPTION_KEY + '\n');
        pgToGpg.pipe(combined);
        return combined;
      })(),
      stdoutTo: gpgToAws,
    },
  );

  const uploadArgs = ['s3', 'cp', '-', bucketUrl, '--region', env.BACKUP_S3_REGION];
  if (process.env.BACKUP_S3_ENDPOINT) {
    uploadArgs.push('--endpoint-url', process.env.BACKUP_S3_ENDPOINT);
  }
  const upload = run('aws', uploadArgs, {
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: env.BACKUP_S3_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: env.BACKUP_S3_SECRET_ACCESS_KEY,
      AWS_DEFAULT_REGION: env.BACKUP_S3_REGION,
    },
    stdinFrom: gpgToAws,
  });

  await Promise.all([dump, encrypt, upload]);

  log('info', 'backup.done', {
    destination: bucketUrl,
    durationMs: Date.now() - started,
  });
}

main().catch((err) => {
  log('error', 'backup.failed', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
