import { randomUUID, createHash } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { assertRevision, copyDesign, literalSearch, StudioError, type SiteQuery } from "./domain.js";

// Keep access checks in SQL before pagination/counting. Never fetch another tenant's rows and filter in the browser.
const ACCESS = `(w."userId" = $1::uuid OR (
  c.permission IN ('OWNER','PROJECT_OWNER','ADMIN','PROJECT_ADMIN','DESIGNER','DEVELOPER','CONTENT_EDITOR','CLIENT','SEO_MANAGER','REVIEWER','VIEWER')
  AND NOT EXISTS (SELECT 1 FROM public.granular_permissions gp WHERE gp."websiteId" = w.id
    AND gp."userId" = $1::uuid AND gp."resourceId" = '*' AND gp.capability = 'VIEW' AND gp.effect = 'DENY')
))`;
const JOINS = `LEFT JOIN public.website_collaborators c ON c."websiteId" = w.id AND c."userId" = $1::uuid
  LEFT JOIN studio.site_state s ON s.site_id = w.id
  LEFT JOIN studio.bookmarks b ON b.site_id = w.id AND b.user_id = $1::uuid
  LEFT JOIN LATERAL (SELECT max(d."completedAt") AS published_at FROM public.deployments d
    WHERE d."websiteId" = w.id AND d.environment = 'PRODUCTION'
      AND d.status IN ('SUCCESS','SUCCEEDED','PUBLISHED','COMPLETED','DEPLOYED')) p ON true`;
const SELECT_SITE = `w.id, w.name, w.slug, w.status, w."workspaceId", w."createdAt", w."updatedAt",
  s.folder_id AS "folderId", s.archived_at AS "archivedAt", coalesce(s.revision, 0) AS revision,
  (b.site_id IS NOT NULL) AS favorite, (w."userId" = $1::uuid) AS "canManage", p.published_at AS "lastPublishedAt",
  CASE WHEN jsonb_typeof(w."editorData"->'pages') = 'array' THEN jsonb_array_length(w."editorData"->'pages') ELSE 1 END AS "pageCount"`;
const ORDER = { updated: 'w."updatedAt"', created: 'w."createdAt"', name: 'lower(w.name)', published: 'p.published_at' } as const;

type WorkspaceRow = QueryResultRow & { id: string; name: string; role: string; canManage: boolean };
type SiteRow = QueryResultRow & { id: string; name: string; workspaceId: string | null; userId: string; editorData: unknown };
export type SitePatch = { revision: number; name?: string; folderId?: string | null; archived?: boolean };

export class StudioRepository {
  constructor(private readonly pool: Pool) {}

