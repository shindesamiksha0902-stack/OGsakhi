import {
  CycleRecord,
  DailyLogData,
  DetectedPatternItem,
  CycleStats,
  PopupReminder,
  ReminderSettings,
  BloodPressureLog,
  UserOnboardingProfile,
} from '@/types';
import { generateRealisticDemoData } from './mock-data';
import { CycleEngine } from '@/services/cycle-engine';
import { PatternDetector } from '@/services/pattern-detector';
import { toISODate } from './date-utils';
import { generateInitialBpLogs, analyzeBloodPressure, classifyBloodPressure } from './bp-engine';
import { ServerStorage } from './server-storage';

// Global memory cache for immediate reactivity and zero-setup resilience
const memoryStore = {
  initialized: false,
  cycles: [] as CycleRecord[],
  logs: [] as DailyLogData[],
  bpLogs: [] as BloodPressureLog[],
  patterns: [] as DetectedPatternItem[],
  onboardingProfile: null as UserOnboardingProfile | null,
  baselineCycleLength: 29,
  baselinePeriodLength: 5,
  reminderSettings: {
    enablePeriodAlert: true,
    periodAlertDaysBefore: 3,
    enableOvulationAlert: true,
    enableHydrationNudge: true,
    enableDailyCheckin: true,
    dailyCheckinTime: '20:00',
  } as ReminderSettings,
};

function ensureInitialized() {
  if (!memoryStore.initialized) {
    memoryStore.cycles = [];
    memoryStore.logs = [];
    memoryStore.bpLogs = [];
    memoryStore.patterns = [];
    memoryStore.onboardingProfile = null;
    memoryStore.initialized = true;
  }
}

export class DataRepository {
  static activeUserEmail: string | null = null;

  static loadUserData(
    data: {
      cycles?: CycleRecord[];
      logs?: DailyLogData[];
      bpLogs?: BloodPressureLog[];
      onboardingProfile?: UserOnboardingProfile | null;
      reminderSettings?: ReminderSettings;
    },
    email?: string
  ) {
    ensureInitialized();
    if (email) {
      this.activeUserEmail = email;
    }
    if (data.cycles) {
      memoryStore.cycles = [...data.cycles];
    }
    if (data.logs) {
      memoryStore.logs = [...data.logs];
    }
    if (data.bpLogs) {
      memoryStore.bpLogs = [...data.bpLogs];
    }
    if (data.onboardingProfile) {
      memoryStore.onboardingProfile = data.onboardingProfile;
      if (data.onboardingProfile.typicalCycleLength && data.onboardingProfile.typicalCycleLength >= 20) {
        memoryStore.baselineCycleLength = data.onboardingProfile.typicalCycleLength;
      }
      if (data.onboardingProfile.typicalPeriodLength && data.onboardingProfile.typicalPeriodLength >= 2) {
        memoryStore.baselinePeriodLength = data.onboardingProfile.typicalPeriodLength;
      }
    }
    if (data.reminderSettings) {
      memoryStore.reminderSettings = { ...memoryStore.reminderSettings, ...data.reminderSettings };
    }
    this.refreshPatterns();
  }

  static exportCurrentData() {
    ensureInitialized();
    return {
      cycles: [...memoryStore.cycles],
      logs: [...memoryStore.logs],
      bpLogs: [...memoryStore.bpLogs],
      onboardingProfile: memoryStore.onboardingProfile,
      reminderSettings: { ...memoryStore.reminderSettings },
    };
  }

  static getCycles(): CycleRecord[] {
    ensureInitialized();
    return [...memoryStore.cycles];
  }

  static getCycleStats(): CycleStats {
    ensureInitialized();
    return CycleEngine.calculateCycleStats(
      memoryStore.cycles,
      memoryStore.baselineCycleLength,
      memoryStore.baselinePeriodLength
    );
  }

  static getLogs(): DailyLogData[] {
    ensureInitialized();
    return [...memoryStore.logs];
  }

