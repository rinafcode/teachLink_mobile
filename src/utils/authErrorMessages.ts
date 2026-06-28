export const authErrorMessages: Record<string, string> = {
  invalid_grant: 'Your login session has expired. Please sign in again to continue.',
  access_denied: 'The email or password you entered is incorrect. Please try again.',
  invalid_client: 'Authentication service error. Please try again later.',
  invalid_request: 'Invalid request. Please check your input.',
  unsupported_grant_type: 'Authentication method not supported.',
  server_error: 'Server error. Please try again later.',
  // Add more as needed from backend
};

const GENERIC_AUTH_ERROR_MESSAGE =
  'Unable to sign in right now. Please check your credentials and try again.';

export const getAuthErrorMessage = (errorCode: string | undefined): string => {
  if (!errorCode) return GENERIC_AUTH_ERROR_MESSAGE;
  return authErrorMessages[errorCode] || GENERIC_AUTH_ERROR_MESSAGE;
};
