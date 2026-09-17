import {
  findUserByIdentifier,
} from "../repositories/login.repository.js";

import {
  verifyPassword,
} from "../utils/password.js";

import {
  AppError,
} from "../utils/app-error.js";

import type {
  LoginInput,
} from "../validators/login.validator.js";

const INVALID_CREDENTIALS =
  "Invalid email/phone or password";

export async function loginUser(input: LoginInput) {
  const identifier = input.identifier.trim();

  const normalizedIdentifier =
    identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier;

  const user = await findUserByIdentifier(
    normalizedIdentifier
  );

  if (!user) {
    throw new AppError(
      `Account '${normalizedIdentifier}' not found. Please sign up first via /api/v1/auth/signup or use 'demo@forgestudio.com'`,
      401,
      "USER_NOT_FOUND"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      "User account is inactive or suspended.",
      401,
      "ACCOUNT_INACTIVE"
    );
  }

  if (!user.passwordHash) {
    throw new AppError(
      "Account has no password set. Please use OTP login or social login.",
      401,
      "NO_PASSWORD_SET"
    );
  }

  const passwordValid = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new AppError(
      "Incorrect password provided. (Default demo password is 'Password123!')",
      401,
      "INVALID_PASSWORD"
    );
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
  };
}