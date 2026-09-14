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

export function isForgeMessage(data: any): data is ForgeMessage {
  return (
    Boolean(data) &&
    typeof data === "object" &&
    data.source === "FORGESTUDIO" &&
    typeof data.type === "string" &&
    typeof data.timestamp === "number"
  );
}

export function postForgeMessage<T = any>(
  targetWindow: { postMessage: (message: any, targetOrigin: string) => void },
  type: ForgeMessageType,
  payload: T,
  targetOrigin: string = "*"
): void {
  const message = createForgeMessage(type, payload);
  targetWindow.postMessage(message, targetOrigin);
}

export function subscribeToForgeMessages(
  windowObj: {
    addEventListener: (type: string, listener: (ev: any) => void) => void;
    removeEventListener: (type: string, listener: (ev: any) => void) => void;
  },
  handler: (message: ForgeMessage, event: any) => void
): () => void {
  const listener = (event: any) => {
    if (isForgeMessage(event.data)) {
      handler(event.data, event);
    }
  };

  windowObj.addEventListener("message", listener);
  return () => {
    windowObj.removeEventListener("message", listener);
  };
}
