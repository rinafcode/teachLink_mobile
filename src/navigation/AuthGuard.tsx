import { useRouter } from "expo-router";
import { useEffect } from "react";

import { useAuth } from "../hooks";
import { sentryContextService } from "../services/sentryContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      sentryContextService.addBreadcrumb({
        category: 'auth',
        message: 'AuthGuard: unauthenticated — redirecting to /login',
        level: 'warning',
      });
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
