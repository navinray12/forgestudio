import type { Request, Response, NextFunction } from "express";
import { signupSchema } from "../validators/signup.validator.js";
import { signupUser } from "../services/signup.service.js";
import { createUserSession } from "../services/session.service.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
} from "../config/auth.js";

export async function signupController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const validationResult = signupSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid signup details",
          details: validationResult.error.issues,
        },
      });
    }

    const user = await signupUser(validationResult.data);

    const session = await createUserSession(user.id);

    res.cookie(
      AUTH_COOKIE_NAME,
      session.token,
      AUTH_COOKIE_OPTIONS
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}
