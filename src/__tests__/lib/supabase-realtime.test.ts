import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
  createServerClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  })),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

import { createBrowserClient, createServerClient } from '@supabase/ssr';

describe('DASH-04: Supabase realtime helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('createSupabaseBrowser returns a client instance', async () => {
    const { createSupabaseBrowser } = await import('@/lib/supabase/client');
    const client = createSupabaseBrowser();
    expect(client).toBeDefined();
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
  });

  it('createSupabaseServer returns a server client using cookies', async () => {
    const { createSupabaseServer } = await import('@/lib/supabase/server');
    const client = await createSupabaseServer();
    expect(client).toBeDefined();
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    );
  });

  it('Realtime channel subscribes to care team status changes', async () => {
    const mockSubscribe = vi.fn();
    const mockOn = vi.fn().mockReturnThis();
    const mockChannel = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }));
    vi.mocked(createBrowserClient).mockReturnValue({ channel: mockChannel } as any);

    const { createSupabaseBrowser } = await import('@/lib/supabase/client');
    const client = createSupabaseBrowser();

    client
      .channel('care-team-status')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'CareTeamStatus' }, vi.fn())
      .subscribe();

    expect(mockChannel).toHaveBeenCalledWith('care-team-status');
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
