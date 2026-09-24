import { useState, useEffect, useRef, useCallback } from "react";

export interface PresenceUser {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
}

export interface PeerItem {
  socketId: string;
  user: PresenceUser;
  cursor?: { x: number; y: number };
  selectedElementId?: string | null;
}

export function useCanvasPresence(
  websiteId: string | undefined | null,
  currentUser: { id: string; name: string; email?: string; avatar?: string } | null
) {
  const [peers, setPeers] = useState<PeerItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [peerSelections, setPeerSelections] = useState<Record<string, { elementId: string; user: PresenceUser }>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const lastCursorSentRef = useRef<number>(0);
  const lastSelectionSentRef = useRef<string | null>(null);

  // Derive WebSocket URL
  const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const parsed = new URL(apiUrl);
    const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${parsed.host}/ws/presence`;
  };

  useEffect(() => {
    if (!websiteId || !currentUser) return;

    let isMounted = true;
    let reconnectTimeout: any = null;
    let heartbeatInterval: any = null;

    const connect = () => {
      try {
        const wsUrl = getWsUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);

          // Send JOIN message
          ws.send(
            JSON.stringify({
              type: "JOIN",
              websiteId,
              user: currentUser,
            })
          );

          // Heartbeat ping
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "PING" }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case "SYNC": {
                const initialPeers: PeerItem[] = (data.peers || []).filter(
                  (p: PeerItem) => p.socketId !== data.selfSocketId
                );
                setPeers(initialPeers);

                const newSelections: Record<string, { elementId: string; user: PresenceUser }> = {};
                for (const p of initialPeers) {
                  if (p.selectedElementId) {
                    newSelections[p.selectedElementId] = { elementId: p.selectedElementId, user: p.user };
                  }
                }
                setPeerSelections(newSelections);
                break;
              }

              case "PEER_JOINED": {
                const newPeer: PeerItem = data.peer;
                setPeers((prev) => [...prev.filter((p) => p.socketId !== newPeer.socketId), newPeer]);
                break;
              }

              case "PEER_LEFT": {
                const leftSocketId = data.socketId;
                setPeers((prev) => prev.filter((p) => p.socketId !== leftSocketId));
                setPeerSelections((prev) => {
                  const next = { ...prev };
                  for (const [elId, sel] of Object.entries(next)) {
                    if (sel.user.userId === leftSocketId) {
                      delete next[elId];
                    }
                  }
                  return next;
                });
                break;
              }

              case "PEER_CURSOR": {
                const { socketId, cursor } = data;
                setPeers((prev) =>
                  prev.map((p) => (p.socketId === socketId ? { ...p, cursor } : p))
                );
                break;
              }

              case "PEER_SELECT": {
                const { socketId, elementId } = data;
                setPeers((prev) => {
                  const updated = prev.map((p) =>
                    p.socketId === socketId ? { ...p, selectedElementId: elementId } : p
                  );

                  const nextSelections: Record<string, { elementId: string; user: PresenceUser }> = {};
                  for (const p of updated) {
                    if (p.selectedElementId) {
                      nextSelections[p.selectedElementId] = { elementId: p.selectedElementId, user: p.user };
                    }
                  }
                  setPeerSelections(nextSelections);

                  return updated;
                });
                break;
              }
            }
          } catch (err) {
            console.warn("[PresenceWS] Error parsing message:", err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          clearInterval(heartbeatInterval);
          // Try reconnecting in 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        console.warn("[PresenceWS] Connection error:", err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      clearInterval(heartbeatInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [websiteId, currentUser?.id]);

  // Throttled cursor broadcast (50ms interval to prevent canvas UI lag)
  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSentRef.current < 50) return;
      lastCursorSentRef.current = now;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "CURSOR",
            cursor: { x: Math.round(x), y: Math.round(y) },
          })
        );
      }
    },
    []
  );

  // Broadcast element selection change
  const broadcastSelection = useCallback((elementId: string | null) => {
    if (lastSelectionSentRef.current === elementId) return;
    lastSelectionSentRef.current = elementId;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "SELECT",
          elementId,
        })
      );
    }
  }, []);

  return {
    peers,
    peerSelections,
    isConnected,
    broadcastCursor,
    broadcastSelection,
  };
}
