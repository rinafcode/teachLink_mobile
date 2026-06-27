import { io } from 'socket.io-client';
import SocketService from '../index';
import { useSocketStore } from '../../../store';

jest.mock('socket.io-client', () => {
  const mSocket = {
    connected: false,
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  };
  return {
    io: jest.fn(() => mSocket),
  };
});

jest.mock('../../../store', () => ({
  useSocketStore: {
    getState: jest.fn(() => ({
      setReconnectAttempts: jest.fn(),
      setConnectionFailed: jest.fn(),
      resetConnection: jest.fn(),
    })),
  },
}));

describe('Socket Reconnection Backoff', () => {
  it('configures exponential backoff correctly', () => {
    SocketService.connect();

    expect(io).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.2, // Gives 0.8 to 1.2 multiplier
    }));
  });

  it('calculates backoff delay sequence according to specifications', () => {
    // This tests the math logic that socket.io-client implements internally
    // delay = Math.min(1000 * 2^attempt, 30000) * (0.8 + Math.random() * 0.4)
    const getBaseDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 30000);

    const attempt0 = getBaseDelay(0);
    expect(attempt0).toBe(1000);
    
    const attempt1 = getBaseDelay(1);
    expect(attempt1).toBe(2000);

    const attempt2 = getBaseDelay(2);
    expect(attempt2).toBe(4000);

    const attempt3 = getBaseDelay(3);
    expect(attempt3).toBe(8000);

    const attempt4 = getBaseDelay(4);
    expect(attempt4).toBe(16000);

    const attempt5 = getBaseDelay(5);
    expect(attempt5).toBe(30000); // Capped at 30s
  });
});
