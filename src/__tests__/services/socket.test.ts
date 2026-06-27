import { AppState } from 'react-native';

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    io: { engine: { transport: null } },
  };
  return { io: jest.fn(() => mockSocket) };
});

jest.mock('../../../src/config', () => ({ getEnv: jest.fn(() => 'ws://localhost') }));
jest.mock('../../../src/store', () => ({
  useSocketStore: {
    getState: () => ({
      resetConnection: jest.fn(),
      setReconnectAttempts: jest.fn(),
      setConnectionFailed: jest.fn(),
    }),
  },
}));
jest.mock('../../../src/services/sync/syncEntityManager', () => ({ default: {} }));
jest.mock('../../../src/utils/logger', () => ({
  appLogger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

describe('SocketService — AppState reconnect gating (#614)', () => {
  let appStateHandler: (state: string) => void;
  let socketService: any;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (AppState.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    });

    // Re-import fresh instance
    jest.resetModules();
    jest.mock('react-native', () => ({
      AppState: { addEventListener: jest.fn() },
    }));

    const { io } = require('socket.io-client');
    mockSocket = io();
    mockSocket.connected = false;
    mockSocket.connect = jest.fn();

    const { default: service } = require('../../services/socket/index');
    socketService = service;
    (service as any).socket = mockSocket;
    (service as any).intentionalDisconnect = false;
    (service as any).isBackgrounded = false;
  });

  it('skips reconnect scheduling when backgrounded', () => {
    (socketService as any).isBackgrounded = true;
    const clearSpy = jest.spyOn(socketService as any, 'clearReconnectTimer');

    (socketService as any).scheduleReconnect();

    // clearReconnectTimer is called at the start but reconnectTimer is NOT set
    expect((socketService as any).reconnectTimer).toBeNull();
  });

  it('allows reconnect scheduling when in foreground', () => {
    jest.useFakeTimers();
    (socketService as any).isBackgrounded = false;

    (socketService as any).scheduleReconnect();

    expect((socketService as any).reconnectTimer).not.toBeNull();
    jest.useRealTimers();
  });
});
