import {
  findUserByEmailOrPhone,
  createNewUser,
} from "../repositories/signup.repository.js";
import { hashPassword } from "../utils/password.js";
import { AppError } from "../utils/app-error.js";
import type { SignupInput } from "../validators/signup.validator.js";

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

  return user;
}
