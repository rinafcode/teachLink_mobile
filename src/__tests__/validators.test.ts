import {
  EMAIL_MAX_LENGTH,
  isStrongPassword,
  isValidEmail,
  isValidPhone,
} from '../utils/validators';

describe('isValidEmail', () => {
  it('accepts a standard email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('accepts unicode local parts', () => {
    expect(isValidEmail('tëst@example.com')).toBe(true);
  });

  it('rejects a value longer than the max length', () => {
    const longEmail = `${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`;
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('rejects a SQL injection style string', () => {
    expect(isValidEmail("' OR 1=1;--@x")).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('accepts a password meeting all rules', () => {
    expect(isStrongPassword('Str0ngPass')).toBe(true);
  });

  it('rejects a password below the minimum length', () => {
    expect(isStrongPassword('Ab1')).toBe(false);
  });

  it('rejects a password with no uppercase letter', () => {
    expect(isStrongPassword('str0ngpass')).toBe(false);
  });

  it('rejects a password with no digit', () => {
    expect(isStrongPassword('StrongPass')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isStrongPassword('')).toBe(false);
  });

  it('accepts a long unicode password with the required classes', () => {
    expect(isStrongPassword('Pä55word–long')).toBe(true);
  });
});

describe('isValidPhone', () => {
  it('accepts an E.164 number with country code', () => {
    expect(isValidPhone('+14155552671')).toBe(true);
  });

  it('accepts a number with separators', () => {
    expect(isValidPhone('(415) 555-2671')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidPhone('')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('rejects a value containing letters', () => {
    expect(isValidPhone('415-555-CALL')).toBe(false);
  });

  it('rejects a SQL injection style string', () => {
    expect(isValidPhone("1; DROP TABLE users")).toBe(false);
  });
});
