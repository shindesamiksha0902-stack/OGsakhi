import fs from 'fs';
import path from 'path';
import {
  CycleRecord,
  DailyLogData,
  BloodPressureLog,
  UserOnboardingProfile,
  ReminderSettings,
} from '@/types';

export interface UserAccountData {
  id: string;
  email: string;
  name?: string;
  password?: string;
  onboardingProfile?: UserOnboardingProfile | null;
  cycles: CycleRecord[];
  logs: DailyLogData[];
  bpLogs: BloodPressureLog[];
  reminderSettings?: ReminderSettings;
  createdAt: string;
  updatedAt: string;
}

declare global {
  var __ogsakhi_user_db: Record<string, UserAccountData> | undefined;
}

function getStoragePath(): string {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'users-db.json');
  } catch {
    return path.join('/tmp', 'ogsakhi-users-db.json');
  }
}

const SEED_USERS: Record<string, UserAccountData> = {
  'shindesamiksha0902@gmail.com': {
    id: 'usr_samiksha',
    email: 'shindesamiksha0902@gmail.com',
    name: 'Sam',
    onboardingProfile: {
      completed: true,
      lastPeriodStartDate: '2026-08-25',
      typicalCycleLength: 30,
      typicalPeriodLength: 5,
      cycleRegularity: 'REGULAR',
      primaryGoals: ['period_prediction', 'symptoms', 'bp_dizziness'],
      dizzinessOrBpHistory: 'OCCASIONALLY',
      completedAt: '2026-09-20T10:00:00.000Z',
    },
    cycles: [
      {
        id: 'cyc_anchor_sam',
        startDate: '2026-08-25',
        endDate: '2026-08-29',
        lengthDays: 30,
        periodDays: 5,
        isOngoing: true,
      },
    ],
    logs: [],
    bpLogs: [],
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
  'sam@gmail.com': {
    id: 'usr_sam',
    email: 'sam@gmail.com',
    name: 'Sam',
    onboardingProfile: {
      completed: true,
      lastPeriodStartDate: '2026-08-25',
      typicalCycleLength: 30,
      typicalPeriodLength: 5,
      cycleRegularity: 'REGULAR',
      primaryGoals: ['period_prediction', 'symptoms', 'bp_dizziness'],
      dizzinessOrBpHistory: 'OCCASIONALLY',
      completedAt: '2026-09-20T10:00:00.000Z',
    },
    cycles: [
      {
        id: 'cyc_anchor_sam2',
        startDate: '2026-08-25',
        endDate: '2026-08-29',
        lengthDays: 30,
        periodDays: 5,
        isOngoing: true,
      },
    ],
    logs: [],
    bpLogs: [],
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  },
};

function loadDb(): Record<string, UserAccountData> {
  if (global.__ogsakhi_user_db) {
    return global.__ogsakhi_user_db;
  }

  const filePath = getStoragePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      global.__ogsakhi_user_db = JSON.parse(raw);
      // Ensure seed users exist if not overridden
      for (const [k, v] of Object.entries(SEED_USERS)) {
        if (!global.__ogsakhi_user_db![k]) {
          global.__ogsakhi_user_db![k] = v;
        }
      }
      return global.__ogsakhi_user_db!;
    }
  } catch (err) {
    console.warn('Could not read user DB from disk, starting memory cache:', err);
  }

  // Also check /tmp
  try {
    const tmpPath = path.join('/tmp', 'ogsakhi-users-db.json');
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, 'utf-8');
      global.__ogsakhi_user_db = JSON.parse(raw);
      for (const [k, v] of Object.entries(SEED_USERS)) {
        if (!global.__ogsakhi_user_db![k]) {
          global.__ogsakhi_user_db![k] = v;
        }
      }
      return global.__ogsakhi_user_db!;
    }
  } catch {}

  global.__ogsakhi_user_db = { ...SEED_USERS };
  persistDb();
  return global.__ogsakhi_user_db;
}

