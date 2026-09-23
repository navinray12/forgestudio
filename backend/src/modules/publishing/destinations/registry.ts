/**
 * @file Publishing: module implementation. File responsibility: registry.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
import { InternalPublisher } from "./internal.publisher.js";
import { StaticExportPublisher } from "./static-export.publisher.js";
import type { DestinationPublisher, DestinationType } from "./types.js";
import { AppError } from "../../../platform/http/app-error.js";
import { requireAvailableDestination } from "./destination-availability.js";

class DestinationPublisherRegistry {
  private publishers = new Map<DestinationType, DestinationPublisher>();

  /**
   * Constructor.
   */
  constructor() {
    this.register(new InternalPublisher());
    this.register(new StaticExportPublisher());
  }

  /**
   * Register.
   * @param publisher Publisher supplied to this operation (type: DestinationPublisher).
   */
  register(publisher: DestinationPublisher) {
    this.publishers.set(publisher.destinationType, publisher);
  }

  /**
   * Get Publisher.
   * @param destinationType Destination Type supplied to this operation (type: string).
   */
  getPublisher(destinationType: string): DestinationPublisher {
    requireAvailableDestination(destinationType);
    const normType = destinationType?.toUpperCase() as DestinationType;
    const publisher = this.publishers.get(normType);
    if (!publisher) {
      throw new AppError(
        `Unsupported deployment destination type: '${destinationType}'. Supported: ${this.getSupportedDestinations().join(", ")}`,
        400,
        "UNSUPPORTED_DESTINATION"
      );
    }
    return publisher;
  }

  /**
   * Get Supported Destinations.
   */
  getSupportedDestinations(): DestinationType[] {
    return Array.from(this.publishers.keys());
  }
}

export const destinationRegistry = new DestinationPublisherRegistry();
