/**
 * @file HTTP infrastructure: app error. Shared request, response and error handling for the API.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  /**
   * Constructor.
   * @param message Message supplied to this operation (type: string).
   * @param statusCode Status Code supplied to this operation (type: number).
   * @param code Code supplied to this operation (type: string).
   */
  constructor(
    message: string,
    statusCode: number,
    code: string
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}