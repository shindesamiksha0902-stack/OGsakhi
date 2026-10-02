import { CycleRecord, DailyLogData, FlowIntensity, EnergyLevel, MoodPrimary } from '@/types';
import { addDaysToDate, toISODate } from './date-utils';

/**
 * Generates 3 realistic cycles with 60+ days of nuanced wellness logs
 */
export function generateRealisticDemoData(): {
  cycles: CycleRecord[];
  logs: DailyLogData[];
} {
  const today = new Date();
  const todayStr = toISODate(today);

  // We are currently on Cycle Day 18 (Luteal phase)
  // Ongoing Cycle 3: Started 17 days ago
  const cycle3Start = addDaysToDate(todayStr, -17);
  const cycle2Start = addDaysToDate(cycle3Start, -30); // 30-day length
  const cycle2End = addDaysToDate(cycle3Start, -1);
  const cycle1Start = addDaysToDate(cycle2Start, -29); // 29-day length
  const cycle1End = addDaysToDate(cycle2Start, -1);

  const cycles: CycleRecord[] = [
    {
      id: 'demo-cycle-3',
      startDate: cycle3Start,
      endDate: addDaysToDate(cycle3Start, 4),
      isOngoing: true,
      lengthDays: null,
      periodDays: 5,
    },
    {
      id: 'demo-cycle-2',
      startDate: cycle2Start,
      endDate: addDaysToDate(cycle2Start, 4),
      cycleEndDate: cycle2End,
      isOngoing: false,
      lengthDays: 30,
      periodDays: 5,
    },
    {
      id: 'demo-cycle-1',
      startDate: cycle1Start,
      endDate: addDaysToDate(cycle1Start, 4),
      cycleEndDate: cycle1End,
      isOngoing: false,
      lengthDays: 29,
      periodDays: 5,
    },
  ];

  const logs: DailyLogData[] = [];

  // Helper to generate day log
  const generateDay = (
    dateStr: string,
    cycleDay: number,
    isRecent: boolean = false
  ): DailyLogData => {
    let isPeriodDay = false;
    let flowIntensity: FlowIntensity | null = null;
    let crampSeverity: number | null = null;
    let moodPrimary: MoodPrimary = 'Calm';
    let energyLevel: EnergyLevel = 'NORMAL';
    let sleepHours = 7.5;
    let waterIntakeMl = 2100;
    let exerciseMinutes = 30;
    let exerciseType = 'Walking';
    const symptoms: { symptomName: string; severity: number }[] = [];

    // Phase 1: Menstrual (Days 1 - 5)
    if (cycleDay <= 5) {
      isPeriodDay = true;
      if (cycleDay === 1) {
        flowIntensity = 'MEDIUM';
        crampSeverity = 3;
        energyLevel = 'LOW';
        moodPrimary = 'Low';
        symptoms.push({ symptomName: 'Cramps', severity: 2 });
        symptoms.push({ symptomName: 'Fatigue', severity: 2 });
      } else if (cycleDay === 2) {
        flowIntensity = 'HEAVY';
        crampSeverity = 4;
        energyLevel = 'VERY_LOW';
        moodPrimary = 'Irritated';
        symptoms.push({ symptomName: 'Cramps', severity: 3 });
        symptoms.push({ symptomName: 'Back pain', severity: 2 });
      } else if (cycleDay === 3) {
        flowIntensity = 'MEDIUM';
        crampSeverity = 2;
        energyLevel = 'LOW';
        moodPrimary = 'Calm';
        symptoms.push({ symptomName: 'Cramps', severity: 1 });
      } else if (cycleDay === 4) {
        flowIntensity = 'LIGHT';
        crampSeverity = 1;
        energyLevel = 'NORMAL';
        moodPrimary = 'Calm';
      } else {
        flowIntensity = 'SPOTTING';
        crampSeverity = 0;
        energyLevel = 'NORMAL';
        moodPrimary = 'Happy';
      }
      sleepHours = 8.0;
      waterIntakeMl = 2200;
      exerciseMinutes = 15;
      exerciseType = 'Gentle Yoga';
    }
    // Phase 2: Follicular (Days 6 - 13)
    else if (cycleDay <= 13) {
      moodPrimary = cycleDay % 2 === 0 ? 'Happy' : 'Calm';
      energyLevel = 'HIGH';
      sleepHours = 7.8;
      waterIntakeMl = 2400;
      exerciseMinutes = 45;
      exerciseType = 'Jogging & Cardio';
    }
    // Phase 3: Ovulatory (Days 14 - 16)
    else if (cycleDay <= 16) {
      moodPrimary = 'Happy';
      energyLevel = 'VERY_HIGH';
      sleepHours = 7.5;
      waterIntakeMl = 2500;
      exerciseMinutes = 40;
      exerciseType = 'Pilates';
    }
    // Phase 4: Luteal (Days 17+)
    else {
      // Recent luteal changes for demonstration of pattern engine!
      if (isRecent) {
        // Last 3-4 days: Sleep drop and low energy pattern!
        sleepHours = 5.6;
        energyLevel = 'LOW';
        moodPrimary = 'Irritated';
        waterIntakeMl = 1200; // Low hydration triggering headache
        symptoms.push({ symptomName: 'Headache', severity: 2 });
        symptoms.push({ symptomName: 'Bloating', severity: 2 });
        exerciseMinutes = 0;
      } else {
        moodPrimary = 'Neutral';
        energyLevel = 'NORMAL';
        sleepHours = 7.0;
        waterIntakeMl = 1800;
        if (cycleDay >= 24) {
          symptoms.push({ symptomName: 'Bloating', severity: 2 });
          symptoms.push({ symptomName: 'Headache', severity: 1 });
        }
      }
    }

    return {
      date: dateStr,
      isPeriodDay,
      flowIntensity,
      crampSeverity,
      moodPrimary,
      moodIntensity: 3,
      energyLevel,
      sleepHours,
      sleepQuality: sleepHours > 7 ? 4 : 2,
      waterIntakeMl,
      exerciseMinutes,
      exerciseType,
      caffeineCups: isRecent ? 2 : 1,
      stressLevel: isRecent ? 4 : 2,
      notes: isRecent
        ? 'Feeling a bit drained after work, noticed tension headache in late afternoon.'
        : undefined,
      symptoms,
    };
  };

  // Generate logs for Cycle 1
  for (let d = 0; d < 29; d++) {
    const curDate = addDaysToDate(cycle1Start, d);
    logs.push(generateDay(curDate, d + 1, false));
  }

  // Generate logs for Cycle 2
  for (let d = 0; d < 30; d++) {
    const curDate = addDaysToDate(cycle2Start, d);
    logs.push(generateDay(curDate, d + 1, false));
  }

  // Generate logs for Ongoing Cycle 3 (up to today, day 18)
  for (let d = 0; d <= 17; d++) {
    const curDate = addDaysToDate(cycle3Start, d);
    const isRecent = d >= 14; // Last 4 days have the recent sleep drop & headache
    logs.push(generateDay(curDate, d + 1, isRecent));
  }

  return { cycles, logs };
}