  static persistActiveUser(
    data: {
      cycles?: CycleRecord[];
      logs?: DailyLogData[];
      bpLogs?: BloodPressureLog[];
      onboardingProfile?: UserOnboardingProfile | null;
      reminderSettings?: ReminderSettings;
    },
    overrideEmail?: string
  ) {
    const email = overrideEmail || this.activeUserEmail;
    if (email) {
      try {
        ServerStorage.syncUserData(email, data);
      } catch (err) {
        console.warn('Failed to persist active user data:', err);
      }
    }
  }

  static getLogForDate(dateStr: string): DailyLogData | null {
    ensureInitialized();
    return memoryStore.logs.find((l) => l.date === dateStr) || null;
  }

  static saveLog(logData: DailyLogData, email?: string): DailyLogData {
    ensureInitialized();
    if (email) this.activeUserEmail = email;

    const existingIndex = memoryStore.logs.findIndex((l) => l.date === logData.date);
    if (existingIndex >= 0) {
      memoryStore.logs[existingIndex] = { ...memoryStore.logs[existingIndex], ...logData };
    } else {
      memoryStore.logs.push(logData);
    }

    if (logData.isPeriodDay) {
      this.updatePeriodRecord(logData.date, email);
    }

    this.refreshPatterns();
    this.persistActiveUser(
      {
        logs: memoryStore.logs,
        cycles: memoryStore.cycles,
      },
      email
    );
    return logData;
  }

