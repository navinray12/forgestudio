declare module "acorn" {
  export function parse(input: string, options?: any): any;
}

declare module "express-rate-limit" {
  import { RequestHandler } from "express";
  export function rateLimit(options?: any): RequestHandler;
  export default function rateLimit(options?: any): RequestHandler;
}

declare module "nodemailer" {
  export function createTransport(options?: any): any;
  export default { createTransport };
}
