/**
 * @file Declarations d: types module support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
declare module "acorn" {
  export function parse(input: string, options?: any): any;
}

declare module "express-rate-limit" {
  import { RequestHandler } from "express";
  export function rateLimit(options?: any): RequestHandler;
  export default function rateLimit(options?: any): RequestHandler;
}

declare module "nodemailer" {
  export function createTransport(options?: any): any;
  export default { createTransport };
}

declare module "@forgestudio/document-contract/legacy" {
  export function assertLegacyWebsiteDocument(document: unknown): void;
}

declare module "@forgestudio/document-contract/errors" {
  export class DocumentContractError extends Error {
    code: string;
  }
}
