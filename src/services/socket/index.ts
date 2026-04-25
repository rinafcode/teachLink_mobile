import { io, Socket } from "socket.io-client";
import logger from "../../utils/logger";
import { getEnv } from "../../config";

// ─── Reconnection config ──────────────────────────────────────────────────────

const RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_DELAY_MS = 1_000;      // initial delay
const RECONNECTION_DELAY_MAX_MS = 30_000; // cap at 30 s

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return this.socket;

    if (!this.socket) {
      const socketUrl = getEnv("EXPO_PUBLIC_SOCKET_URL");

      this.socket = io(socketUrl, {
        transports: ["websocket"],
        autoConnect: true,
        // ── Reconnection ──────────────────────────────────────────────────
        reconnection: true,
        reconnectionAttempts: RECONNECTION_ATTEMPTS,
        reconnectionDelay: RECONNECTION_DELAY_MS,
        reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
        randomizationFactor: 0.5, // jitter to avoid thundering herd
      });

      // ── Connection lifecycle ──────────────────────────────────────────

      this.socket.on("connect", () => {
        logger.info("Socket connected:", this.socket?.id);
      });

      this.socket.on("disconnect", (reason: string) => {
        logger.warn("Socket disconnected:", reason);
        // socket.io auto-reconnects unless the server explicitly closed it
        if (reason === "io server disconnect") {
          // Server forced disconnect — reconnect manually
          this.socket?.connect();
        }
      });

      this.socket.on("error", (error: unknown) => {
        logger.error("Socket error:", error);
      });

      // ── Reconnection listeners ────────────────────────────────────────

      this.socket.on("reconnect_attempt", (attempt: number) => {
        logger.info(`Socket reconnection attempt #${attempt}`);
      });

      this.socket.on("reconnect", (attempt: number) => {
        logger.info(`Socket reconnected after ${attempt} attempt(s)`);
      });

      this.socket.on("reconnect_error", (error: unknown) => {
        logger.warn("Socket reconnection error:", error);
      });

      this.socket.on("reconnect_failed", () => {
        logger.error(
          `Socket failed to reconnect after ${RECONNECTION_ATTEMPTS} attempts`
        );
      });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string) {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  /** Returns true when the underlying socket is currently connected. */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new SocketService();
