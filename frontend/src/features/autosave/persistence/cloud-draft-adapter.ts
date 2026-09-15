/**
 * @file Autosave feature: cloud draft adapter. Keep feature UI, hooks, services and types in this module.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { SaveFailure, type SaveCommand, type SaveHost, type SaveReceipt } from '@forgestudio/editor-persistence';
import { writeRecovery } from './local-recovery-store';
import { assertLegacyWebsiteDocument } from '@forgestudio/document-contract/legacy';
import { DocumentContractError } from '@forgestudio/document-contract/errors';
import { readBoundedJson } from '@forgestudio/document-contract/json';
/**
 * Connect the shared save coordinator to the authenticated cloud draft endpoint.
 * @param apiUrl API origin; the draft route is appended to this base URL.
 * @param websiteId Identifier of the website whose data is being read or changed.
 * @param accountId Signed-in account used to partition browser recovery copies.
 * @param tabId Browser tab identifier that keeps simultaneous editing sessions separate.
 * @returns A host adapter that retains recovery commands and classifies HTTP failures.
 */
export function createCloudDraftAdapter(apiUrl: string, websiteId: string, accountId: string, tabId: string): SaveHost {
  return {
    recover: record => writeRecovery(accountId, websiteId, tabId, 'mutation', JSON.stringify(record)),
    /**
     * Submit the exact command with its idempotency key and a 15-second request timeout.
     * @param command Captured draft and revision precondition; retries reuse its mutation ID.
     * @returns The host receipt, which the coordinator validates before acknowledging edits.
     */
    async save(command: SaveCommand): Promise<SaveReceipt> {
      let document: unknown;
      try {
        document = readBoundedJson(command.document);
        assertLegacyWebsiteDocument(document);
      } catch (error) {
        if (error instanceof DocumentContractError) throw new SaveFailure(error.message, error.code, false);
        throw error;
      }
      let response: Response;
      try {
        response = await fetch(`${apiUrl}/api/v1/websites/${encodeURIComponent(websiteId)}/draft-saves`, {
          method: 'POST', credentials: 'include', signal: AbortSignal.timeout(15_000),
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.mutationId },
          body: JSON.stringify({ ...command, document }),
        });
      } catch { throw new SaveFailure('The host could not confirm the save. Retry checks the same mutation; your edits remain here.', 'SAVE_UNAVAILABLE', true); }
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new SaveFailure(body?.detail ?? body?.error?.message ?? 'Saving failed. Your edits remain here.', body?.code ?? body?.error?.code ?? `HTTP_${response.status}`, response.status >= 500 || response.status === 429);
      return body as SaveReceipt;
    },
  };
}
