/**
 * @file Publishing: module implementation. File responsibility: destination availability.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { AppError } from "../../../platform/http/app-error.js";

/** External destinations stay unavailable until real delivery and read-back exist.
 * @param destination Destination supplied to this operation (type: string).
 */
export function requireAvailableDestination(destination: string): void {
  if (["WORDPRESS", "SFTP"].includes(destination.toUpperCase())) {
    rejectUnavailableDestination(destination);
  }
}

/**
 * Reject Unavailable Destination.
 * @param destination Destination supplied to this operation (type: string).
 */
export function rejectUnavailableDestination(destination: string): never {
  throw new AppError(
    `${destination.toUpperCase()} publishing is unavailable until the destination adapter supports verified delivery.`,
    503,
    "DESTINATION_UNAVAILABLE",
  );
}
