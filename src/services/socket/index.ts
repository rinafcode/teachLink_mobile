import { io, Socket } from "socket.io-client";
import logger from "../../utils/logger";
import { getEnv } from "../../config";

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      const socketUrl = getEnv("EXPO_PUBLIC_SOCKET_URL");

      this.socket = io(socketUrl, {
        transports: ["websocket"],
        autoConnect: true,
      });

      this.socket.on("connect", () => {
        logger.info("Socket connected:", this.socket?.id);
      });

      this.socket.on("disconnect", () => {
        logger.info("Socket disconnected");
      });

      this.socket.on("error", (error) => {
        logger.error("Socket error:", error);
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
}

export default new SocketService();