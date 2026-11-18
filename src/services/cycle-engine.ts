import {
  CycleRecord,
  CyclePhase,
  CycleStats,
  FuturePeriodPrediction,
  DailyLogData,
  DailyRhythmGoal,
  BloodPressureLog,
  ReminderSettings,
} from '@/types';
import { daysBetween, toISODate, addDaysToDate } from '@/lib/date-utils';

export class CycleEngine {
  /**
   * Calculates dynamic statistics based on cycle history and user's baseline
   */
  static calculateCycleStats(
    cycles: CycleRecord[],
    baselineCycleLength: number = 28,
    baselinePeriodLength: number = 5,
    todayStr: string = toISODate(new Date())
  ): CycleStats {
    const sortedCycles = [...cycles].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    // Completed cycles with valid lengths
    const completedCycles = sortedCycles.filter(
      (c) => c.lengthDays && c.lengthDays >= 18 && c.lengthDays <= 55
    );

    // Average cycle length calculation (learned from user history)
    let avgCycleLength = baselineCycleLength;
    if (completedCycles.length > 0) {
      const sum = completedCycles.reduce((acc, c) => acc + (c.lengthDays || 0), 0);
      avgCycleLength = Math.round(sum / completedCycles.length);
    }

    // Average period length calculation
    let avgPeriodLength = baselinePeriodLength;
    const cyclesWithPeriod = sortedCycles.filter(
      (c) => c.periodDays && c.periodDays >= 2 && c.periodDays <= 12
    );
    if (cyclesWithPeriod.length > 0) {
      const sum = cyclesWithPeriod.reduce((acc, c) => acc + (c.periodDays || 0), 0);
      avgPeriodLength = Math.round(sum / cyclesWithPeriod.length);
    }

    // Cycle variation (standard deviation of lengths)
    let cycleVariationDays = 0;
    if (completedCycles.length >= 2) {
      const variance =
        completedCycles.reduce(
          (acc, c) => acc + Math.pow((c.lengthDays || avgCycleLength) - avgCycleLength, 2),
          0
        ) / completedCycles.length;
      cycleVariationDays = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    // Current active cycle
    const latestCycle = sortedCycles[0];
    let currentCycleDay = 1;
    let daysUntilNextPeriod = avgCycleLength;
    let estimatedNextPeriodDate = addDaysToDate(todayStr, avgCycleLength);
    const latestStartDate = latestCycle ? latestCycle.startDate : todayStr;

    if (latestCycle) {
      const daysSinceStart = daysBetween(latestCycle.startDate, todayStr);
      currentCycleDay = Math.max(1, daysSinceStart + 1);

      // Estimated next period start
      estimatedNextPeriodDate = addDaysToDate(latestCycle.startDate, avgCycleLength);
      daysUntilNextPeriod = daysBetween(todayStr, estimatedNextPeriodDate);
    }

    // Determine current phase based on cycle length and current day
    const currentPhase = this.determinePhase(currentCycleDay, avgCycleLength, avgPeriodLength);

    // Current cycle ovulation & fertile window
    const currentOvulationDate = addDaysToDate(latestStartDate, Math.max(1, avgCycleLength - 14));
    const currentFertileWindow = {
      start: addDaysToDate(currentOvulationDate, -5),
      end: addDaysToDate(currentOvulationDate, 1),
    };

    // Confidence score based on cycle consistency & number of tracked cycles
    let confidenceScore = 68;
    if (completedCycles.length >= 1) confidenceScore += 10;
    if (completedCycles.length >= 3) confidenceScore += 12;
    if (cycleVariationDays <= 1.5) confidenceScore += 8;
    else if (cycleVariationDays > 5) confidenceScore -= 18;
    confidenceScore = Math.max(40, Math.min(98, confidenceScore));

    // For future forecasts: always start with estimatedNextPeriodDate (the actual next cycle)
    // Only advance if data is extremely old (> 60 days in past, e.g. multi-month hiatus)
    let firstForecastDate = estimatedNextPeriodDate;
    if (daysBetween(todayStr, firstForecastDate) < -60) {
      while (daysBetween(todayStr, firstForecastDate) < -30) {
        firstForecastDate = addDaysToDate(firstForecastDate, avgCycleLength);
      }
    }

    // Forecast next 3 cycles so user sees the delayed/pending cycle plus the upcoming 2 future cycles
    const forecasts = this.generateForecasts(
      firstForecastDate,
      avgCycleLength,
      avgPeriodLength,
      cycleVariationDays,
      3
    );

    return {
      currentCycleDay,
      currentPhase,
      daysUntilNextPeriod,
      estimatedNextPeriodDate,
      averageCycleLength: avgCycleLength,
      averagePeriodLength: avgPeriodLength,
      cycleVariationDays,
      totalCyclesTracked: cycles.length,
      confidenceScore,
      ovulationDate: currentOvulationDate,
      fertileWindow: currentFertileWindow,
      forecasts,
    };
  }

  /**
   * Generates future cycles predictions (next 2 cycles)
   */
  static generateForecasts(
    firstForecastStartDate: string,
    avgCycleLength: number,
    avgPeriodLength: number,
    cycleVariationDays: number,
    count: number = 2
  ): FuturePeriodPrediction[] {
    const forecasts: FuturePeriodPrediction[] = [];
    let currentStart = firstForecastStartDate;

    for (let i = 1; i <= count; i++) {
      const endDate = addDaysToDate(currentStart, avgPeriodLength - 1);
      const ovulationDate = addDaysToDate(currentStart, Math.max(1, avgCycleLength - 14));
      const fertileWindow = {
        start: addDaysToDate(ovulationDate, -5),
        end: addDaysToDate(ovulationDate, 1),
      };
      const pmsWindow = {
        start: addDaysToDate(currentStart, -5),
        end: addDaysToDate(currentStart, -1),
      };

      const stepPenalty = (i - 1) * 6 + (cycleVariationDays > 3 ? (i - 1) * 5 : 0);
      const confidence = Math.max(50, 92 - stepPenalty);

      forecasts.push({
        cycleNumber: i,
        startDate: currentStart,
        endDate,
        ovulationDate,
        fertileWindow,
        pmsWindow,
        confidence,
      });

      currentStart = addDaysToDate(currentStart, avgCycleLength);
    }

    return forecasts;
  }

  /**
   * Studies recent logged data (past 1-3 days) and formulates sorted, simple daily goals
   */
  /**
   * Studies recent logged data (past 1-3 days + today's live telemetry + BP)
   * and formulates sorted, simple daily goals that adapt dynamically as data is logged.
   */
  static generateDailyRhythmGoals(
    recentLogs: DailyLogData[],
    phase: CyclePhase,
    bpLogs: BloodPressureLog[] = [],
    settings?: ReminderSettings
  ): DailyRhythmGoal[] {
    const goals: DailyRhythmGoal[] = [];
    const todayStr = toISODate(new Date());

    // Separate today's check-in from prior historical logs
    const todayLog = recentLogs.find((l) => l.date === todayStr);
    const pastLogs = recentLogs
      .filter((l) => l.date !== todayStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const yesterday = pastLogs[0]; // Previous day
    const pastThreeDays = pastLogs.slice(0, 3);
    const recentBp = bpLogs.slice(0, 3);
    const todayBp = bpLogs.find((b) => b.date === todayStr);

    // User customized wellness targets (with safe, gentle defaults)
    const targetSleepHours = settings?.targetSleepHours ?? 7.5;
    const targetWaterMl = settings?.targetWaterMl ?? 2000;
    const activityStyle = settings?.activityStyle ?? 'gentle';

    // ─── 1. REST & RECOVERY (Conditional 1st priority when cramps, fatigue, or heavy flow logged) ───
    const severeCramps = (todayLog?.crampSeverity ?? 0) >= 3;
    const heavyFlow = todayLog?.flowIntensity === 'HEAVY';
    const reportedFatigue =
      todayLog?.symptoms?.some((s) => /fatigue|exhaust|tired|letharg|weak/i.test(s.symptomName)) ||
      pastThreeDays.some((l) => l.symptoms?.some((s) => /fatigue|exhaust/i.test(s.symptomName)));

    if (severeCramps) {
      goals.push({
        id: 'goal-rest-cramps',
        category: 'rest',
        icon: '🪷',
        tag: 'Rest & Recovery',
        title: 'Warm compress & restorative rest',
        reason: 'Elevated cramps recorded today. A warm compress or resting with feet elevated may offer soothing comfort.',
      });
    } else if (heavyFlow || reportedFatigue) {
      goals.push({
        id: 'goal-rest-fatigue',
        category: 'rest',
        icon: '🌿',
        tag: 'Rest & Recovery',
        title: 'Allow yourself an unhurried rest pause',
        reason: heavyFlow
          ? 'Heavier flow noted today. Honor your body’s natural rhythm and allow space for unhurried rest.'
          : 'Fatigue noted in your recent logs. Give yourself permission to pause and take things at a gentle tempo.',
      });
    }

    // ─── 2. SLEEP & REST ROUTINES (Adapts to recent sleep quality, duration, and target) ───
    const validSleepLogs = [todayLog, ...pastThreeDays].filter(
      (l): l is DailyLogData => typeof l?.sleepHours === 'number' && l.sleepHours > 0
    );
    const avgSleep =
      validSleepLogs.length > 0
        ? validSleepLogs.reduce((acc, l) => acc + (l.sleepHours || 0), 0) / validSleepLogs.length
        : targetSleepHours;

    const hadPoorSleep =
      (todayLog?.sleepHours !== undefined && todayLog?.sleepHours !== null && todayLog.sleepHours < 6.5) ||
      (todayLog?.sleepQuality !== undefined && todayLog?.sleepQuality !== null && todayLog.sleepQuality <= 2) ||
      avgSleep < 6.5 ||
      pastThreeDays.some((l) => (l.sleepQuality && l.sleepQuality <= 2) || (l.sleepHours && l.sleepHours < 6));

    const todaySleepReached =
      typeof todayLog?.sleepHours === 'number' && todayLog.sleepHours >= targetSleepHours;

    if (todaySleepReached) {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: `Target rest logged (${todayLog!.sleepHours} hrs)`,
        reason: 'Restorative rest logged! Maintain a screen-free wind-down routine tonight.',
        completed: true,
      });
    } else if (hadPoorSleep) {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: 'Consistent, screen-free wind-down',
        reason: 'You reported poor sleep recently. Consider maintaining a consistent bedtime tonight.',
      });
    } else {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: `Aim for ${targetSleepHours}+ hrs quality rest`,
        reason: 'Consistent, restful sleep supports mental clarity and steady vitality.',
      });
    }

    // ─── 3. HYDRATION (Adapts to target, intake, and headache correlations) ───
    const todayWater = todayLog?.waterIntakeMl ?? 0;
    const hadRecentHeadache =
      todayLog?.symptoms?.some((s) => s.symptomName.toLowerCase().includes('headache')) ||
      pastThreeDays.some((l) =>
        l.symptoms?.some((s) => s.symptomName.toLowerCase().includes('headache'))
      );

    if (todayWater >= targetWaterMl) {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: `Hydration goal reached (${todayWater} ml)`,
        reason: 'Great job keeping your body refreshed and well hydrated today.',
        completed: true,
      });
    } else if (hadRecentHeadache && todayWater < Math.min(1500, targetWaterMl)) {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration & Relief',
        title: 'Sip water regularly to ease tension',
        reason: 'You logged a headache recently and lower water intake today. Drinking water steadily may help ease tension.',
      });
    } else if (todayWater > 0) {
      const remaining = Math.max(250, targetWaterMl - todayWater);
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: `Drink ~${remaining} ml more water today`,
        reason: `${todayWater} ml logged today — reaching your ${targetWaterMl} ml target helps prevent fatigue and keeps energy steady.`,
      });
    } else if ((yesterday?.waterIntakeMl ?? targetWaterMl) < targetWaterMl - 400) {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: `Target ${targetWaterMl} ml steady intake`,
        reason: 'Hydration was below target yesterday. Starting your day with water refreshes vitality and eases physical tension.',
      });
    } else {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: `Keep water intake steady (~${targetWaterMl} ml)`,
        reason: 'Refreshes cellular energy, supports circulation, and balances body comfort.',
      });
    }

    // ─── 4. NUTRITION & MEAL HABITS (Adapts to meals status, pacing & energy) ───
    const isLowEnergy =
      todayLog?.energyLevel === 'LOW' ||
      todayLog?.energyLevel === 'VERY_LOW' ||
      yesterday?.energyLevel === 'LOW' ||
      yesterday?.energyLevel === 'VERY_LOW';

    const skippedOrDelayedMeal =
      todayLog?.mealsStatus === 'SKIPPED' || todayLog?.mealsStatus === 'DELAYED';

    if (skippedOrDelayedMeal && isLowEnergy) {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Nourishment',
        title: 'Have a light, wholesome snack',
        reason: 'Low energy and skipped meals can reinforce each other. Consider having a light, nourishing snack to steady your pace.',
      });
    } else if (todayLog?.mealsStatus === 'ON_TIME') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meals On Track',
        title: 'Meals on schedule today',
        reason: 'Regular meals logged on time! Keeping regular intervals supports steady energy.',
        completed: true,
      });
    } else if (todayLog?.mealsStatus === 'SKIPPED') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meal Alert',
        title: 'Nourish with a wholesome snack',
        reason: 'Skipped a meal earlier — pausing for a light bite helps prevent an afternoon energy slump.',
      });
    } else if (todayLog?.mealsStatus === 'DELAYED') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meal Pacing',
        title: 'Enjoy dinner at a regular time tonight',
        reason: 'Lunch was delayed today. Keeping regular meal intervals helps support restorative sleep.',
      });
    } else if (
      yesterday?.mealsStatus === 'SKIPPED' ||
      yesterday?.mealsStatus === 'DELAYED'
    ) {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Steady Meals',
        title: 'Enjoy steady, unhurried meals today',
        reason: 'Meals were irregular yesterday — consistent intervals help sustain even energy and comfort.',
      });
    } else {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Nourishment',
        title: 'Enjoy steady, balanced meals',
        reason: 'Consistent meals with whole foods and fiber support steady energy throughout your day.',
      });
    }

    // ─── 5. GENTLE PHYSICAL ACTIVITY & BP / CIRCULATION ───
    const todayDizzyOrLowBp =
      todayBp &&
      (todayBp.symptoms.includes('Dizzy / Lightheaded') ||
        todayBp.systolic < 100 ||
        todayBp.feltFluctuations);

    const recentDizzyOrLowBp = recentBp.some(
      (b) =>
        b.symptoms.includes('Dizzy / Lightheaded') ||
        b.symptoms.includes('Zone out / Brain fog') ||
        b.systolic < 100 ||
        b.feltFluctuations
    );

    const todayExercised = (todayLog?.exerciseMinutes ?? 0) >= 15;

    if (todayLog?.energyLevel === 'LOW' || todayLog?.energyLevel === 'VERY_LOW') {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🪷',
        tag: 'Gentle Pacing',
        title: 'Take a lighter approach to activities',
        reason: 'You have logged low energy today. Consider taking a lighter approach to your activities and allowing gentle recovery.',
      });
    } else if (todayDizzyOrLowBp) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🪑',
        tag: 'Movement & BP',
        title: 'Rise slowly & do light calf pumps',
        reason: `Logged ${todayBp.systolic}/${todayBp.diastolic} mmHg with dizziness — gentle leg flexing pumps blood back up safely.`,
      });
    } else if (todayExercised) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🚶‍♀️',
        tag: 'Movement Done',
        title: `${todayLog!.exerciseMinutes} min movement completed`,
        reason: 'Movement logged today! Healthy circulation and endorphin boost achieved.',
        completed: true,
      });
    } else if (recentDizzyOrLowBp) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🚶‍♀️',
        tag: 'Gentle Walk',
        title: '10–15 min gentle walk or stretch',
        reason: 'Recent low pressure dips noted — light, unhurried movement improves venous return and balances BP.',
      });
    } else {
      const movementTitle =
        activityStyle === 'restorative'
          ? 'Gentle stretching or restorative yoga'
          : activityStyle === 'moderate'
          ? '20–30 min moderate walk or movement'
          : 'Light movement to boost stamina';

      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '✨',
        tag: activityStyle === 'restorative' ? 'Mindful Flow' : 'Movement',
        title: movementTitle,
        reason: 'Encourages healthy circulation, eases muscle stiffness, and lifts mood naturally.',
      });
    }

    // ─── 6. STRESS MANAGEMENT & MOOD ("STAY CALM") ───
    const highStressCount = [todayLog, ...pastThreeDays].filter(
      (l) => l && ((l.stressLevel || 0) >= 4 || ['Stressed', 'Anxious', 'Irritated'].includes(l.moodPrimary || ''))
    ).length;

    const todayHighStress =
      todayLog &&
      ((todayLog.stressLevel || 0) >= 3 ||
        ['Stressed', 'Anxious', 'Irritated', 'Low'].includes(todayLog.moodPrimary || ''));

    const todayCalm =
      todayLog &&
      (todayLog.moodPrimary === 'Calm' || todayLog.moodPrimary === 'Happy') &&
      (todayLog.stressLevel || 0) <= 2;

    if (highStressCount >= 2) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '🧘',
        tag: 'Stress Reset',
        title: 'Take a 5-min quiet breathing pause',
        reason: 'Stress has been elevated recently. A short walk or breathing exercise may help reset your pace.',
      });
    } else if (todayHighStress) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '🧘',
        tag: 'Mindful Pause',
        title: 'Pause for 5 slow, deep breaths',
        reason: 'Stress was logged as elevated today — gentle deep breathing resets your nervous system.',
      });
    } else if (todayCalm) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '😌',
        tag: 'Calm & Grounded',
        title: 'Protect your peace & calm',
        reason: 'Calm and grounded state logged today! Enjoy this steady, peaceful flow.',
        completed: true,
      });
    } else {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '😌',
        tag: 'Mindful Pace',
        title: 'Protect your peace & calm',
        reason: 'Taking short pauses throughout the day maintains emotional clarity and calm.',
      });
    }

    return goals;
  }

  /**
   * Identifies biological cycle phase dynamically adapted to user cycle duration
   */
  static determinePhase(
    cycleDay: number,
    totalCycleDays: number,
    periodDuration: number
  ): CyclePhase {
    if (cycleDay <= periodDuration) {
      return 'Menstrual';
    }

    const ovulationDay = Math.max(periodDuration + 2, totalCycleDays - 14);

    if (cycleDay < ovulationDay - 1) {
      return 'Follicular';
    }

    if (cycleDay <= ovulationDay + 1) {
      return 'Ovulatory';
    }

    return 'Luteal';
  }
}
