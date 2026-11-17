/**
 * Shared user-hydration helper used by all API routes.
 * Tries Supabase Storage first (Vercel-safe), falls back to ServerStorage (local dev).
 */

import { DataRepository } from '@/lib/data-repository';
import { dbRead } from '@/lib/supabase-db';

export async function hydrateUser(email: string) {
  // 1. Supabase Storage — works on Vercel
  const stored = await dbRead(email);
  if (stored) {
    DataRepository.loadUserData(
      {
        cycles:            stored.cycles            ?? [],
        logs:              stored.logs              ?? [],
        bpLogs:            stored.bpLogs            ?? [],
        onboardingProfile: stored.onboardingProfile ?? null,
        reminderSettings:  Object.keys(stored.settings ?? {}).length > 0
          ? (stored.settings as any)
          : undefined,
      },
      email
    );
    return stored;
  }

  // 2. ServerStorage — local dev fallback
  try {
    const { ServerStorage } = await import('@/lib/server-storage');
    const user = ServerStorage.getUser(email);
    if (user) DataRepository.loadUserData(user, email);
    return user;
  } catch {}

  return null;
}
