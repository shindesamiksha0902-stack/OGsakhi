/**
 * Supabase Storage-based persistence.
 * Stores user data as JSON files in a Supabase Storage bucket.
 * NO SQL migration required — buckets are created automatically via the API.
 *
 * Each user gets a file: users/{email-hash}.json
 * Structure: { bpLogs, cycles, logs, settings, updatedAt }
 */

import { createClient } from '@supabase/supabase-js';
import { BloodPressureLog, ReminderSettings, CycleRecord, DailyLogData } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'sakhi-userdata';

export type UserData = {
  bpLogs:   BloodPressureLog[];
  cycles:   CycleRecord[];
  logs:     DailyLogData[];
  settings: Partial<ReminderSettings>;
  updatedAt: string;
};

const DEFAULT_DATA: UserData = {
  bpLogs:    [],
  cycles:    [],
  logs:      [],
  settings:  {},
  updatedAt: new Date().toISOString(),
};

function emailToPath(email: string): string {
  // simple slug: replace non-alphanum with underscore
  const slug = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `users/${slug}.json`;
}

/** Ensure the storage bucket exists */
let _bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (_bucketReady) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    allowedMimeTypes: ['application/json'],
  });
  // Ignore "already exists" error
  if (!error || error.message?.includes('already exists') || (error as any).statusCode === '409') {
    _bucketReady = true;
  } else {
    console.warn('[supabase-db] bucket create:', error.message);
    _bucketReady = true; // proceed anyway, bucket may already exist
  }
}

/** Read user data from storage */
export async function dbRead(email: string): Promise<UserData | null> {
  try {
    await ensureBucket();
    const path = emailToPath(email);
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    const text = await data.text();
    return JSON.parse(text) as UserData;
  } catch {
    return null;
  }
}

/** Write user data to storage */
export async function dbWrite(email: string, data: UserData): Promise<boolean> {
  try {
    await ensureBucket();
    const path = emailToPath(email);
    const blob = new Blob([JSON.stringify({ ...data, updatedAt: new Date().toISOString() })], {
      type: 'application/json',
    });
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'application/json',
    });
    if (error) {
      console.error('[supabase-db] write error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[supabase-db] write exception:', e);
    return false;
  }
}

/** Merge and save — reads current, merges, writes back */
export async function dbMerge(email: string, patch: Partial<UserData>): Promise<UserData> {
  const current = (await dbRead(email)) ?? { ...DEFAULT_DATA };
  const merged: UserData = {
    bpLogs:    patch.bpLogs    ?? current.bpLogs,
    cycles:    patch.cycles    ?? current.cycles,
    logs:      patch.logs      ?? current.logs,
    settings:  patch.settings  !== undefined ? { ...current.settings, ...patch.settings } : current.settings,
    updatedAt: new Date().toISOString(),
  };
  await dbWrite(email, merged);
  return merged;
}

/** Deduplicate BP logs by id, sorted newest first */
export function dedupeBpLogs(logs: BloodPressureLog[]): BloodPressureLog[] {
  return Array.from(new Map(logs.map((l) => [l.id, l])).values()).sort((a, b) => {
    const ta = new Date(`${a.date}T${(a.time || '00:00').replace(/\s*(am|pm)/i, '')}`).getTime();
    const tb = new Date(`${b.date}T${(b.time || '00:00').replace(/\s*(am|pm)/i, '')}`).getTime();
    return tb - ta;
  });
}

export { DEFAULT_DATA };
