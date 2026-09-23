/** @file Preserve the legacy API error contract while sharing document validation with browser hosts. */
import { AppError } from '../../platform/http/app-error.js';

export class DocumentContractError extends Error {
  code: string;
  constructor(message: string, code = 'DOCUMENT_CONTRACT_ERROR') {
    super(message);
    this.name = 'DocumentContractError';
    this.code = code;
  }
}

/**
 * Assert that the legacy website document adheres to structural limits and uniqueness constraints.
 * @param document Complete legacy website document received by the API.
 */
export function assertLegacyWebsiteDocument(document: unknown): void {
  if (!document || typeof document !== 'object') {
    throw new DocumentContractError('Invalid document: must be an object', 'INVALID_DOCUMENT');
  }

  const doc = document as { elements?: any[] };
  if (!Array.isArray(doc.elements)) {
    return;
  }

  if (doc.elements.length > 5000) {
    throw new DocumentContractError('Document exceeds 5,000 element limit.', 'DOCUMENT_LIMIT_EXCEEDED');
  }

  const seenIds = new Set<string>();

  function traverse(nodes: any[], depth: number) {
    if (depth > 50) {
      throw new DocumentContractError('Document exceeds 50 nesting levels.', 'MAX_DEPTH_EXCEEDED');
    }

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node.id) {
        if (seenIds.has(node.id)) {
          throw new DocumentContractError(`Node ID "${node.id}" must be unique.`, 'DUPLICATE_NODE_ID');
        }
        seenIds.add(node.id);
      }
      if (Array.isArray(node.children)) {
        traverse(node.children, depth + 1);
      }
    }
  }

  traverse(doc.elements, 1);
}

/**
 * Validate existing website trees without renaming fields or changing saved widget data.
 * @param document Complete legacy website document received by the API.
 */
export function validateLegacyDocument(document: unknown): void {
  try {
    assertLegacyWebsiteDocument(document);
  } catch (error) {
    if (error instanceof DocumentContractError) {
      throw new AppError(error.message, 422, error.code);
    }
    throw error;
  }
}

