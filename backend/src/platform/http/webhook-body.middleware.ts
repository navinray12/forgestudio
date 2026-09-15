/**
 * @file HTTP infrastructure: webhook body middleware. Shared request, response and error handling for the API.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import express, { type RequestHandler } from "express";
import { AppError } from "./app-error.js";
import { validateJsonEnvelope } from './validate-json-envelope.js';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/** Verify HMACs against the original bytes, before any JSON reserialization. */
const parser = express.json({
  limit: "2mb",
  /**
   * Verify.
   * @param req Express request containing route parameters, query values, headers and any parsed body.
   * @param _res Res supplied to this operation.
   * @param bytes Bytes supplied to this operation.
   */
  verify(req, _res, bytes) {
    if (/\/wordpress\/webhook(?:\?|$)/.test(req.url || "")) {
      Object.assign(req, { rawBody: Buffer.from(bytes) });
    }
  },
});
const draftParser = express.json({ limit: '3mb', /**
 * Verify.
 * @param _req Req supplied to this operation.
 * @param _res Res supplied to this operation.
 * @param bytes Bytes supplied to this operation.
 */
/**
 * Verify.
 * @param _req Express request containing route parameters, query values, headers and any parsed body.
 * @param _res Express response used to send the result; authenticated request context may be stored in locals.
 * @param bytes Bytes supplied to this operation.
 */
verify(_req, _res, bytes) { validateJsonEnvelope(bytes); } });
const webhookParser = express.json({ limit: '1mb', /**
 * Verify.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param _res Res supplied to this operation.
 * @param bytes Bytes supplied to this operation.
 */
/**
 * Verify.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param _res Express response used to send the result; authenticated request context may be stored in locals.
 * @param bytes Bytes supplied to this operation.
 */
verify(req, _res, bytes) { Object.assign(req, { rawBody: Buffer.from(bytes) }); } });

/**
 * Json Body Parser.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param next Express continuation used to pass control or an error to the next middleware.
 */
export const jsonBodyParser: RequestHandler = (req, res, next) => {
  if (
    /\/wordpress\/webhook(?:\?|$)/.test(req.url) &&
    req.header("content-encoding") &&
    req.header("content-encoding") !== "identity"
  ) {
    next(
      new AppError(
        "Signed webhooks must use an uncompressed JSON body.",
        415,
        "UNSUPPORTED_WEBHOOK_ENCODING",
      ),
    );
    return;
  }
  if (/\/draft-saves(?:\?|$)/.test(req.url)) draftParser(req, res, next);
  else if (/\/wordpress\/webhook(?:\?|$)/.test(req.url)) webhookParser(req, res, next);
  else parser(req, res, next);
};
