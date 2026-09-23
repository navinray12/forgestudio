import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email();

const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^\+?[1-9]\d{7,14}$/,
    "Invalid phone number"
  );

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters"),

  identifier: z
    .string()
    .trim()
    .min(1, "Email or phone number is required")
    .refine(
      (value: string) =>
        emailSchema.safeParse(value).success ||
        phoneSchema.safeParse(value).success,
      {
        message: "Enter a valid email or phone number",
      }
    ),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
