import {
  buildSanitizedApiError,
  containsUrlOrPath,
  getSafeErrorMessage,
  sanitizeErrorMessage,
} from '../errorSanitization';

const FOUR_XX = [400, 401, 403, 404, 408, 409, 422, 429];
const FIVE_XX = [500, 502, 503, 504];

const LEAKY_MESSAGES = [
  'Request failed for https://api.teachlink.com/api/users/42/profile',
  'GET /api/v1/courses/123/lessons failed with 404',
  'Error at /api/auth/login',
];

const expectNoUrl = (message: string) => {
  expect(message).not.toMatch(/https?:\/\//);
  expect(message).not.toMatch(/\/api\//);
  expect(containsUrlOrPath(message)).toBe(false);
};

describe('getSafeErrorMessage', () => {
  it.each([...FOUR_XX, ...FIVE_XX])('returns a non-empty, URL-free message for %i', status => {
    const message = getSafeErrorMessage(status);
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
    expectNoUrl(message);
  });

  it('falls back to a generic message for unknown/zero status', () => {
    expectNoUrl(getSafeErrorMessage(undefined));
    expectNoUrl(getSafeErrorMessage(0));
  });
});

describe('sanitizeErrorMessage', () => {
  it.each(LEAKY_MESSAGES)('strips URLs/paths from: %s', leaked => {
    expectNoUrl(sanitizeErrorMessage(leaked, 400));
  });

  it('passes a clean message through unchanged', () => {
    expect(sanitizeErrorMessage('Please try again later.', 500)).toBe('Please try again later.');
  });

  it('falls back to a safe message when message is empty', () => {
    expect(sanitizeErrorMessage(undefined, 404)).toBe(getSafeErrorMessage(404));
  });
});

describe('buildSanitizedApiError', () => {
  it.each([...FOUR_XX, ...FIVE_XX])('produces a URL-free payload for %i', status => {
    const error = buildSanitizedApiError(status, 'TEST_CODE');
    expect(error.status).toBe(status);
    expect(error.code).toBe('TEST_CODE');
    expectNoUrl(error.message);
  });
});
