/**
 * @file Authentication: business operations and coordination with persistence or external services. File responsibility: signup service.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import {
  findUserByEmailOrPhone,
  createNewUser,
} from "./signup.repository.js";
import { hashPassword } from "./password.js";
import { AppError } from "../../platform/http/app-error.js";
import type { SignupInput } from "./signup.validator.js";

import { assignDefaultFreePlan } from "../subscriptions/subscription.service.js";

/**
 * Signup User.
 * @param input Input supplied to this operation (type: SignupInput).
 */
export async function signupUser(input: SignupInput) {
  const fullName = input.fullName.trim();
  const identifier = input.identifier.trim();

  const isEmail = identifier.includes("@");
  const normalizedIdentifier = isEmail
    ? identifier.toLowerCase()
    : identifier;

  const email = isEmail ? normalizedIdentifier : undefined;
  const phone = !isEmail ? normalizedIdentifier : undefined;

  // Check if user already exists
  const existingUser = await findUserByEmailOrPhone(email, phone);

  if (existingUser) {
    throw new AppError(
      "An account with this email or phone number already exists.",
      409,
      "USER_ALREADY_EXISTS"
    );
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const verificationMethod = isEmail ? "EMAIL" : "PHONE";

  const user = await createNewUser({
    fullName,
    email,
    phone,
    passwordHash,
    verificationMethod,
  });

  // Assign Free subscription plan to newly registered user
  try {
    await assignDefaultFreePlan(user.id);
  } catch (err) {
    console.error("Could not assign default free plan during signup:", err);
  }

  return user;
}
