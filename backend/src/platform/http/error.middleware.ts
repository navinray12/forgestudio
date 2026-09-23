/**
 * @file HTTP infrastructure: error middleware. Shared request, response and error handling for the API.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "./app-error.js";
import { randomUUID } from 'node:crypto';

/**
 * Error Middleware.
 * @param error Error value to inspect, report or pass to the next error boundary.
 * @param req Express request containing route parameters, query values, headers and any parsed body.
 * @param res Express response used to send the result; authenticated request context may be stored in locals.
 * @param _next Next supplied to this operation (type: NextFunction).
 */
export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  const parserError = error as { type?: string; status?: number; code?: string; message?: string };
  if (!(error instanceof AppError) && (parserError?.type === 'entity.too.large' || parserError?.type === 'entity.parse.failed')) {
    error = new AppError(parserError.type === 'entity.too.large' ? 'Request body exceeds the supported limit.' : 'Malformed JSON body.', parserError.type === 'entity.too.large' ? 413 : 400, parserError.type === 'entity.too.large' ? 'BODY_TOO_LARGE' : 'INVALID_JSON');
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).type('application/problem+json').json({
      type: 'about:blank', title: error.message, status: error.statusCode,
      detail: error.message, instance: req.path, code: error.code, requestId,
      retryable: error.statusCode === 429 || error.statusCode === 503,
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error && typeof error === 'object' && (error as any).name === 'PrismaClientKnownRequestError') {
    const prismaErr = error as any;
    if (prismaErr.code === 'P2025') {
      return res.status(404).type('application/problem+json').json({
        type: 'about:blank',
        title: 'Resource not found',
        status: 404,
        detail: 'The requested database record was not found.',
        instance: req.path,
        code: 'NOT_FOUND',
        requestId,
        retryable: false,
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });
    }
    if (prismaErr.code === 'P2002') {
      return res.status(409).type('application/problem+json').json({
        type: 'about:blank',
        title: 'Resource conflict',
        status: 409,
        detail: 'A record with this unique value already exists.',
        instance: req.path,
        code: 'CONFLICT',
        requestId,
        retryable: false,
        success: false,
        error: { code: 'CONFLICT', message: 'Resource already exists' },
      });
    }
  }

  // Log correlation and safe classification; database error objects can contain content.
  console.error('Unhandled request failure', {
    requestId,
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    code: (error as any)?.code,
    meta: (error as any)?.meta,
    path: req.path,
    method: req.method,
  });

  return res.status(500).type('application/problem+json').json({
    type: 'about:blank', title: 'Something went wrong', status: 500,
    detail: 'The request could not be completed.', instance: req.path,
    code: 'INTERNAL_SERVER_ERROR', requestId, retryable: true,
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
}
