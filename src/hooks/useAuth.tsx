import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import mobileAuth, { AuthUser } from '../services/mobileAuth';
import { appLogger } from '../utils/logger';

interface AuthState {
  isOffline?: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
}

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): React.ReactElement => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  // ✅ useCallback gives each function a stable reference.
  // They only change if their own dependencies change — and since
  // they only call mobileAuth (external) and setState (stable),
  // their deps array is empty: they are created exactly once.

  const restoreSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await mobileAuth.restoreSession();

      if (result) {
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
        });
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
      }
    } catch (error) {
      appLogger.warnSync('Session restore failed', { error });
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    }
  }, []); // stable: only uses setState (stable) and mobileAuth (module-level)

  const login = useCallback(
    async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        const result = await mobileAuth.login(credentials);
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: result.user,
        });
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [] // stable: credentials come in as an argument, not a dep
  );

  const loginWithBiometrics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await mobileAuth.loginWithBiometrics();
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: result.user,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await mobileAuth.logout();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
      });
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]); // ✅ restoreSession is now stable, so this runs only once

  // ✅ useMemo now actually works: callbacks are stable references,
  // so this only re-computes when auth state (isAuthenticated, isLoading, user) changes.
  const value = useMemo(
    () => ({
      ...state,
      login,
      loginWithBiometrics,
      logout,
      restoreSession,
    }),
    [state, login, loginWithBiometrics, logout, restoreSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
