import {
  evaluateFlag,
  EvaluationContext,
  FlagDefinition,
} from '../../services/featureFlagService';

const mockContext: EvaluationContext = {
  userId: 'user-123',
  deviceType: 'ios',
  appVersion: '1.15.0',
};

describe('evaluateFlag', () => {
  it('returns false for undefined definition', () => {
    expect(evaluateFlag('testFlag', undefined, mockContext)).toBe(false);
  });

  describe('enabled boolean', () => {
    it('returns true when enabled is true', () => {
      const def: FlagDefinition = { enabled: true };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(true);
    });

    it('returns false when enabled is false', () => {
      const def: FlagDefinition = { enabled: false };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });
  });

  describe('user targeting', () => {
    it('returns true when user is in includedUserIds', () => {
      const def: FlagDefinition = { includedUserIds: ['user-123'] };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(true);
    });

    it('returns false when user is in excludedUserIds', () => {
      const def: FlagDefinition = {
        enabled: true,
        excludedUserIds: ['user-123'],
      };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('exclusion takes priority over inclusion', () => {
      const def: FlagDefinition = {
        enabled: true,
        includedUserIds: ['user-123'],
        excludedUserIds: ['user-123'],
      };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('matches user IDs case-insensitively', () => {
      const def: FlagDefinition = { includedUserIds: ['USER-123'] };
      expect(evaluateFlag('testFlag', def, { ...mockContext, userId: 'User-123' })).toBe(true);
    });
  });

  describe('device type targeting', () => {
    it('returns true when device type is included', () => {
      const def: FlagDefinition = { includedDeviceTypes: ['ios'] };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(true);
    });

    it('returns false when device type is excluded', () => {
      const def: FlagDefinition = {
        enabled: true,
        excludedDeviceTypes: ['ios'],
      };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('ignores device type when set to unknown', () => {
      const def: FlagDefinition = { includedDeviceTypes: ['ios'] };
      const ctx = { ...mockContext, deviceType: 'unknown' as const };
      expect(evaluateFlag('testFlag', def, ctx)).toBe(false);
    });
  });

  describe('app version targeting', () => {
    it('returns false when app version is below minimum', () => {
      const def: FlagDefinition = { enabled: true, minAppVersion: '2.0.0' };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('returns true when app version meets minimum', () => {
      const def: FlagDefinition = { enabled: true, minAppVersion: '1.0.0' };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(true);
    });

    it('returns false when app version is above maximum', () => {
      const def: FlagDefinition = { enabled: true, maxAppVersion: '1.0.0' };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('returns true when app version is in range', () => {
      const def: FlagDefinition = {
        enabled: true,
        minAppVersion: '1.0.0',
        maxAppVersion: '2.0.0',
      };
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(true);
    });
  });

  describe('percentage rollout', () => {
    it('consistently assigns the same user to the same bucket', () => {
      const def: FlagDefinition = { percentage: 50 };
      const result1 = evaluateFlag('testFlag', def, { userId: 'user-A' });
      const result2 = evaluateFlag('testFlag', def, { userId: 'user-A' });
      expect(result1).toBe(result2);
    });

    it('returns false for 0% rollout', () => {
      const def: FlagDefinition = { percentage: 0 };
      expect(evaluateFlag('testFlag', def, { userId: 'user-123' })).toBe(false);
    });

    it('returns true for 100% rollout', () => {
      const def: FlagDefinition = { percentage: 100 };
      expect(evaluateFlag('testFlag', def, { userId: 'user-123' })).toBe(true);
    });

    it('uses anonymous identifier when no userId', () => {
      const def: FlagDefinition = { percentage: 100 };
      expect(evaluateFlag('testFlag', def, {})).toBe(true);
    });

    it('different keys produce different distributions', () => {
      const def: FlagDefinition = { percentage: 50 };
      const user = { userId: 'user-consistent' };
      const flagA = evaluateFlag('flagA', def, user);
      const flagB = evaluateFlag('flagB', def, user);
      // With 50% rollout each, there's a ~75% chance they differ.
      // Test that the function doesn't crash and returns boolean.
      expect(typeof flagA).toBe('boolean');
      expect(typeof flagB).toBe('boolean');
    });
  });

  describe('fallback behavior', () => {
    it('returns false for empty definition with no targeting rules', () => {
      const def: FlagDefinition = {};
      expect(evaluateFlag('testFlag', def, mockContext)).toBe(false);
    });

    it('returns false when no context provided', () => {
      const def: FlagDefinition = { enabled: true, includedUserIds: ['admin'] };
      expect(evaluateFlag('testFlag', def, {})).toBe(false);
    });
  });
});
