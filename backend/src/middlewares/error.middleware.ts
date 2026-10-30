import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../utils/app-error.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (
    error instanceof AppError ||
    (error && typeof error === "object" && ("statusCode" in (error as any) || "status" in (error as any)))
  ) {
    const err = error as any;
    const statusCode = err.statusCode || err.status || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      code: err.code || (err.type === "entity.parse.failed" ? "INVALID_JSON" : "BAD_REQUEST"),
      error: {
        code: err.code || (err.type === "entity.parse.failed" ? "INVALID_JSON" : "BAD_REQUEST"),
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error("Unhandled error:", error);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
}