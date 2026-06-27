import { create } from 'zustand';

interface SocketState {
  reconnectAttempts: number;
  connectionFailed: boolean;
  setReconnectAttempts: (attempts: number) => void;
  setConnectionFailed: (failed: boolean) => void;
  resetConnection: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  reconnectAttempts: 0,
  connectionFailed: false,
  setReconnectAttempts: (attempts) => set({ reconnectAttempts: attempts }),
  setConnectionFailed: (failed) => set({ connectionFailed: failed }),
  resetConnection: () => set({ reconnectAttempts: 0, connectionFailed: false }),
}));
