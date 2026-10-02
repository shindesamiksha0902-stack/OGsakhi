import {
  CycleRecord,
  CyclePhase,
  CycleStats,
  FuturePeriodPrediction,
  DailyLogData,
  DailyRhythmGoal,
  BloodPressureLog,
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
    bpLogs: BloodPressureLog[] = []
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

    // 1. MEALS & NUTRITION GOAL (Adapts dynamically to today's logged meal status)
    if (todayLog?.mealsStatus === 'ON_TIME') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meals On Track',
        title: 'Meals on time today',
        reason: 'You logged meals on time! Sustaining steady metabolic energy & hormonal balance',
        completed: true,
      });
    } else if (todayLog?.mealsStatus === 'SKIPPED') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meal Alert',
        title: 'Have a wholesome snack now',
        reason: 'Skipped a meal earlier today — nourish your body to prevent an energy or BP slump',
      });
    } else if (todayLog?.mealsStatus === 'DELAYED') {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meal Pacing',
        title: 'Have dinner on schedule tonight',
        reason: 'Lunch was delayed today — eating dinner on time supports restorative sleep',
      });
    } else if (
      yesterday?.mealsStatus === 'SKIPPED' ||
      yesterday?.mealsStatus === 'DELAYED' ||
      yesterday?.notes?.toLowerCase().includes('missed') ||
      yesterday?.notes?.toLowerCase().includes('skipped')
    ) {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Meals on Time',
        title: 'Have meals on schedule today',
        reason: 'Missed or delayed meals yesterday — eating on time prevents energy dips & cravings',
      });
    } else {
      goals.push({
        id: 'goal-meals',
        category: 'meals',
        icon: '🥗',
        tag: 'Nourishment',
        title: 'Enjoy steady, balanced meals',
        reason:
          phase === 'Luteal'
            ? 'Stabilizes blood sugar and progesterone as your cycle winds down'
            : 'Sustains rising energy and metabolic vitality',
      });
    }

    // 2. MOOD & STRESS ("STAY CALM") GOAL (Adapts to today's logged stress & emotions)
    const todayHighStress =
      todayLog &&
      ((todayLog.stressLevel || 0) >= 3 ||
        ['Stressed', 'Anxious', 'Irritated', 'Low'].includes(todayLog.moodPrimary || ''));

    const todayCalm =
      todayLog &&
      (todayLog.moodPrimary === 'Calm' || todayLog.moodPrimary === 'Happy') &&
      (todayLog.stressLevel || 0) <= 2;

    const yesterdayHighStress =
      yesterday &&
      ((yesterday.stressLevel && yesterday.stressLevel >= 3) ||
        ['Stressed', 'Anxious', 'Irritated', 'Low'].includes(yesterday.moodPrimary || ''));

    if (todayHighStress) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '🧘',
        tag: 'Stay Calm',
        title: 'Take a 5-min mindful pause',
        reason: 'Stress was logged as elevated today — gentle deep breathing resets your nervous system',
      });
    } else if (todayCalm) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '😌',
        tag: 'Calm & Grounded',
        title: 'Protect your peace & calm',
        reason: 'Calm mood logged today! Take a moment to appreciate this smooth flow',
        completed: true,
      });
    } else if (yesterdayHighStress) {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '🧘',
        tag: 'Stay Calm',
        title: 'Take a 5-min mindful pause',
        reason: 'Stress was elevated yesterday — gentle deep breathing resets your nervous system',
      });
    } else {
      goals.push({
        id: 'goal-mood',
        category: 'mood',
        icon: '😌',
        tag: 'Mindful Pace',
        title: 'Protect your peace & calm',
        reason: 'Maintains positive emotional clarity throughout your day',
      });
    }

    // 3. BLOOD PRESSURE & GENTLE MOVEMENT (Studied from BP telemetry + symptoms)
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

    const todayExercised = todayLog && (todayLog.exerciseMinutes || 0) >= 20;

    const hasTension =
      todayLog?.symptoms.some((s) => s.symptomName.toLowerCase().includes('headache')) ||
      pastThreeDays.some((l) =>
        l.symptoms.some(
          (s) =>
            s.symptomName.toLowerCase().includes('headache') ||
            s.symptomName.toLowerCase().includes('cramp') ||
            s.symptomName.toLowerCase().includes('back')
        )
      );

    if (todayDizzyOrLowBp) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🪑',
        tag: 'Movement & BP',
        title: 'Rise slowly & do light calf pumps',
        reason: `Logged ${todayBp.systolic}/${todayBp.diastolic} mmHg with dizziness today — gentle calf flexing pumps blood back up`,
      });
    } else if (todayExercised) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🚶‍♀️',
        tag: 'Movement Done',
        title: `${todayLog.exerciseMinutes} min movement completed`,
        reason: 'Activity logged today! Healthy circulation & endorphin boost achieved',
        completed: true,
      });
    } else if (recentDizzyOrLowBp) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🚶‍♀️',
        tag: 'Movement & BP',
        title: '15-min gentle walk or stretch',
        reason: 'Recent low pressure dips noted — light movement improves venous return & balances BP',
      });
    } else if (hasTension) {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '🚶‍♀️',
        tag: 'Movement & BP',
        title: '15-min gentle walk or stretch',
        reason: 'Improves blood flow, balances blood pressure, and relieves physical tension',
      });
    } else {
      goals.push({
        id: 'goal-bp-movement',
        category: 'movement',
        icon: '✨',
        tag: 'Movement',
        title: 'Light movement to boost stamina',
        reason: 'Encourages healthy circulation and steady hormone rhythm',
      });
    }

    // 4. HYDRATION GOAL (Adapts to today's logged water intake)
    const todayWater = todayLog?.waterIntakeMl ?? 0;
    const yesterdayWater = yesterday?.waterIntakeMl ?? 2000;

    if (todayWater >= 2000) {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: 'Drink at least 2000 ml water',
        reason: `Hydration goal reached (${todayWater} ml)! Great job keeping your body refreshed`,
        completed: true,
      });
    } else if (todayWater > 0) {
      const remaining = Math.max(250, 2000 - todayWater);
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: `Drink ${remaining} ml more water today`,
        reason: `${todayWater} ml logged so far today — reach 2000 ml to prevent headaches & energy dips`,
      });
    } else if (yesterdayWater < 1800) {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: 'Drink at least 2000 ml water',
        reason: 'Hydration fell below goal yesterday — extra water eases bloating & tension',
      });
    } else {
      goals.push({
        id: 'goal-hydration',
        category: 'hydration',
        icon: '💧',
        tag: 'Hydration Goal',
        title: 'Keep water intake steady',
        reason: 'Refreshes cellular energy and supports body temperature balance',
      });
    }

    // 5. SLEEP & RECOVERY GOAL (Adapts to last night's logged rest)
    const todaySleep = todayLog?.sleepHours;
    const shortSleepRecent =
      pastThreeDays.filter((l) => (l.sleepHours || 0) > 0 && (l.sleepHours || 0) < 6.8).length >= 1;

    if (todaySleep !== undefined && todaySleep !== null && todaySleep >= 7.5) {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: 'Maintain 7.5+ hrs quality rest',
        reason: `Great rest logged (${todaySleep} hrs)! Maintain a calming screen-free bedtime tonight`,
        completed: true,
      });
    } else if (todaySleep !== undefined && todaySleep !== null && todaySleep < 6.8) {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: 'Early screen-free wind-down (10 PM)',
        reason: `Last night's sleep was short (${todaySleep} hrs) — prioritize restorative rest tonight`,
      });
    } else if (shortSleepRecent) {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: 'Early screen-free wind-down (10 PM)',
        reason: 'Recent rest was below your 7.5 hr baseline — prioritize restorative sleep tonight',
      });
    } else {
      goals.push({
        id: 'goal-sleep',
        category: 'sleep',
        icon: '🌙',
        tag: 'Rest & Sleep',
        title: 'Maintain 7.5+ hrs quality rest',
        reason: 'Replenishes energy for tomorrow',
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
