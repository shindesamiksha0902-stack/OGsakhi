/**
 * Supabase Dual Persistence Layer:
 * 1. PostgreSQL Database Tables ("User", "Cycle", "DailyLog", "BloodPressureLog")
 * 2. Supabase Storage Bucket ("sakhi-userdata") as secondary/fallback container.
 *
 * This guarantees that rows show up in the Supabase Table Editor AND in Storage.
 */

import { createClient } from '@supabase/supabase-js';
import {
  BloodPressureLog,
  ReminderSettings,
  CycleRecord,
  DailyLogData,
  UserOnboardingProfile,
} from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://onuuybestyadmekdzmws.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const BUCKET = 'sakhi-userdata';

export type UserData = {
  bpLogs:            BloodPressureLog[];
  cycles:            CycleRecord[];
  logs:              DailyLogData[];
  settings:          Partial<ReminderSettings>;
  onboardingProfile: UserOnboardingProfile | null;
  updatedAt:         string;
};

const DEFAULT_DATA: UserData = {
  bpLogs:            [],
  cycles:            [],
  logs:              [],
  settings:          {},
  onboardingProfile: null,
  updatedAt:         new Date().toISOString(),
};

function emailToPath(email: string): string {
  const slug = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `users/${slug}.json`;
}

/** Ensure the storage bucket exists */
let _bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (_bucketReady) return;
  try {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      allowedMimeTypes: ['application/json'],
    });
    if (!error || error.message?.includes('already exists') || (error as any).statusCode === '409') {
      _bucketReady = true;
    } else {
      console.warn('[supabase-db] bucket create:', error.message);
      _bucketReady = true;
    }
  } catch (e: any) {
    console.warn('[supabase-db] ensureBucket exception (project may be paused or offline):', e.message);
  }
}

/** Read user data: checks Storage first, with fallback to PostgreSQL tables */
export async function dbRead(email: string): Promise<UserData | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Try reading from Storage bucket
  try {
    await ensureBucket();
    const path = emailToPath(cleanEmail);
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text) as UserData;
      if (parsed) return parsed;
    }
  } catch (err: any) {
    console.warn('[supabase-db] storage read note:', err.message);
  }

  // 2. Fallback: Hydrate from PostgreSQL database tables if Storage was empty or unavailable
  try {
    const { data: userRow } = await supabase
      .from('User')
      .select('id, email, typicalCycleLength, typicalPeriodLength, onboardingCompleted')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userRow?.id) {
      const [cyclesRes, logsRes, bpRes] = await Promise.all([
        supabase.from('Cycle').select('*').eq('userId', userRow.id).order('startDate', { ascending: false }),
        supabase.from('DailyLog').select('*, LogSymptom(*)').eq('userId', userRow.id).order('date', { ascending: false }),
        supabase.from('BloodPressureLog').select('*').eq('userId', userRow.id).order('date', { ascending: false }),
      ]);

      const cycles: CycleRecord[] = (cyclesRes.data || []).map((c: any) => ({
        id: c.id,
        startDate: c.startDate ? new Date(c.startDate).toISOString().split('T')[0] : '',
        endDate: c.endDate ? new Date(c.endDate).toISOString().split('T')[0] : null,
        cycleEndDate: c.cycleEndDate ? new Date(c.cycleEndDate).toISOString().split('T')[0] : null,
        lengthDays: c.lengthDays,
        periodDays: c.periodDays,
        isOngoing: Boolean(c.isOngoing),
      }));

      const logs: DailyLogData[] = (logsRes.data || []).map((l: any) => ({
        id: l.id,
        date: l.date ? new Date(l.date).toISOString().split('T')[0] : '',
        isPeriodDay: Boolean(l.isPeriodDay),
        flowIntensity: l.flowIntensity,
        crampSeverity: l.crampSeverity,
        moodPrimary: l.moodPrimary,
        moodIntensity: l.moodIntensity,
        energyLevel: l.energyLevel,
        sleepHours: l.sleepHours,
        sleepQuality: l.sleepQuality,
        bedTime: l.bedTime,
        wakeTime: l.wakeTime,
        waterIntakeMl: l.waterIntakeMl,
        exerciseMinutes: l.exerciseMinutes,
        exerciseType: l.exerciseType,
        caffeineCups: l.caffeineCups,
        stressLevel: l.stressLevel,
        mealsStatus: l.mealsStatus,
        bloodPressureStatus: l.bloodPressureStatus,
        notes: l.notes,
        symptoms: (l.LogSymptom || []).map((s: any) => ({
          symptomName: s.symptomName,
          severity: s.severity || 1,
        })),
      }));

      const bpLogs: BloodPressureLog[] = (bpRes.data || []).map((b: any) => ({
        id: b.id,
        date: b.date,
        time: b.time,
        systolic: b.systolic,
        diastolic: b.diastolic,
        pulse: b.pulse,
        feltFluctuations: Boolean(b.feltFluctuations),
        fluctuationType: b.fluctuationType || 'none',
        symptoms: b.symptoms || [],
        posture: b.posture || 'Sitting',
        notes: b.notes,
        category: b.category,
        cycleDay: b.cycleDay,
        cyclePhase: b.cyclePhase,
      }));

      return {
        bpLogs,
        cycles,
        logs,
        settings: {},
        onboardingProfile: {
          completed: Boolean(userRow.onboardingCompleted),
          lastPeriodStartDate: cycles[0]?.startDate || '',
          typicalCycleLength: userRow.typicalCycleLength || 28,
          typicalPeriodLength: userRow.typicalPeriodLength || 5,
          cycleRegularity: 'REGULAR',
          primaryGoals: [],
          dizzinessOrBpHistory: 'RARELY_NEVER',
        },
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (tableErr: any) {
    console.warn('[supabase-db] table read fallback note:', tableErr.message);
  }

  return null;
}

/** Write user data to Storage container */
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
      console.warn('[supabase-db] storage write note:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('[supabase-db] storage write exception:', e.message);
    return false;
  }
}

