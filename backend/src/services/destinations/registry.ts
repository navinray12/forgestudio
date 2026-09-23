import { InternalPublisher } from "./internal.publisher.js";
import { WordPressPublisher } from "./wordpress.publisher.js";
import { SftpPublisher } from "./sftp.publisher.js";
import { StaticExportPublisher } from "./staticExport.publisher.js";
import type { DestinationPublisher, DestinationType } from "./types.js";
import { AppError } from "../../utils/app-error.js";

class DestinationPublisherRegistry {
  private publishers = new Map<DestinationType, DestinationPublisher>();

  constructor() {
    this.register(new InternalPublisher());
    this.register(new WordPressPublisher());
    this.register(new SftpPublisher());
    this.register(new StaticExportPublisher());
  }

  register(publisher: DestinationPublisher) {
    this.publishers.set(publisher.destinationType, publisher);
  }

  getPublisher(destinationType: string): DestinationPublisher {
    const normType = destinationType?.toUpperCase() as DestinationType;
    const publisher = this.publishers.get(normType);
    if (!publisher) {
      throw new AppError(
        `Unsupported deployment destination type: '${destinationType}'. Supported: INTERNAL, WORDPRESS, SFTP, STATIC`,
        400,
        "UNSUPPORTED_DESTINATION"
      );
    }
    return publisher;
  }

  getSupportedDestinations(): DestinationType[] {
    return Array.from(this.publishers.keys());
  }
}

export const destinationRegistry = new DestinationPublisherRegistry();
