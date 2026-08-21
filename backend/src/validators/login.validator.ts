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

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or phone number is required")
    .refine(
      (value) =>
        emailSchema.safeParse(value).success ||
        phoneSchema.safeParse(value).success,
      {
        message: "Enter a valid email or phone number",
      }
    ),

  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;