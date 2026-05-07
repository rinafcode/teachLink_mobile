import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../hooks";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
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
