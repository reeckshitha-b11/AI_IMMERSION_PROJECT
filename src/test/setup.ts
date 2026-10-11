import '@testing-library/jest-dom/vitest';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// ── Supabase mock factory ──────────────────────────────────────
// Every test that imports App.tsx transitively imports the supabase
// client. We replace it with a mock so no network calls happen.
vi.mock('@/lib/supabase', () => {
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({
      subscription: { unsubscribe: vi.fn() },
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
    }),
  });

  const mockFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
      functions: mockFunctions,
      storage: mockStorage,
    },
  };
});
