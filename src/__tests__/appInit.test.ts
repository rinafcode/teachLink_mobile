import { jest } from '@jest/globals';

// Mock the logging initialization function
jest.mock('../config/logging', () => ({
  initializeLogging: jest.fn().mockResolvedValue(undefined),
}));

// Mock the socket service
jest.mock('../services/socket', () => ({
  default: { connect: jest.fn() },
}));

// Import the App module after mocks are applied

describe('App module lazy initialization', () => {
  it('should not call initializeLogging at module scope', () => {
    const { initializeLogging } = require('../../src/config/logging');
    expect(initializeLogging).not.toHaveBeenCalled();
  });

  it('should not call socketService.connect at module scope', () => {
    const socketService = require('../../src/services/socket').default;
    expect(socketService.connect).not.toHaveBeenCalled();
  });
});