  private async transaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '8s'");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  private async actorLock(client: PoolClient, actorId: string): Promise<void> {
    const result = await client.query('SELECT id FROM public.users WHERE id = $1::uuid AND status = \'ACTIVE\' FOR UPDATE', [actorId]);
    if (!result.rowCount) throw new StudioError("Account is not active", 403, "ACCOUNT_INACTIVE");
  }

  private async workspace(client: PoolClient, actorId: string, workspaceId: string | null, manage = false): Promise<WorkspaceRow | null> {
    if (!workspaceId) return null;
    const result = await client.query<WorkspaceRow>(`SELECT w.id, w.name,
      CASE WHEN w."ownerId" = $1::uuid THEN 'OWNER' ELSE m.role END AS role,
      (w."ownerId" = $1::uuid OR m.role IN ('OWNER','ADMIN')) AS "canManage"
      FROM public.workspaces w LEFT JOIN public.workspace_members m ON m."workspaceId" = w.id AND m."userId" = $1::uuid
      WHERE w.id = $2::uuid AND (w."ownerId" = $1::uuid OR m.id IS NOT NULL)`, [actorId, workspaceId]);
    const workspace = result.rows[0];
    if (!workspace) throw new StudioError("Workspace not found", 404, "NOT_FOUND");
    if (manage && !workspace.canManage) throw new StudioError("Workspace administration is required", 403, "FORBIDDEN");
    return workspace;
  }

  private async folder(client: PoolClient, actorId: string, workspaceId: string | null, folderId: string): Promise<void> {
    await this.workspace(client, actorId, workspaceId);
    const result = await client.query(`SELECT id FROM studio.folders WHERE id = $1::uuid AND
      (($2::uuid IS NOT NULL AND workspace_id = $2::uuid) OR ($2::uuid IS NULL AND workspace_id IS NULL AND owner_id = $3::uuid))`, [folderId, workspaceId, actorId]);
    if (!result.rowCount) throw new StudioError("Folder not found in this workspace", 404, "NOT_FOUND");
  }

  private async event(client: PoolClient, actorId: string, workspaceId: string | null, siteId: string | null, action: string, label: string): Promise<void> {
    await client.query(`INSERT INTO studio.events(id, actor_id, workspace_id, site_id, action, label)
      VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6)`, [randomUUID(), actorId, workspaceId, siteId, action, label]);
  }

  private async replay<T>(client: PoolClient, actorId: string, operationId: string, payload: unknown): Promise<T | null> {
    const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const result = await client.query<{ request_hash: string; result: T }>('SELECT request_hash,result FROM studio.operations WHERE actor_id = $1::uuid AND operation_id = $2::uuid', [actorId, operationId]);
    const previous = result.rows[0];
    if (!previous) return null;
    if (previous.request_hash !== hash) throw new StudioError("This request key was already used for different input. Reopen the dialog to start a new operation.", 409, "IDEMPOTENCY_CONFLICT");
    return previous.result;
  }

  private async remember(client: PoolClient, actorId: string, operationId: string, payload: unknown, result: unknown): Promise<void> {
    const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    await client.query('INSERT INTO studio.operations(actor_id,operation_id,request_hash,result) VALUES ($1::uuid,$2::uuid,$3,$4::jsonb)', [actorId, operationId, hash, JSON.stringify(result)]);
  }

  async bootstrap(actorId: string) {
    const workspaces = await this.pool.query<WorkspaceRow>(`SELECT w.id, w.name,
      CASE WHEN w."ownerId" = $1::uuid THEN 'OWNER' ELSE m.role END AS role,
      (w."ownerId" = $1::uuid OR m.role IN ('OWNER','ADMIN')) AS "canManage"
      FROM public.workspaces w LEFT JOIN public.workspace_members m ON m."workspaceId" = w.id AND m."userId" = $1::uuid
      WHERE w."ownerId" = $1::uuid OR m.id IS NOT NULL ORDER BY lower(w.name), w.id`, [actorId]);
    const plan = await this.pool.query(`SELECT p.name, p."websiteLimit" FROM public.user_subscriptions s
      JOIN public.subscription_plans p ON p.id = s."planId" WHERE s."userId" = $1::uuid AND s.status = 'ACTIVE'
      AND (s."currentPeriodEnd" IS NULL OR s."currentPeriodEnd" > now())`, [actorId]);
    return { workspaces: workspaces.rows, plan: plan.rows[0] ?? { name: "Free", websiteLimit: 2 } };
  }

  async list(actorId: string, query: SiteQuery) {
    return this.transaction(async client => {
      await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await this.workspace(client, actorId, query.workspaceId);
      if (query.folderId) await this.folder(client, actorId, query.workspaceId, query.folderId);
      const values = [actorId, query.workspaceId, literalSearch(query.q), query.view, query.folderId];
      const where = `${ACCESS}
        AND ($4 = 'shared' OR (w."workspaceId" IS NOT DISTINCT FROM $2::uuid))
        AND ($4 <> 'shared' OR w."userId" <> $1::uuid)
        AND w.name ILIKE $3 ESCAPE E'\\\\'
        AND (($4 = 'archived' AND s.archived_at IS NOT NULL) OR ($4 <> 'archived' AND s.archived_at IS NULL))
        AND ($4 <> 'favorites' OR b.site_id IS NOT NULL)
        AND ($5::uuid IS NULL OR s.folder_id = $5::uuid)`;
      const count = await client.query<{ total: number }>(`SELECT count(*)::int AS total FROM public.websites w ${JOINS} WHERE ${where}`, values);
      const sites = await client.query(`SELECT ${SELECT_SITE} FROM public.websites w ${JOINS} WHERE ${where}
        ORDER BY ${ORDER[query.sort]} ${query.direction === "asc" ? "ASC" : "DESC"} NULLS LAST, w.id
        LIMIT $6 OFFSET $7`, [...values, query.limit, (query.page - 1) * query.limit]);
      const folders = query.view === "shared" ? { rows: [] } : await client.query(`SELECT f.id, f.name,
        (f.workspace_id IS NOT NULL OR f.owner_id = $1::uuid) AS "inScope"
        FROM studio.folders f WHERE (f.workspace_id = $2::uuid OR ($2::uuid IS NULL AND f.workspace_id IS NULL AND f.owner_id = $1::uuid))
        ORDER BY lower(f.name), f.id`, [actorId, query.workspaceId]);
      return { sites: sites.rows, folders: folders.rows, total: count.rows[0]?.total ?? 0, page: query.page, limit: query.limit };
    });
  }

  async createWorkspace(actorId: string, workspaceName: string, operationId: string) {
    return this.transaction(async client => {
      await this.actorLock(client, actorId);
      const payload = ["workspace.create", workspaceName];
      const previous = await this.replay<{ id: string; name: string; role: string; canManage: boolean }>(client, actorId, operationId, payload);
      if (previous) return previous;
      const count = await client.query<{ total: number }>('SELECT count(*)::int AS total FROM public.workspaces WHERE "ownerId" = $1::uuid', [actorId]);
      if ((count.rows[0]?.total ?? 0) >= 50) throw new StudioError("Workspace limit reached", 409, "WORKSPACE_LIMIT");
      const workspaceId = randomUUID();
      await client.query(`INSERT INTO public.workspaces(id,name,slug,"ownerId",settings,"createdAt","updatedAt")
        VALUES ($1::uuid,$2,$3,$4::uuid,'{}'::jsonb,now(),now())`, [workspaceId, workspaceName, `workspace-${workspaceId}`, actorId]);
      await this.event(client, actorId, workspaceId, null, "workspace.created", workspaceName);
      const created = { id: workspaceId, name: workspaceName, role: "OWNER", canManage: true };
      await this.remember(client, actorId, operationId, payload, created);
      return created;
    });
  }

  async renameWorkspace(actorId: string, workspaceId: string, workspaceName: string) {
    return this.transaction(async client => {
      await this.workspace(client, actorId, workspaceId, true);
      await client.query('UPDATE public.workspaces SET name = $2, "updatedAt" = now() WHERE id = $1::uuid', [workspaceId, workspaceName]);
      await this.event(client, actorId, workspaceId, null, "workspace.renamed", workspaceName);
    });
  }

  async members(actorId: string, workspaceId: string) {
    return this.transaction(async client => {
      await this.workspace(client, actorId, workspaceId);
      const result = await client.query(`SELECT u.id, u."fullName", u.email, 'OWNER' AS role FROM public.workspaces w
        JOIN public.users u ON u.id = w."ownerId" WHERE w.id = $1::uuid
        UNION ALL SELECT u.id, u."fullName", u.email, m.role FROM public.workspace_members m
        JOIN public.users u ON u.id = m."userId" JOIN public.workspaces w ON w.id = m."workspaceId"
        WHERE m."workspaceId" = $1::uuid AND u.id <> w."ownerId"`, [workspaceId]);
      return result.rows;
    });
  }

  async createFolder(actorId: string, workspaceId: string | null, folderName: string) {
    return this.transaction(async client => {
      await this.actorLock(client, actorId);
      await this.workspace(client, actorId, workspaceId, true);
      const folderId = randomUUID();
      await client.query('INSERT INTO studio.folders(id,owner_id,workspace_id,name) VALUES ($1::uuid,$2::uuid,$3::uuid,$4)', [folderId, actorId, workspaceId, folderName]);
      await this.event(client, actorId, workspaceId, null, "folder.created", folderName);
      return { id: folderId, name: folderName };
    });
  }

  async changeFolder(actorId: string, folderId: string, workspaceId: string | null, newName: string | null) {
    return this.transaction(async client => {
      await this.workspace(client, actorId, workspaceId, true);
      await this.folder(client, actorId, workspaceId, folderId);
      const folder = await client.query<{ name: string }>('SELECT name FROM studio.folders WHERE id = $1::uuid FOR UPDATE', [folderId]);
      if (newName === null) await client.query('DELETE FROM studio.folders WHERE id = $1::uuid', [folderId]);
      else await client.query('UPDATE studio.folders SET name = $2, updated_at = now() WHERE id = $1::uuid', [folderId, newName]);
      await this.event(client, actorId, workspaceId, null, newName === null ? "folder.deleted" : "folder.renamed", newName ?? folder.rows[0]?.name ?? "Folder");
    });
  }

  async createSite(actorId: string, siteName: string, workspaceId: string | null, folderId: string | null, sourceId: string | null, operationId: string) {
    return this.transaction(async client => {
      // Lock the account before quota counting: two Studio creates cannot consume the final slot.
      await this.actorLock(client, actorId);
      const payload = ["site.create", siteName, workspaceId, folderId, sourceId];
      const previous = await this.replay<{ id: string; name: string; slug: string; status: string }>(client, actorId, operationId, payload);
      if (previous) return previous;
      await this.workspace(client, actorId, workspaceId, true);
      if (folderId) await this.folder(client, actorId, workspaceId, folderId);
      const limits = await client.query<{ limit: number }>(`SELECT p."websiteLimit" AS limit FROM public.user_subscriptions s
        JOIN public.subscription_plans p ON p.id = s."planId" WHERE s."userId" = $1::uuid AND s.status = 'ACTIVE'
        AND (s."currentPeriodEnd" IS NULL OR s."currentPeriodEnd" > now())`, [actorId]);
      const limit = limits.rows[0]?.limit ?? 2;
      const count = await client.query<{ total: number }>('SELECT count(*)::int AS total FROM public.websites WHERE "userId" = $1::uuid', [actorId]);
      if (limit >= 0 && (count.rows[0]?.total ?? 0) >= limit) throw new StudioError("Your site limit has been reached. Archived sites still count toward this limit.", 409, "SITE_LIMIT");
      let design: unknown = { version: 1, elements: [] };
      if (sourceId) {
        const source = await client.query<SiteRow>('SELECT id,name,"editorData" FROM public.websites WHERE id = $1::uuid AND "userId" = $2::uuid FOR SHARE', [sourceId, actorId]);
        if (!source.rows[0]) throw new StudioError("Owned source site not found", 404, "NOT_FOUND");
        design = copyDesign(source.rows[0].editorData);
      }
      const siteId = randomUUID();
      const slug = `${siteName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "site"}-${siteId.slice(0, 8)}`;
      await client.query(`INSERT INTO public.websites(id,"userId",name,slug,status,"editorData","workspaceId","createdAt","updatedAt")
        VALUES ($1::uuid,$2::uuid,$3,$4,'DRAFT',$5::jsonb,$6::uuid,now(),now())`, [siteId, actorId, siteName, slug, JSON.stringify(design), workspaceId]);
      await client.query('INSERT INTO studio.site_state(site_id,folder_id) VALUES ($1::uuid,$2::uuid)', [siteId, folderId]);
      await this.event(client, actorId, workspaceId, siteId, sourceId ? "site.design_duplicated" : "site.created", siteName);
      const created = { id: siteId, name: siteName, slug, status: "DRAFT" };
      await this.remember(client, actorId, operationId, payload, created);
      return created;
    });
  }

  async patchSite(actorId: string, siteId: string, patch: SitePatch) {
    return this.transaction(async client => {
      const result = await client.query<SiteRow>('SELECT id,name,"workspaceId","userId" FROM public.websites WHERE id = $1::uuid AND "userId" = $2::uuid FOR UPDATE', [siteId, actorId]);
      const site = result.rows[0];
      if (!site) throw new StudioError("Owned site not found", 404, "NOT_FOUND");
      if (patch.folderId) await this.folder(client, actorId, site.workspaceId, patch.folderId);
      await client.query('INSERT INTO studio.site_state(site_id) VALUES ($1::uuid) ON CONFLICT (site_id) DO NOTHING', [siteId]);
      const state = await client.query<{ revision: number }>('SELECT revision FROM studio.site_state WHERE site_id = $1::uuid FOR UPDATE', [siteId]);
      assertRevision(state.rows[0]!.revision, patch.revision);
      if (patch.name !== undefined) await client.query('UPDATE public.websites SET name = $2, "updatedAt" = now() WHERE id = $1::uuid', [siteId, patch.name]);
      const updated = await client.query<{ revision: number }>(`UPDATE studio.site_state SET
        folder_id = CASE WHEN $2::boolean THEN $3::uuid ELSE folder_id END,
        archived_at = CASE WHEN $4::boolean THEN CASE WHEN $5::boolean THEN now() ELSE NULL END ELSE archived_at END
        WHERE site_id = $1::uuid RETURNING revision`, [siteId, patch.folderId !== undefined, patch.folderId ?? null, patch.archived !== undefined, patch.archived ?? false]);
      const action = patch.archived === true ? "site.archived" : patch.archived === false ? "site.restored" : patch.folderId !== undefined ? "site.moved" : "site.renamed";
      await this.event(client, actorId, site.workspaceId, siteId, action, patch.name ?? site.name);
      return { revision: updated.rows[0]!.revision };
    });
  }

  async bookmark(actorId: string, siteId: string, favorite: boolean) {
    return this.transaction(async client => {
      const access = await client.query(`SELECT w.id FROM public.websites w
        LEFT JOIN public.website_collaborators c ON c."websiteId" = w.id AND c."userId" = $1::uuid
        WHERE w.id = $2::uuid AND ${ACCESS}`, [actorId, siteId]);
      if (!access.rowCount) throw new StudioError("Site not found", 404, "NOT_FOUND");
      if (favorite) await client.query('INSERT INTO studio.bookmarks(user_id,site_id) VALUES ($1::uuid,$2::uuid) ON CONFLICT DO NOTHING', [actorId, siteId]);
      else await client.query('DELETE FROM studio.bookmarks WHERE user_id = $1::uuid AND site_id = $2::uuid', [actorId, siteId]);
    });
  }

  async activity(actorId: string, workspaceId: string | null) {
    return this.transaction(async client => {
      const workspace = await this.workspace(client, actorId, workspaceId);
      const result = await client.query(`SELECT e.id,e.action,e.label,e.created_at AS "createdAt",e.site_id AS "siteId"
        FROM studio.events e WHERE
        ($2::uuid IS NULL AND e.actor_id = $1::uuid AND e.workspace_id IS NULL) OR
        ($2::uuid IS NOT NULL AND e.workspace_id = $2::uuid AND ($3::boolean OR e.actor_id = $1::uuid))
        ORDER BY e.created_at DESC, e.id LIMIT 100`, [actorId, workspaceId, workspace?.canManage ?? false]);
      return result.rows;
    });
  }
}
