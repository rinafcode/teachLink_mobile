import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import mobileAuth, { AuthUser } from '../services/mobileAuth';
import { appLogger } from '../utils/logger';

interface AuthState {
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

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
  });

  const restoreSession = async () => {
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
  };

  const login = async (credentials: { email: string; password: string; rememberMe?: boolean }) => {
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
  };

  const loginWithBiometrics = async () => {
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
  };

  const logout = async () => {
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
  };

  // Restore session on mount
  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginWithBiometrics,
        logout,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
