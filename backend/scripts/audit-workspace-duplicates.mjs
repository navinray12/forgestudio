import "dotenv/config";
import pg from "pg";

// Read-only inventory for workspace consolidation planning. Never import config/prisma.ts here.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const workspaces = await client.query(`
    SELECT w.id, w.name, w.slug, w."ownerId", w."organizationId", md5(coalesce(w.settings::text, 'null')) AS "settingsHash", u."fullName" AS "ownerName",
      (SELECT count(*)::int FROM workspace_members m WHERE m."workspaceId" = w.id) AS members,
      (SELECT count(*)::int FROM websites s WHERE s."workspaceId" = w.id) AS websites
    FROM workspaces w JOIN users u ON u.id = w."ownerId"
    ORDER BY u."fullName", w.name, w.id
  `);
  const unassigned = await client.query(`
    SELECT s."userId" AS "ownerId", u."fullName" AS "ownerName", count(*)::int AS websites
    FROM websites s JOIN users u ON u.id = s."userId"
    WHERE s."workspaceId" IS NULL GROUP BY s."userId", u."fullName" ORDER BY u."fullName"
  `);
  const references = await client.query(`
    SELECT c.conrelid::regclass::text AS table_name, a.attname AS column_name
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = 'workspaces'::regclass ORDER BY 1, 2
  `);
  const workspaceColumns = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'workspaceId' ORDER BY table_name
  `);
  const triggers = await client.query(`
    SELECT tgrelid::regclass::text AS table_name, tgname AS trigger_name,
      pg_get_triggerdef(oid) AS trigger_definition, pg_get_functiondef(tgfoid) AS function_definition
    FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('workspaces'::regclass, 'websites'::regclass, 'workspace_members'::regclass)
    ORDER BY 1, 2
  `);
  const invitationTables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('workspace_invitations', 'workspace_email_invitations') ORDER BY table_name
  `);
  const invitationCounts = [];
  for (const row of invitationTables.rows) {
    const rows = await client.query(`SELECT "workspaceId", count(*)::int AS count FROM ${row.table_name} GROUP BY "workspaceId"`);
    invitationCounts.push({ table: row.table_name, rows: rows.rows });
  }
  const details = [];
  for (const workspace of workspaces.rows) {
    const id = workspace.id;
    const websites = await client.query(`SELECT s.id, s.name, s."userId" AS "ownerId", s."organizationId",
      (SELECT count(*)::int FROM website_collaborators c WHERE c."websiteId"=s.id) AS collaborators,
      (SELECT count(*)::int FROM website_invitations i WHERE i."websiteId"=s.id) AS invitations
      FROM websites s WHERE s."workspaceId" = $1 ORDER BY s.id`, [id]);
    const members = await client.query('SELECT id, "userId", role FROM workspace_members WHERE "workspaceId" = $1 ORDER BY id', [id]);
    const sourceInvitations = invitationTables.rows.some(row => row.table_name === 'workspace_invitations')
      ? await client.query('SELECT id, status, role FROM workspace_invitations WHERE "workspaceId" = $1 ORDER BY id', [id]) : { rows: [] };
    const otherReferences = [];
    for (const ref of workspaceColumns.rows.filter(row => !['websites', 'workspace_members'].includes(row.table_name))) {
      const table = pg.escapeIdentifier(ref.table_name);
      const column = pg.escapeIdentifier(ref.column_name);
      const count = await client.query(`SELECT count(*)::int AS count FROM ${table} WHERE ${column} = $1`, [id]);
      otherReferences.push({ table: ref.table_name, count: count.rows[0].count });
    }
    details.push({ workspaceId: id, websites: websites.rows, members: members.rows, sourceInvitations: sourceInvitations.rows, otherReferences });
  }
  const organizationColumns = await client.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'organizationId' ORDER BY table_name
  `);
  const ledgerColumns = await client.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN ('workspace_command_journal','workspace_outbox') ORDER BY table_name, ordinal_position`);
  const organizations = [];
  for (const id of [...new Set(workspaces.rows.map(row => row.organizationId).filter(Boolean))]) {
    const org = await client.query(`SELECT id, name, "ownerId", md5(coalesce(settings::text, 'null')) AS "settingsHash",
      ARRAY(SELECT jsonb_object_keys(coalesce(settings::jsonb, '{}'::jsonb))) AS "settingKeys"
      FROM organizations WHERE id=$1`, [id]);
    const members = await client.query('SELECT "userId", role FROM organization_members WHERE "organizationId"=$1 ORDER BY "userId"', [id]);
    const pendingOutbox = await client.query('SELECT count(*)::int AS count FROM workspace_outbox WHERE "organizationId"=$1 AND "dispatchedAt" IS NULL', [id]);
    const pendingOperations = await client.query('SELECT operation, count(*)::int AS count FROM workspace_outbox WHERE "organizationId"=$1 AND "dispatchedAt" IS NULL GROUP BY operation ORDER BY operation', [id]);
    const references = [];
    for (const ref of organizationColumns.rows) {
      const count = await client.query(`SELECT count(*)::int AS count FROM ${pg.escapeIdentifier(ref.table_name)} WHERE ${pg.escapeIdentifier(ref.column_name)}=$1`, [id]);
      if (count.rows[0].count) references.push({ table: ref.table_name, count: count.rows[0].count });
    }
    organizations.push({ ...org.rows[0], members: members.rows, pendingOutbox: pendingOutbox.rows[0].count,
      pendingOperations: pendingOperations.rows, references });
  }
  console.log(JSON.stringify({ workspaces: workspaces.rows, unassigned: unassigned.rows, references: references.rows, workspaceColumns: workspaceColumns.rows, triggers: triggers.rows, invitations: invitationCounts, details, organizations, ledgerColumns: ledgerColumns.rows }, null, 2));
  await client.query("COMMIT");
} finally {
  await client.query("ROLLBACK").catch(() => {});
  client.release();
  await pool.end();
}
