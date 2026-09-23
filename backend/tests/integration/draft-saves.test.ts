/**
 * @file Draft saves test: regression or diagnostic checks for the behavior named by this file.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/platform/database/prisma.js';
import { saveWebsiteDraft } from '../../src/modules/pages/save-website-draft.js';
import { activatePublishedSnapshot } from '../../src/modules/publishing/published-snapshot.repository.js';
import { pruneExpiredDraftReceipts } from '../../src/workers/prune-expired-draft-receipts.js';
import { getOrCreatePersonalWorkspace } from '../../src/modules/workspaces/workspace-membership.service.js';

const owner = randomUUID(), member = randomUUID(), outsider = randomUUID(), site = randomUUID();
beforeAll(async () => {
  await prisma.user.createMany({ data: [owner, member, outsider].map(id => ({ id, email: `${id}@example.test` })) });
  const ws = await getOrCreatePersonalWorkspace(owner);
  await prisma.website.create({ data: { id: site, userId: owner, name: 'Draft races', slug: `draft-${site}`, editorData: { version: 1, elements: [] }, workspaceId: ws.id } });
  await prisma.websiteCollaborator.create({ data: { websiteId: site, userId: member, permission: 'DESIGNER' } });
});
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: [owner, member, outsider] } } }); });
/**
 * Load.
 */
const load = () => prisma.website.findUniqueOrThrow({ where: { id: site } });
/**
 * Command.
 * @param text Text supplied to this operation (type: string).
 */
const command = async (text: string) => ({ mutationId: randomUUID(), expectedRevision: (await load()).draftRevision, authorityEpoch: '1' as const, document: { version: 1, elements: [{ id: 'heading', type: 'heading', content: text }] } });

