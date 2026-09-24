import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";

export interface PeerUser {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
}

export interface PeerState {
  socketId: string;
  user: PeerUser;
  websiteId: string;
  cursor?: { x: number; y: number };
  selectedElementId?: string | null;
  lastSeen: number;
}

interface Room {
  peers: Map<WebSocket, PeerState>;
}

const rooms = new Map<string, Room>();

const PALETTE = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function broadcastToRoom(websiteId: string, message: any, excludeWs?: WebSocket) {
  const room = rooms.get(websiteId);
  if (!room) return;
  const payload = JSON.stringify(message);

  for (const [ws, state] of room.peers.entries()) {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        console.warn(`[PresenceWS] Error sending to socket ${state.socketId}:`, err);
      }
    }
  }
}

/**
 * Initializes the WebSocket presence server mounted on the HTTP server.
 */
export function initPresenceWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url || "", `http://${request.headers.host}`);
    if (pathname === "/ws/presence" || pathname === "/ws/collaboration") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    let currentWebsiteId: string | null = null;
    let socketId = `sock_${Math.random().toString(36).slice(2, 9)}`;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case "JOIN": {
            const { websiteId, user } = msg;
            if (!websiteId || !user) return;

            currentWebsiteId = websiteId;
            if (!rooms.has(websiteId)) {
              rooms.set(websiteId, { peers: new Map() });
            }

            const room = rooms.get(websiteId)!;
            const peerColor = user.color || pickColor(user.id || user.name || socketId);
            const peerState: PeerState = {
              socketId,
              user: {
                userId: user.id || socketId,
                name: user.name || "Collaborator",
                email: user.email,
                avatar: user.avatar,
                color: peerColor,
              },
              websiteId,
              lastSeen: Date.now(),
            };

            room.peers.set(ws, peerState);

            // Send full room state to the newly joined peer
            const existingPeers = Array.from(room.peers.values()).map((p) => ({
              socketId: p.socketId,
              user: p.user,
              cursor: p.cursor,
              selectedElementId: p.selectedElementId,
            }));

            ws.send(
              JSON.stringify({
                type: "SYNC",
                selfSocketId: socketId,
                peers: existingPeers,
              })
            );

            // Broadcast join event to all other peers in the room
            broadcastToRoom(
              websiteId,
              {
                type: "PEER_JOINED",
                peer: {
                  socketId,
                  user: peerState.user,
                  selectedElementId: null,
                },
              },
              ws
            );
            break;
          }

          case "CURSOR": {
            if (!currentWebsiteId) return;
            const room = rooms.get(currentWebsiteId);
            if (!room) return;
            const peer = room.peers.get(ws);
            if (!peer) return;

            peer.cursor = msg.cursor;
            peer.lastSeen = Date.now();

            broadcastToRoom(
              currentWebsiteId,
              {
                type: "PEER_CURSOR",
                socketId,
                cursor: msg.cursor,
              },
              ws
            );
            break;
          }

          case "SELECT": {
            if (!currentWebsiteId) return;
            const room = rooms.get(currentWebsiteId);
            if (!room) return;
            const peer = room.peers.get(ws);
            if (!peer) return;

            peer.selectedElementId = msg.elementId;
            peer.lastSeen = Date.now();

            broadcastToRoom(
              currentWebsiteId,
              {
                type: "PEER_SELECT",
                socketId,
                elementId: msg.elementId,
              },
              ws
            );
            break;
          }

          case "PING": {
            if (currentWebsiteId) {
              const room = rooms.get(currentWebsiteId);
              const peer = room?.peers.get(ws);
              if (peer) peer.lastSeen = Date.now();
            }
            ws.send(JSON.stringify({ type: "PONG" }));
            break;
          }
        }
      } catch (err) {
        console.warn("[PresenceWS] Invalid message:", err);
      }
    });

    const cleanup = () => {
      if (currentWebsiteId && rooms.has(currentWebsiteId)) {
        const room = rooms.get(currentWebsiteId)!;
        room.peers.delete(ws);

        broadcastToRoom(currentWebsiteId, {
          type: "PEER_LEFT",
          socketId,
        });

        if (room.peers.size === 0) {
          rooms.delete(currentWebsiteId);
        }
      }
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  // Stale connection reaper (runs every 30s)
  const reaper = setInterval(() => {
    const now = Date.now();
    for (const [websiteId, room] of rooms.entries()) {
      for (const [ws, peer] of room.peers.entries()) {
        if (now - peer.lastSeen > 45000) {
          try {
            ws.terminate();
          } catch {}
          room.peers.delete(ws);
          broadcastToRoom(websiteId, { type: "PEER_LEFT", socketId: peer.socketId });
        }
      }
      if (room.peers.size === 0) {
        rooms.delete(websiteId);
      }
    }
  }, 30000);
  reaper.unref();

  return wss;
}

/**
 * Returns diagnostic summary of active real-time presence rooms.
 */
export function getPresenceRoomsSummary() {
  const summary: Record<string, { peerCount: number; users: string[] }> = {};
  for (const [websiteId, room] of rooms.entries()) {
    summary[websiteId] = {
      peerCount: room.peers.size,
      users: Array.from(room.peers.values()).map((p) => p.user.name),
    };
  }
  return summary;
}