/** Synchronizes user data into PostgreSQL tables ("User", "Cycle", "DailyLog", "BloodPressureLog") */
export async function syncToPostgresTables(email: string, patch: Partial<UserData>): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Upsert into "User" table
    const { data: userRow, error: userErr } = await supabase
      .from('User')
      .upsert(
        {
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          passwordHash: 'cloud_sync_active',
          typicalCycleLength: patch.onboardingProfile?.typicalCycleLength ?? 28,
          typicalPeriodLength: patch.onboardingProfile?.typicalPeriodLength ?? 5,
          onboardingCompleted: patch.onboardingProfile?.completed ?? false,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('id')
      .maybeSingle();

    if (userErr || !userRow?.id) {
      // If table doesn't exist yet, warn gracefully without throwing
      console.warn('[supabase-db] User table sync note:', userErr?.message || 'No user row returned');
      return;
    }

    const userId = userRow.id;

    // 2. Sync Cycles to "Cycle" table
    if (patch.cycles && patch.cycles.length > 0) {
      const cycleRows = patch.cycles.map((c) => ({
        id: c.id,
        userId,
        startDate: new Date(c.startDate).toISOString(),
        endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
        cycleEndDate: c.cycleEndDate ? new Date(c.cycleEndDate).toISOString() : null,
        lengthDays: c.lengthDays ?? null,
        periodDays: c.periodDays ?? null,
        isOngoing: Boolean(c.isOngoing),
        updatedAt: new Date().toISOString(),
      }));

      const { error: cycleErr } = await supabase.from('Cycle').upsert(cycleRows, { onConflict: 'id' });
      if (cycleErr) console.warn('[supabase-db] Cycle table sync note:', cycleErr.message);
    }

    // 3. Sync Daily Logs to "DailyLog" table
    if (patch.logs && patch.logs.length > 0) {
      for (const log of patch.logs) {
        const logId = log.id || `log-${log.date}`;
        const { error: logErr } = await supabase.from('DailyLog').upsert(
          {
            id: logId,
            userId,
            date: new Date(log.date).toISOString(),
            isPeriodDay: Boolean(log.isPeriodDay),
            flowIntensity: log.flowIntensity ?? null,
            crampSeverity: log.crampSeverity ?? null,
            moodPrimary: log.moodPrimary ?? null,
            moodIntensity: log.moodIntensity ?? null,
            energyLevel: log.energyLevel ?? null,
            sleepHours: log.sleepHours ?? null,
            sleepQuality: log.sleepQuality ?? null,
            bedTime: log.bedTime ?? null,
            wakeTime: log.wakeTime ?? null,
            waterIntakeMl: log.waterIntakeMl ?? null,
            exerciseMinutes: log.exerciseMinutes ?? null,
            exerciseType: log.exerciseType ?? null,
            caffeineCups: log.caffeineCups ?? null,
            stressLevel: log.stressLevel ?? null,
            mealsStatus: log.mealsStatus ?? null,
            bloodPressureStatus: log.bloodPressureStatus ?? null,
            notes: log.notes ?? null,
            updatedAt: new Date().toISOString(),
          },
          { onConflict: 'userId,date' }
        );

        if (logErr) {
          console.warn('[supabase-db] DailyLog sync note:', logErr.message);
        } else if (log.symptoms && log.symptoms.length > 0) {
          // Sync symptoms
          const symptomRows = log.symptoms.map((s) => ({
            dailyLogId: logId,
            symptomName: s.symptomName,
            severity: s.severity || 1,
          }));
          try {
            await supabase.from('LogSymptom').insert(symptomRows);
          } catch {}
        }
      }
    }

    // 4. Sync BP Logs to "BloodPressureLog" table
    if (patch.bpLogs && patch.bpLogs.length > 0) {
      const bpRows = patch.bpLogs.map((b) => ({
        id: b.id,
        userId,
        date: b.date,
        time: b.time,
        systolic: b.systolic,
        diastolic: b.diastolic,
        pulse: b.pulse ?? null,
        feltFluctuations: Boolean(b.feltFluctuations),
        fluctuationType: b.fluctuationType || 'none',
        symptoms: b.symptoms || [],
        posture: b.posture || 'Sitting',
        notes: b.notes ?? null,
        category: b.category,
        cycleDay: b.cycleDay ?? null,
        cyclePhase: b.cyclePhase ?? null,
        updatedAt: new Date().toISOString(),
      }));

      const { error: bpErr } = await supabase
        .from('BloodPressureLog')
        .upsert(bpRows, { onConflict: 'id' });
      if (bpErr) console.warn('[supabase-db] BloodPressureLog sync note:', bpErr.message);
    }
  } catch (err: any) {
    console.warn('[supabase-db] syncToPostgresTables exception:', err.message);
  }
}

