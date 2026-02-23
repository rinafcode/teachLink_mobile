// `export {}` makes this a module file so `declare module` below is a proper
// augmentation (merged with the real lucide types) rather than an ambient
// declaration that would shadow the real package.
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_BASE_URL?: string;
      EXPO_PUBLIC_SOCKET_URL?: string;
      EXPO_PUBLIC_APP_ENV?: string;
    }
  }
}

declare module 'lucide-react-native' {
  // `color` is destructured and mapped to `stroke` inside lucide's Icon
  // component at runtime but is absent from the published LucideProps interface.
  // Declaring it here resolves the type error project-wide.
  interface LucideProps {
    color?: string;
  }
}