function persistDb() {
  const db = loadDb();
  try {
    const filePath = getStoragePath();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    try {
      fs.writeFileSync(
        path.join('/tmp', 'ogsakhi-users-db.json'),
        JSON.stringify(db, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.warn('Could not persist user DB to disk, cached in memory:', e);
    }
  }
}

export class ServerStorage {
  static normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  static getUser(email: string): UserAccountData | null {
    const db = loadDb();
    const key = this.normalizeEmail(email);
    return db[key] || null;
  }

  static registerUser(
    email: string,
    password?: string,
    name?: string
  ): { user: UserAccountData | null; error?: string } {
    const db = loadDb();
    const key = this.normalizeEmail(email);

    if (db[key]) {
      return { user: null, error: 'Account already exists with this email' };
    }

    const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const user: UserAccountData = {
      id: newId,
      email: key,
      name: name || key.split('@')[0],
      password,
      onboardingProfile: null,
      cycles: [],
      logs: [],
      bpLogs: [],
      createdAt: now,
      updatedAt: now,
    };

    db[key] = user;
    persistDb();
    return { user };
  }

  static authenticateUser(
    email: string,
    password?: string
  ): { user: UserAccountData | null; error?: string } {
    const db = loadDb();
    const key = this.normalizeEmail(email);
    const existing = db[key];

    if (!existing) {
      return { user: null, error: 'No account found with this email' };
    }

    if (password && existing.password && existing.password !== password) {
      return { user: null, error: 'Incorrect password' };
    }

    return { user: existing };
  }

  static syncUserData(
    email: string,
    data: {
      name?: string;
      password?: string;
      onboardingProfile?: UserOnboardingProfile | null;
      cycles?: CycleRecord[];
      logs?: DailyLogData[];
      bpLogs?: BloodPressureLog[];
      reminderSettings?: ReminderSettings;
    }
  ): UserAccountData {
    const db = loadDb();
    const key = this.normalizeEmail(email);
    const now = new Date().toISOString();

    let user = db[key];
    if (!user) {
      const newId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      user = {
        id: newId,
        email: key,
        name: data.name || key.split('@')[0],
        password: data.password,
        onboardingProfile: data.onboardingProfile || null,
        cycles: data.cycles || [],
        logs: data.logs || [],
        bpLogs: data.bpLogs || [],
        reminderSettings: data.reminderSettings,
        createdAt: now,
        updatedAt: now,
      };
      db[key] = user;
    } else {
      if (data.name) user.name = data.name;
      if (data.password) user.password = data.password;

      // Merge onboarding profile if provided
      if (data.onboardingProfile) {
        user.onboardingProfile = {
          ...user.onboardingProfile,
          ...data.onboardingProfile,
        };
      }

      // Merge cycles (keyed by startDate to allow updating length, ongoing status, etc.)
      if (data.cycles && data.cycles.length > 0) {
        const cycleMap = new Map(user.cycles.map((c) => [c.startDate, c]));
        for (const cycle of data.cycles) {
          cycleMap.set(cycle.startDate, { ...cycleMap.get(cycle.startDate), ...cycle });
        }
        user.cycles = Array.from(cycleMap.values()).sort(
          (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      }

      // Merge daily logs
      if (data.logs && data.logs.length > 0) {
        const logMap = new Map(user.logs.map((l) => [l.date, l]));
        for (const log of data.logs) {
          logMap.set(log.date, { ...logMap.get(log.date), ...log });
        }
        user.logs = Array.from(logMap.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }

      // Merge BP logs
      if (data.bpLogs && data.bpLogs.length > 0) {
        const bpMap = new Map(user.bpLogs.map((b) => [b.id, b]));
        for (const bp of data.bpLogs) {
          bpMap.set(bp.id, bp);
        }
        user.bpLogs = Array.from(bpMap.values()).sort(
          (a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
        );
      }

      if (data.reminderSettings) {
        user.reminderSettings = { ...user.reminderSettings, ...data.reminderSettings };
      }

      user.updatedAt = now;
    }

    persistDb();
    return user;
  }

  static clearUserData(email: string): UserAccountData | null {
    const db = loadDb();
    const key = this.normalizeEmail(email);
    const user = db[key];
    if (user) {
      user.cycles = [];
      user.logs = [];
      user.bpLogs = [];
      user.onboardingProfile = null;
      user.updatedAt = new Date().toISOString();
      persistDb();
      return user;
    }
    return null;
  }
}