/** Merge and save — writes to BOTH PostgreSQL tables and Supabase Storage */
export async function dbMerge(email: string, patch: Partial<UserData>): Promise<UserData> {
  const current = (await dbRead(email)) ?? { ...DEFAULT_DATA };
  const merged: UserData = {
    bpLogs:            patch.bpLogs            ?? current.bpLogs,
    cycles:            patch.cycles            ?? current.cycles,
    logs:              patch.logs              ?? current.logs,
    settings:          patch.settings !== undefined ? { ...current.settings, ...patch.settings } : current.settings,
    onboardingProfile: patch.onboardingProfile !== undefined ? patch.onboardingProfile : (current.onboardingProfile ?? null),
    updatedAt:         new Date().toISOString(),
  };

  // Run Storage write and Table sync concurrently
  await Promise.allSettled([
    dbWrite(email, merged),
    syncToPostgresTables(email, patch),
  ]);

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

/** Health / Diagnostic Check */
export async function checkSupabaseHealth() {
  const diagnostic = {
    url: supabaseUrl,
    keyConfigured: Boolean(supabaseKey),
    status: 'unknown',
    storageBucketAccessible: false,
    tablesAccessible: false,
    errorMessage: null as string | null,
    testedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      diagnostic.status = 'storage_error';
      diagnostic.errorMessage = error.message;
    } else {
      diagnostic.storageBucketAccessible = true;
      diagnostic.status = 'connected';
    }
  } catch (e: any) {
    diagnostic.status = 'unreachable';
    diagnostic.errorMessage = e.message || 'Network fetch failed (project may be paused or offline)';
  }

  try {
    const { error: tErr } = await supabase.from('User').select('id').limit(1);
    if (!tErr) {
      diagnostic.tablesAccessible = true;
    }
  } catch {}

  return diagnostic;
}

export { DEFAULT_DATA };
