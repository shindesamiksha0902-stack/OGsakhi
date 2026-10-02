import {
  CycleRecord,
  DailyLogData,
  DetectedPatternItem,
  CycleStats,
  PopupReminder,
  ReminderSettings,
  BloodPressureLog,
} from '@/types';
import { generateRealisticDemoData } from './mock-data';
import { CycleEngine } from '@/services/cycle-engine';
import { PatternDetector } from '@/services/pattern-detector';
import { toISODate } from './date-utils';
import { generateInitialBpLogs, analyzeBloodPressure, classifyBloodPressure } from './bp-engine';

// Global memory cache for immediate reactivity and zero-setup resilience
const memoryStore = {
  initialized: false,
  cycles: [] as CycleRecord[],
  logs: [] as DailyLogData[],
  bpLogs: [] as BloodPressureLog[],
  patterns: [] as DetectedPatternItem[],
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
    memoryStore.initialized = true;
  }
}

export class DataRepository {
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

  static getLogForDate(dateStr: string): DailyLogData | null {
    ensureInitialized();
    return memoryStore.logs.find((l) => l.date === dateStr) || null;
  }

  static saveLog(logData: DailyLogData): DailyLogData {
    ensureInitialized();
    const existingIndex = memoryStore.logs.findIndex((l) => l.date === logData.date);
    if (existingIndex >= 0) {
      memoryStore.logs[existingIndex] = { ...memoryStore.logs[existingIndex], ...logData };
    } else {
      memoryStore.logs.push(logData);
    }

    if (logData.isPeriodDay) {
      this.updatePeriodRecord(logData.date);
    }

    this.refreshPatterns();
    return logData;
  }

  static updatePeriodRecord(dateStr: string) {
    const sorted = [...memoryStore.cycles].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    const latest = sorted[0];
    if (latest) {
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
          periodDays: 1,
          isOngoing: true,
        });
      }
    }
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

  static updateReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
    ensureInitialized();
    memoryStore.reminderSettings = { ...memoryStore.reminderSettings, ...settings };
    return { ...memoryStore.reminderSettings };
  }

  /**
   * Generates active pop-up reminders based on cycle telemetry and today's status
   */
  static getActiveReminders(): PopupReminder[] {
    ensureInitialized();
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

  static addBpLog(logInput: Omit<BloodPressureLog, 'id' | 'category'>): BloodPressureLog {
    ensureInitialized();
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
    return newEntry;
  }

  static deleteBpLog(id: string): boolean {
    ensureInitialized();
    const initialLen = memoryStore.bpLogs.length;
    memoryStore.bpLogs = memoryStore.bpLogs.filter((l) => l.id !== id);
    return memoryStore.bpLogs.length < initialLen;
  }

  static getBpAnalysis() {
    ensureInitialized();
    const stats = this.getCycleStats();
    return analyzeBloodPressure(memoryStore.bpLogs, stats.currentCycleDay, stats.currentPhase);
  }

  static clearAllData() {
    memoryStore.cycles = [];
    memoryStore.logs = [];
    memoryStore.bpLogs = [];
    memoryStore.patterns = [];
    memoryStore.initialized = true;
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
