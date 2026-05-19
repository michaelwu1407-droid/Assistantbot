import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom doesn't implement ResizeObserver; Radix UI scroll-area and other
// primitives call it during mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables
vi.mock('@/components/providers/conditional-clerk-provider', () => ({
  ConditionalClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Clerk hooks
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    isSignedIn: false,
    user: null,
  }),
  useAuth: () => ({
    userId: null,
    sessionId: null,
  }),
}));
