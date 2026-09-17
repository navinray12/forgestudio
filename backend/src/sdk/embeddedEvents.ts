/**
 * @file Embedded Events: backend SDK integration support.
 * Navigation and conventions: docs/code-navigation/README.md.
 */
export type ForgeMessageType =
  | "FORGESTUDIO_MOUNT"
  | "FORGESTUDIO_MOUNT_ACK"
  | "FORGESTUDIO_SAVE"
  | "FORGESTUDIO_SAVE_ACK"
  | "FORGESTUDIO_PUBLISH_REQUEST"
  | "FORGESTUDIO_PUBLISH_RESPONSE"
  | "FORGESTUDIO_STATE_CHANGED"
  | "FORGESTUDIO_ERROR";

export interface ForgeMessage<T = any> {
  source: "FORGESTUDIO";
  type: ForgeMessageType;
  payload: T;
  timestamp: number;
}

export interface MountPayload {
  websiteId: string;
  theme?: "light" | "dark" | "system";
  authToken?: string;
  readOnly?: boolean;
}

export interface MountAckPayload {
  ready: boolean;
  websiteId: string;
  version?: number;
}

export interface SavePayload {
  websiteId: string;
  editorData?: any;
  savedAt?: string;
}

export interface PublishRequestPayload {
  websiteId: string;
  environment?: "PRODUCTION" | "STAGING" | "DEVELOPMENT";
  destinationType?: "INTERNAL" | "WORDPRESS" | "STATIC" | "SFTP";
  destinationRef?: string;
}

export interface StateChangedPayload {
  websiteId: string;
  isDirty: boolean;
  activePageId?: string;
  selectedElementId?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}

/**
 * Create Forge Message.
 * @param type Type supplied to this operation (type: ForgeMessageType).
 * @param payload Payload supplied to this operation (type: T).
 */
export function createForgeMessage<T = any>(
  type: ForgeMessageType,
  payload: T
): ForgeMessage<T> {
  return {
    source: "FORGESTUDIO",
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Is Forge Message.
 * @param data Data supplied to this operation (type: any).
 */
export function isForgeMessage(data: any): data is ForgeMessage {
  return (
    Boolean(data) &&
    typeof data === "object" &&
    data.source === "FORGESTUDIO" &&
    typeof data.type === "string" &&
    typeof data.timestamp === "number"
  );
}

export interface PostForgeMessageOptions {
  targetOrigin?: string;
  isDevelopmentSafe?: boolean;
}

/**
 * Validates origin against explicit allowlist.
 */
export function isValidMessageOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin || typeof origin !== "string") return false;
  return allowedOrigins.includes(origin);
}

/**
 * Dispatch postMessage with explicit targetOrigin security.
 * Wildcard '*' is strictly forbidden for production communication.
 */
export function postForgeMessage<T = any>(
  targetWindow: { postMessage: (message: any, targetOrigin: string) => void },
  type: ForgeMessageType,
  payload: T,
  targetOriginOrOptions?: string | PostForgeMessageOptions
): void {
  let targetOrigin: string | undefined;
  let isDevSafe = process.env.NODE_ENV !== "production";

  if (typeof targetOriginOrOptions === "string") {
    targetOrigin = targetOriginOrOptions;
  } else if (targetOriginOrOptions && typeof targetOriginOrOptions === "object") {
    targetOrigin = targetOriginOrOptions.targetOrigin;
    if (targetOriginOrOptions.isDevelopmentSafe !== undefined) {
      isDevSafe = targetOriginOrOptions.isDevelopmentSafe;
    }
  }

  // In production or when not explicitly dev-safe, wildcard '*' or missing origin is strictly forbidden
  if (!isDevSafe) {
    if (!targetOrigin || targetOrigin === "*") {
      throw new Error(
        `SecurityError: Explicit targetOrigin is required for production communication (${type}). Wildcard '*' is forbidden in production.`
      );
    }
  }

  const finalOrigin = targetOrigin || (isDevSafe ? "*" : "");
  if (!finalOrigin) {
    throw new Error(`SecurityError: targetOrigin must be specified for postForgeMessage.`);
  }

  const message = createForgeMessage(type, payload);
  targetWindow.postMessage(message, finalOrigin);
}

export interface SubscribeOptions {
  allowedOrigins?: string[];
  isDevelopmentSafe?: boolean;
}

/**
 * Subscribes to window message events with origin validation and envelope verification.
 * Rejects messages from disallowed origins, missing origins, or malformed payloads.
 */
export function subscribeToForgeMessages(
  windowObj: {
    addEventListener: (type: string, listener: (ev: any) => void) => void;
    removeEventListener: (type: string, listener: (ev: any) => void) => void;
  },
  handler: (message: ForgeMessage, event: any) => void,
  options?: string[] | SubscribeOptions
): () => void {
  let allowedOrigins: string[] | undefined;
  let isDevSafe = process.env.NODE_ENV !== "production";

  if (Array.isArray(options)) {
    allowedOrigins = options;
  } else if (options && typeof options === "object") {
    allowedOrigins = options.allowedOrigins;
    if (options.isDevelopmentSafe !== undefined) {
      isDevSafe = options.isDevelopmentSafe;
    }
  }

  const listener = (event: any) => {
    // 1. Envelope validation
    if (!event || !isForgeMessage(event.data)) {
      return;
    }

    // 2. Origin validation
    if (allowedOrigins && allowedOrigins.length > 0) {
      if (!isValidMessageOrigin(event.origin, allowedOrigins)) {
        return; // Reject unauthorized or missing origin
      }
    } else if (!isDevSafe) {
      // In production mode, an explicit allowedOrigins list is mandatory
      return;
    }

    handler(event.data, event);
  };

  windowObj.addEventListener("message", listener);
  return () => {
    windowObj.removeEventListener("message", listener);
  };
}