describe('durable draft save receipts against PostgreSQL', () => {
  it('has one winner for concurrent writes using the same head', async () => {
    const first = await command('race one');
    const second = { ...first, mutationId: randomUUID(), document: { version: 1, elements: [] } };
    const results = await Promise.allSettled([saveWebsiteDraft(site, owner, first), saveWebsiteDraft(site, owner, second)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.code).toBe('DRAFT_REVISION_CONFLICT');
    expect(await prisma.draftSaveReceipt.count({ where: { mutationId: { in: [first.mutationId, second.mutationId] } } })).toBe(1);
  });
  it('replays a lost response after a newer save without changing the current head', async () => {
    const first = await command('before lost response');
    const accepted = await saveWebsiteDraft(site, owner, first);
    const later = await saveWebsiteDraft(site, owner, await command('newer draft'));
    const replay = await saveWebsiteDraft(site, owner, first);
    expect(replay).toEqual({ ...accepted, replayed: true });
    expect((await load()).draftRevision).toBe(later.acceptedRevision);
    await expect(saveWebsiteDraft(site, owner, { ...first, document: {} })).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
  });
  it('concurrent duplicate requests return one immutable receipt', async () => {
    const request = await command('duplicate');
    const receipts = await Promise.all(Array.from({ length: 4 }, () => saveWebsiteDraft(site, owner, request)));
    expect(new Set(receipts.map(receipt => receipt.acceptedRevision)).size).toBe(1);
    expect(receipts.filter(receipt => !receipt.replayed)).toHaveLength(1);
  });
  it('rejects receipt replay after collaborator revocation', async () => {
    const request = await command('member draft');
    await saveWebsiteDraft(site, member, request);
    await prisma.websiteCollaborator.deleteMany({ where: { websiteId: site, userId: member } });
    await expect(saveWebsiteDraft(site, member, request)).rejects.toMatchObject({ statusCode: 404 });
    await expect(saveWebsiteDraft(site, outsider, request)).rejects.toMatchObject({ statusCode: 404 });
  });
  it('rejects inactive actors and revoked sessions at the transaction boundary', async () => {
    const request = await command('unauthorized');
    await expect(saveWebsiteDraft(site, owner, request, randomUUID())).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await prisma.user.update({ where: { id: owner }, data: { status: 'SUSPENDED' } });
    await expect(saveWebsiteDraft(site, owner, request)).rejects.toMatchObject({ code: 'ACCOUNT_UNAVAILABLE' });
    await prisma.user.update({ where: { id: owner }, data: { status: 'ACTIVE' } });
  });
  it('keeps draft identity when a live release changes and ignores incoming live fields', async () => {
    const request = await command('draft while publishing');
    await activatePublishedSnapshot(site, { version: '1', elements: [] }, { version: '1' }, null);
    expect((await load()).draftRevision).toBe(request.expectedRevision);
    await saveWebsiteDraft(site, owner, { ...request, document: { ...request.document, publishedData: { version: 'forged' } } });
    expect((await load()).editorData).toMatchObject({ publishedData: { version: '1' } });
  });
  it('legacy and restore writes invalidate outstanding modern preconditions', async () => {
    const request = await command('stale modern client');
    await prisma.website.update({ where: { id: site }, data: { editorData: { version: 1, elements: [], legacyRestore: true } } });
    await expect(saveWebsiteDraft(site, owner, request)).rejects.toMatchObject({ code: 'DRAFT_REVISION_CONFLICT' });
  });
  it('preserves unknown widgets, page fields, order and newly added popups for an owner', async () => {
    const request = await command('preservation');
    const document = { version: 1, elements: [
      { id: 'future', type: 'future-widget', extension: { nested: ['untouched'] } },
      { id: 'heading', type: 'heading', content: 'last' },
    ], pages: [{ id: 'home', futurePageSettings: { preserve: true }, elements: [] }], popups: [{ id: 'new-popup', elements: [] }] };
    await saveWebsiteDraft(site, owner, { ...request, document });
    expect((await load()).editorData).toMatchObject(document);
  });
  it('rolls back the draft and receipt when durable audit persistence fails', async () => {
    const request = await command('must not be acknowledged');
    const before = await load();
    await prisma.$executeRawUnsafe(`CREATE FUNCTION fail_draft_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'DRAFT_SAVED' THEN RAISE EXCEPTION 'injected audit outage'; END IF; RETURN NEW; END; $$`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_draft_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_draft_audit()');
    try {
      await expect(saveWebsiteDraft(site, owner, request)).rejects.toThrow();
      expect((await load()).draftRevision).toBe(before.draftRevision);
      expect(await prisma.draftSaveReceipt.count({ where: { mutationId: request.mutationId } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER fail_draft_audit ON audit_logs');
      await prisma.$executeRawUnsafe('DROP FUNCTION fail_draft_audit()');
    }
  });
  it('prunes expired old receipts in bounded batches while retaining the current head', async () => {
    await saveWebsiteDraft(site, owner, await command('old retained draft'));
    const current = await saveWebsiteDraft(site, owner, await command('current retained draft'));
    await prisma.draftSaveReceipt.updateMany({ where: { websiteId: site }, data: { expiresAt: new Date(0) } });
    const removed = await pruneExpiredDraftReceipts();
    expect(removed).toBeGreaterThan(0);
    expect(removed).toBeLessThanOrEqual(10);
    expect(await prisma.draftSaveReceipt.count({ where: { websiteId: site, acceptedRevision: current.acceptedRevision } })).toBe(1);
    expect((await load()).draftRevision).toBe(current.acceptedRevision);
  });
  it('rejects changes to protected descendants without acknowledging a partial save', async () => {
    await prisma.websiteCollaborator.upsert({ where: { websiteId_userId: { websiteId: site, userId: member } }, create: { websiteId: site, userId: member, permission: 'DESIGNER' }, update: { permission: 'DESIGNER' } });
    const draft = { version: 1, elements: [{ id: 'parent', type: 'container', children: [{ id: 'protected', type: 'heading', isProtected: true, content: 'Owner content' }] }] };
    await saveWebsiteDraft(site, owner, { ...await command('protected baseline'), document: draft });
    const request = { ...await command('protected attack'), document: { ...draft, elements: [{ ...draft.elements[0], children: [{ ...draft.elements[0].children[0], content: 'Unauthorized replacement' }] }] } };
    await expect(saveWebsiteDraft(site, member, request)).rejects.toMatchObject({ code: 'DRAFT_CHANGES_REJECTED' });
    expect((await load()).editorData).toMatchObject(draft);
    expect(await prisma.draftSaveReceipt.count({ where: { mutationId: request.mutationId } })).toBe(0);
  });
});
