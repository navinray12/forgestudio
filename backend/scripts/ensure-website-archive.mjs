// Targeted archive rollout: never imports application startup, runs seeds, or edits migration history.
import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function ensureWebsiteArchiveColumn(pool, apply = false) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    const inspect = async () => (await client.query(`SELECT data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'websites' AND column_name = 'archivedAt'`)).rows[0];
    let column = await inspect();
    if (column && (column.data_type !== 'timestamp with time zone' || column.is_nullable !== 'YES'))
      throw new Error('Existing archivedAt column has an unexpected definition; no changes made');
    if (!apply || column) {
      await client.query('ROLLBACK');
      return { ready: Boolean(column), changed: false };
    }
    // Block competing website writes during before/after verification, without touching rows.
    await client.query('LOCK TABLE websites IN ACCESS EXCLUSIVE MODE');
    const fingerprint = async () => (await client.query(`SELECT count(*)::int AS count,
      md5(coalesce(string_agg((to_jsonb(w) - 'archivedAt')::text, '' ORDER BY id), '')) AS fingerprint FROM websites w`)).rows[0];
    const before = await fingerprint();
    const history = async () => (await client.query(`SELECT md5(coalesce(string_agg(row_to_json(m)::text, '' ORDER BY id), '')) AS fingerprint FROM _prisma_migrations m`)).rows[0].fingerprint;
    const historyBefore = await history();
    const migration = await readFile(new URL('../prisma/migrations/20261028090000_website_archive/migration.sql', import.meta.url), 'utf8');
    await client.query(migration);
    column = await inspect();
    const after = await fingerprint();
    if (!column || column.data_type !== 'timestamp with time zone' || column.is_nullable !== 'YES'
      || before.count !== after.count || before.fingerprint !== after.fingerprint || historyBefore !== await history())
      throw new Error('Archive migration verification failed; transaction rolled back');
    await client.query('COMMIT');
    return { ready: true, changed: true, websitesPreserved: after.count, migrationHistoryUnchanged: true };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { client.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 4000 });
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const result = await ensureWebsiteArchiveColumn(pool, process.argv.includes('--apply'));
    console.log(JSON.stringify(result, null, 2));
    if (!result.ready) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ ready: false, code: error.code || 'ARCHIVE_SETUP_FAILED', message: error.message })); process.exitCode = 1; }
  finally { await pool.end(); }
}
