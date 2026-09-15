/** @file Preserve the legacy API error contract while sharing document validation with browser hosts. */
import { assertLegacyWebsiteDocument } from '@forgestudio/document-contract/legacy';
import { DocumentContractError } from '@forgestudio/document-contract/errors';
import { AppError } from '../../platform/http/app-error.js';

/**
 * Validate existing website trees without renaming fields or changing saved widget data.
 * @param document Complete legacy website document received by the API.
 */
export function validateLegacyDocument(document: unknown): void {
  try { assertLegacyWebsiteDocument(document); }
  catch (error) {
    if (error instanceof DocumentContractError) throw new AppError(error.message, 422, error.code);
    throw error;
  }
}
