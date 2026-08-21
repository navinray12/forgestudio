import type {
  Request,
  Response,
  NextFunction,
} from "express";

import { loginSchema } from "../validators/login.validator.js";
import { loginUser } from "../services/login.service.js";
import { createUserSession } from "../services/session.service.js";

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validationResult = loginSchema.safeParse(
      req.body
    );

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login details",
          details: validationResult.error.issues,
        },
      });
    }

    const user = await loginUser(
      validationResult.data
    );

    const session = await createUserSession(
      user.id
    );

    res.cookie(
      AUTH_COOKIE_NAME,
      session.token,
      AUTH_COOKIE_OPTIONS
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}