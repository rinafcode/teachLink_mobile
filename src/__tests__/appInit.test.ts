import { render } from '@testing-library/react-native';
import App from '../../app/_layout';
import { useAppStore } from '../store/createStore';
import { checkAuthStatus } from '../services/auth';
import { initializeSentry } from '../services/sentry';
import { setupInterceptors } from '../services/api/axios.config';

jest.mock('../services/auth');
jest.mock('../services/sentry');
jest.mock('../services/api/axios.config');

describe('App Initialization', () => {
  it('should initialize all services in the correct order', async () => {
    const callOrder = [];
    const mockStore = useAppStore.getState();

    (checkAuthStatus as jest.Mock).mockImplementation(async () => {
      callOrder.push('checkAuthStatus');
      return true;
    });

    (initializeSentry as jest.Mock).mockImplementation(() => {
      callOrder.push('initializeSentry');
    });

    (setupInterceptors as jest.Mock).mockImplementation(() => {
      callOrder.push('setupInterceptors');
    });

    render(<App />);

    expect(callOrder).toEqual([
      'initializeSentry',
      'setupInterceptors',
      'checkAuthStatus',
    ]);
  });
});