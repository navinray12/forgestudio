/**
 * @file Publishing: database reads and writes. File responsibility: published snapshot repository.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { prisma } from "../../platform/database/prisma.js";
import { AppError } from "../../platform/http/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";

// Older clients sometimes stored JSON text inside the JSONB column. Read that
// representation without losing its live snapshot during the first modern save.
const storedDocument = Prisma.sql`(CASE WHEN jsonb_typeof("editorData") = 'string'
  THEN ("editorData" #>> '{}')::jsonb ELSE "editorData" END)`;

/** Updates only live fields in the current row; unpublished edits stay intact.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param snapshot Snapshot supplied to this operation (type: unknown).
 * @param publishing Publishing supplied to this operation (type: unknown).
 * @param expectedVersion Expected Version supplied to this operation (type: string | null).
 */
export async function activatePublishedSnapshot(
  websiteId: string,
  snapshot: unknown,
  publishing: unknown,
  expectedVersion: string | null,
) {
  const changed = await prisma.$executeRaw`
    UPDATE websites
    SET "editorData" = jsonb_set(jsonb_set(${storedDocument}, '{publishedData}', ${JSON.stringify(snapshot)}::jsonb), '{publishing}', ${JSON.stringify(publishing)}::jsonb),
        status = 'PUBLISHED', "updatedAt" = NOW()
    WHERE id = ${websiteId}::uuid
      AND (${storedDocument} #>> '{publishedData,version}') IS NOT DISTINCT FROM ${expectedVersion}
  `;
  if (changed !== 1)
    throw new AppError(
      "The live release changed during publishing. Refresh and retry.",
      409,
      "LIVE_RELEASE_CONFLICT",
    );
}

/** Draft writes never accept client-supplied live state or erase a new release.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param document Document supplied to this operation (type: unknown).
 * @param client Client supplied to this operation (type: Prisma.TransactionClient). Defaults to prisma.
 */
export async function saveDraftPreservingPublishedSnapshot(
  websiteId: string,
  document: unknown,
  client: Prisma.TransactionClient = prisma,
) {
  const rows = await client.$queryRaw<Array<Record<string, unknown>>>`
    UPDATE websites
    SET "editorData" = (${JSON.stringify(document)}::jsonb - 'publishedData' - 'publishing')
      || CASE WHEN ${storedDocument} ? 'publishedData' THEN jsonb_build_object('publishedData', ${storedDocument}->'publishedData') ELSE '{}'::jsonb END
      || CASE WHEN ${storedDocument} ? 'publishing' THEN jsonb_build_object('publishing', ${storedDocument}->'publishing') ELSE '{}'::jsonb END,
      "updatedAt" = NOW(), "draftRevision" = gen_random_uuid()
    WHERE id = ${websiteId}::uuid
    RETURNING *
  `;
  if (!rows[0])
    throw new AppError("Website not found.", 404, "WEBSITE_NOT_FOUND");
  return rows[0];
}