  static updatePeriodRecord(dateStr: string, email?: string) {
    ensureInitialized();
    if (email) this.activeUserEmail = email;

    const sorted = [...memoryStore.cycles].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    const latest = sorted[0];

    // If no cycle exists yet, create the active cycle from this date!
    if (!latest) {
      memoryStore.cycles.unshift({
        id: `cycle-${Date.now()}`,
        startDate: dateStr,
        periodDays: memoryStore.baselinePeriodLength || 5,
        isOngoing: true,
      });
      this.persistActiveUser({ cycles: memoryStore.cycles }, email);
      return;
    }

    const diff = Math.floor(
      (new Date(dateStr).getTime() - new Date(latest.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff > 18) {
      latest.isOngoing = false;
      latest.cycleEndDate = dateStr;
      latest.lengthDays = diff;
      memoryStore.cycles.unshift({
        id: `cycle-${Date.now()}`,
        startDate: dateStr,
        periodDays: memoryStore.baselinePeriodLength || 5,
        isOngoing: true,
      });
    } else if (diff >= 0 && diff <= 10) {
      latest.periodDays = Math.max(latest.periodDays || 1, diff + 1);
    } else if (diff < 0) {
      // Historical cycle recorded in the past
      memoryStore.cycles.push({
        id: `cycle-${Date.now()}`,
        startDate: dateStr,
        periodDays: memoryStore.baselinePeriodLength || 5,
        isOngoing: false,
      });
      memoryStore.cycles.sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    }

    this.persistActiveUser({ cycles: memoryStore.cycles }, email);
  }

  static getOnboardingProfile(): UserOnboardingProfile | null {
    ensureInitialized();
    return memoryStore.onboardingProfile;
  }

  static saveOnboardingProfile(profile: UserOnboardingProfile, email?: string) {
    ensureInitialized();
    if (email) this.activeUserEmail = email;
    memoryStore.onboardingProfile = profile;

    if (profile.typicalCycleLength && profile.typicalCycleLength >= 20) {
      memoryStore.baselineCycleLength = profile.typicalCycleLength;
    }
    if (profile.typicalPeriodLength && profile.typicalPeriodLength >= 2) {
      memoryStore.baselinePeriodLength = profile.typicalPeriodLength;
    }

    if (profile.lastPeriodStartDate) {
      this.updatePeriodRecord(profile.lastPeriodStartDate, email);

      // Ensure a log exists for that day so it appears on calendar and logs
      const existing = memoryStore.logs.find((l) => l.date === profile.lastPeriodStartDate);
      if (!existing) {
        memoryStore.logs.push({
          id: `log-${Date.now()}`,
          date: profile.lastPeriodStartDate,
          isPeriodDay: true,
          flowIntensity: 'MEDIUM',
          symptoms: [],
        });
      } else {
        existing.isPeriodDay = true;
      }
    }

    this.refreshPatterns();
    this.persistActiveUser(
      {
        onboardingProfile: profile,
        cycles: memoryStore.cycles,
        logs: memoryStore.logs,
      },
      email
    );

    return {
      success: true,
      profile: memoryStore.onboardingProfile,
      stats: this.getCycleStats(),
    };
  }

  static getPatterns() {
    ensureInitialized();
    return PatternDetector.analyzeUserTelemetry(
      memoryStore.cycles,
      memoryStore.logs,
      memoryStore.baselineCycleLength,
      memoryStore.baselinePeriodLength
    );
  }

  static refreshPatterns() {
    ensureInitialized();
    const analysis = PatternDetector.analyzeUserTelemetry(
      memoryStore.cycles,
      memoryStore.logs,
      memoryStore.baselineCycleLength,
      memoryStore.baselinePeriodLength
    );
    memoryStore.patterns = analysis.patterns;
  }

  static getReminderSettings(): ReminderSettings {
    ensureInitialized();
    return { ...memoryStore.reminderSettings };
  }

  static updateReminderSettings(settings: Partial<ReminderSettings>, email?: string): ReminderSettings {
    ensureInitialized();
    if (email) this.activeUserEmail = email;
    memoryStore.reminderSettings = { ...memoryStore.reminderSettings, ...settings };
    this.persistActiveUser({ reminderSettings: memoryStore.reminderSettings }, email);
    return { ...memoryStore.reminderSettings };
  }

  /**
   * Generates active pop-up reminders based on cycle telemetry and today's status
   */
  static getActiveReminders(): PopupReminder[] {
    ensureInitialized();
    // In clean slate (when no cycles have been logged yet), do not show artificial notification alerts
    if (memoryStore.cycles.length === 0 && !memoryStore.onboardingProfile?.completed) {
      return [];
    }

    const stats = this.getCycleStats();
    const todayStr = toISODate(new Date());
    const todayLog = this.getLogForDate(todayStr);
    const settings = memoryStore.reminderSettings;
    const reminders: PopupReminder[] = [];

    // 1. Period approaching reminder
    if (settings.enablePeriodAlert && memoryStore.cycles.length > 0) {
      if (
        stats.daysUntilNextPeriod <= settings.periodAlertDaysBefore &&
        stats.daysUntilNextPeriod >= 0
      ) {
        reminders.push({
          id: 'rem-period-approaching',
          title: 'Period Approaching Soon',
          message:
            stats.daysUntilNextPeriod === 0
              ? 'Your period is estimated to begin today. Make sure you have supplies handy and stay comfortable.'
              : `Your period is estimated to arrive in approximately ${stats.daysUntilNextPeriod} days. Stock up on supplies and prioritize rest.`,
          type: 'period',
          priority: 'high',
          timestamp: 'Just now',
          actionText: 'View Calendar',
          actionUrl: '/calendar',
        });
      }
    }

    // 2. Ovulation / Fertile window reminder
    if (settings.enableOvulationAlert && memoryStore.cycles.length > 0 && stats.currentPhase === 'Ovulatory') {
      reminders.push({
        id: 'rem-ovulation-window',
        title: 'Ovulation Window Active',
        message:
          'You are in your estimated fertile window. Energy and vibrancy are often at their highest right now.',
        type: 'ovulation',
        priority: 'medium',
        timestamp: 'Today',
        actionText: 'See Insights',
        actionUrl: '/insights',
      });
    }

    // 3. Hydration check reminder
    if (settings.enableHydrationNudge) {
      const water = todayLog?.waterIntakeMl ?? 0;
      if (water < 1500) {
        reminders.push({
          id: 'rem-hydration-boost',
          title: 'Hydration Check-in 💧',
          message: `You have logged ${water} ml of water so far today. Drinking a glass of water now supports your energy and reduces headache risk.`,
          type: 'hydration',
          priority: 'medium',
          timestamp: 'Afternoon Nudge',
          actionText: 'Log Water',
          actionUrl: '/#log',
        });
      }
    }

    // 4. Daily check-in reminder
    if (settings.enableDailyCheckin && !todayLog) {
      reminders.push({
        id: 'rem-daily-checkin',
        title: "Today's Wellness Reflection",
        message:
          'Take 30 seconds to record your mood, energy, and symptoms today to keep your cycle predictions accurate.',
        type: 'checkin',
        priority: 'low',
        timestamp: settings.dailyCheckinTime,
        actionText: 'Log Today',
        actionUrl: '/#log',
      });
    }

    // 5. Blood Pressure & Circulation Dip Alert
    if (memoryStore.bpLogs.length > 0) {
      const bpAnalysis = this.getBpAnalysis();
      if (bpAnalysis.prediction.riskLevel === 'moderate_warning' || bpAnalysis.prediction.riskLevel === 'urgent_clinical') {
        reminders.push({
          id: 'rem-bp-fluctuation-alert',
          title: 'BP Dip & Dizziness Alert ⚠️',
          message: `${bpAnalysis.prediction.headline}: ${bpAnalysis.prediction.predictedRange}. Rise slowly and hydrate with electrolytes.`,
          type: 'wellness',
          priority: 'high',
          timestamp: 'AI Vitals Advisory',
          actionText: 'Open BP Tracker',
          actionUrl: '/bp',
        });
      }
    }

    return reminders;
  }

  static getBpLogs(): BloodPressureLog[] {
    ensureInitialized();
    return [...memoryStore.bpLogs];
  }

  static addBpLog(logInput: Omit<BloodPressureLog, 'id' | 'category'>, email?: string): BloodPressureLog {
    ensureInitialized();
    if (email) this.activeUserEmail = email;

    const stats = this.getCycleStats();
    const category = classifyBloodPressure(logInput.systolic, logInput.diastolic);
    const newEntry: BloodPressureLog = {
      ...logInput,
      id: `bp-${Date.now()}`,
      category,
      cycleDay: stats.currentCycleDay,
      cyclePhase: stats.currentPhase,
    };

    // Prepend new entry
    memoryStore.bpLogs.unshift(newEntry);
    this.persistActiveUser({ bpLogs: memoryStore.bpLogs }, email);
    return newEntry;
  }

  static deleteBpLog(id: string, email?: string): boolean {
    ensureInitialized();
    if (email) this.activeUserEmail = email;

    const initialLen = memoryStore.bpLogs.length;
    memoryStore.bpLogs = memoryStore.bpLogs.filter((l) => l.id !== id);
    const changed = memoryStore.bpLogs.length < initialLen;
    if (changed) {
      this.persistActiveUser({ bpLogs: memoryStore.bpLogs }, email);
    }
    return changed;
  }

  static getBpAnalysis() {
    ensureInitialized();
    const stats = this.getCycleStats();
    return analyzeBloodPressure(memoryStore.bpLogs, stats.currentCycleDay, stats.currentPhase);
  }

  static clearAllData(email?: string) {
    const targetEmail = email || this.activeUserEmail;
    memoryStore.cycles = [];
    memoryStore.logs = [];
    memoryStore.bpLogs = [];
    memoryStore.patterns = [];
    memoryStore.onboardingProfile = null;
    memoryStore.initialized = true;

    if (targetEmail) {
      try {
        ServerStorage.clearUserData(targetEmail);
      } catch {}
    }

    return { success: true, cycles: 0, logs: 0, bpLogs: 0 };
  }

  static resetToDemoData() {
    const demo = generateRealisticDemoData();
    memoryStore.cycles = demo.cycles;
    memoryStore.logs = demo.logs;
    memoryStore.bpLogs = generateInitialBpLogs(18);
    const analysis = PatternDetector.analyzeUserTelemetry(
      demo.cycles,
      demo.logs,
      memoryStore.baselineCycleLength,
      memoryStore.baselinePeriodLength
    );
    memoryStore.patterns = analysis.patterns;
    memoryStore.initialized = true;
    return { success: true, cycles: memoryStore.cycles.length, logs: memoryStore.logs.length, bpLogs: memoryStore.bpLogs.length };
  }
}
