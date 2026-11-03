import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { ensureWebsiteArchiveColumn } from './ensure-website-archive.mjs';

const url = process.env.ARCHIVE_TEST_DATABASE_URL || process.env.DATABASE_URL;
test('archive rollout detects missing column, preserves all existing data/history, is repeatable and rejects incompatible columns', { skip: !url }, async () => {
  const schema = `archive_storage_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^archive_storage_test_[a-f0-9]{32}$/);
  const admin = new pg.Pool({ connectionString: url });
  let pool;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
    await pool.query(`CREATE TABLE websites (id UUID PRIMARY KEY, name TEXT, status TEXT, "editorData" JSONB, "updatedAt" TIMESTAMPTZ);
      CREATE TABLE _prisma_migrations (id TEXT PRIMARY KEY, migration_name TEXT, finished_at TIMESTAMPTZ)`);
    const id = randomUUID();
    await pool.query('INSERT INTO websites VALUES ($1,\'Existing published site\',\'PUBLISHED\',$2,now())', [id, { elements: [{ content: 'Keep all editor content' }], releases: [{ snapshotData: { preserve: true } }] }]);
    await pool.query('INSERT INTO _prisma_migrations VALUES (\'history\',\'unfinished-existing-history\',null)');
    const before = (await pool.query('SELECT * FROM websites')).rows;
    const history = (await pool.query('SELECT * FROM _prisma_migrations')).rows;
    assert.deepEqual(await ensureWebsiteArchiveColumn(pool), { ready: false, changed: false });
    assert.deepEqual(await ensureWebsiteArchiveColumn(pool, true), { ready: true, changed: true, websitesPreserved: 1, migrationHistoryUnchanged: true });
    const after = (await pool.query('SELECT * FROM websites')).rows;
    assert.equal(after[0].archivedAt, null); delete after[0].archivedAt;
    assert.deepEqual(after, before);
    assert.deepEqual((await pool.query('SELECT * FROM _prisma_migrations')).rows, history);
    await pool.query('UPDATE websites SET "archivedAt"=now() WHERE id=$1', [id]);
    const archived = (await pool.query('SELECT * FROM websites')).rows;
    assert.deepEqual(await ensureWebsiteArchiveColumn(pool, true), { ready: true, changed: false });
    assert.deepEqual((await pool.query('SELECT * FROM websites')).rows, archived);
    await pool.query('ALTER TABLE websites ALTER COLUMN "archivedAt" TYPE TEXT');
    await assert.rejects(ensureWebsiteArchiveColumn(pool, true), /unexpected definition/);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM websites')).rows[0].count, 1);
  } finally {
    if (pool) await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
});
