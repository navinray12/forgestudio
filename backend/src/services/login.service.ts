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
      INVALID_CREDENTIALS,
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(
      INVALID_CREDENTIALS,
      401,
      "INVALID_CREDENTIALS"
    );
  }

  if (!user.passwordHash) {
    throw new AppError(
      INVALID_CREDENTIALS,
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const passwordValid = await verifyPassword(
    input.password,
    user.passwordHash
  );

  if (!passwordValid) {
    throw new AppError(
      INVALID_CREDENTIALS,
      401,
      "INVALID_CREDENTIALS"
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