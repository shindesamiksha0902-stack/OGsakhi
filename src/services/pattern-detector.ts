import { DailyLogData, CycleRecord, DetectedPatternItem, DeviationSeverity } from '@/types';
import { CycleEngine } from './cycle-engine';
import { SafetyGuard } from './safety-guard';

export class PatternDetector {
  /**
   * Evaluates logs and cycles to find statistically meaningful patterns and deviations
   */
  static analyzeUserTelemetry(
    cycles: CycleRecord[],
    logs: DailyLogData[],
    typicalCycleLength: number = 28,
    typicalPeriodLength: number = 5
  ): {
    patterns: DetectedPatternItem[];
    overallSeverity: DeviationSeverity;
    baselines: {
      avgSleep: number;
      dominantEnergy: string;
      avgHydration: number;
      topSymptoms: { name: string; count: number }[];
    };
  } {
    const patterns: DetectedPatternItem[] = [];
    const stats = CycleEngine.calculateCycleStats(cycles, typicalCycleLength, typicalPeriodLength);

    // 1. Compute Baselines from logs (past 30-90 days)
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Sleep baseline
    const sleepLogs = sortedLogs.filter((l) => typeof l.sleepHours === 'number' && l.sleepHours > 0);
    const avgSleep =
      sleepLogs.length > 0
        ? Math.round(
            (sleepLogs.reduce((acc, l) => acc + (l.sleepHours || 0), 0) / sleepLogs.length) * 10
          ) / 10
        : 7.5;

    // Hydration baseline
    const waterLogs = sortedLogs.filter(
      (l) => typeof l.waterIntakeMl === 'number' && l.waterIntakeMl > 0
    );
    const avgHydration =
      waterLogs.length > 0
        ? Math.round(waterLogs.reduce((acc, l) => acc + (l.waterIntakeMl || 0), 0) / waterLogs.length)
        : 2000;

    // Energy baseline
    const energyCounts: Record<string, number> = {};
    sortedLogs.forEach((l) => {
      if (l.energyLevel) {
        energyCounts[l.energyLevel] = (energyCounts[l.energyLevel] || 0) + 1;
      }
    });
    const dominantEnergy =
      Object.keys(energyCounts).length > 0
        ? Object.entries(energyCounts).sort((a, b) => b[1] - a[1])[0][0]
        : 'NORMAL';

    // Symptom counts
    const symptomFrequency: Record<string, number> = {};
    sortedLogs.forEach((l) => {
      l.symptoms.forEach((s) => {
        symptomFrequency[s.symptomName] = (symptomFrequency[s.symptomName] || 0) + 1;
      });
    });
    const topSymptoms = Object.entries(symptomFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 2. Cycle Length Pattern / Deviation Check
    if (cycles.length >= 2) {
      if (stats.cycleVariationDays > 6) {
        patterns.push({
          id: 'cycle-variability',
          category: 'CYCLE',
          title: 'Cycle Variation Observed',
          observation: `Your cycle lengths vary by approximately ±${stats.cycleVariationDays} days. Cycles often adapt to stress, sleep, and lifestyle changes.`,
          severity: stats.cycleVariationDays > 10 ? 'CONSIDER_CHECKING' : 'NOTICE',
          detectedAt: new Date().toISOString(),
          isActive: true,
        });
      }

      if (stats.currentCycleDay > stats.averageCycleLength + 6) {
        const diff = stats.currentCycleDay - stats.averageCycleLength;
        patterns.push({
          id: 'cycle-delayed',
          category: 'CYCLE',
          title: 'Cycle Differs From Usual Timeline',
          observation: `Your current cycle is ${diff} days beyond your typical ${stats.averageCycleLength}-day rhythm. There can be several reasons for this variation.`,
          severity: diff > 14 ? 'CONSIDER_CHECKING' : 'NOTICE',
          detectedAt: new Date().toISOString(),
          isActive: true,
        });
      }
    }

    // 3. Multi-Day Energy & Sleep Trend Check (Recent 3-7 days)
    const recentLogs = sortedLogs.slice(-5);
    const lowEnergyRecentCount = recentLogs.filter(
      (l) => l.energyLevel === 'LOW' || l.energyLevel === 'VERY_LOW'
    ).length;

    if (lowEnergyRecentCount >= 3) {
      patterns.push({
        id: 'energy-dip-recent',
        category: 'ENERGY',
        title: 'Lower Energy Pattern',
        observation:
          'Your energy has been lower than your usual baseline over the past few days. This can often coincide with sleep shifts or luteal phase changes.',
        severity: 'NOTICE',
        detectedAt: new Date().toISOString(),
        isActive: true,
      });
    }

    const recentSleepLogs = recentLogs.filter(
      (l) => typeof l.sleepHours === 'number' && l.sleepHours > 0
    );
    if (recentSleepLogs.length >= 3) {
      const recentAvgSleep =
        recentSleepLogs.reduce((acc, l) => acc + (l.sleepHours || 0), 0) / recentSleepLogs.length;
      if (avgSleep - recentAvgSleep >= 1.5) {
        patterns.push({
          id: 'sleep-duration-drop',
          category: 'LIFESTYLE',
          title: 'Recent Sleep Variation',
          observation: `Your sleep has averaged ${Math.round(recentAvgSleep * 10) / 10} hours recently, which is about ${(Math.round((avgSleep - recentAvgSleep) * 10) / 10).toFixed(1)} hours below your usual baseline.`,
          severity: 'NOTICE',
          detectedAt: new Date().toISOString(),
          isActive: true,
        });
      }
    }

    // 4. Symptom-Phase Correlations (e.g. Luteal Phase Bloating or Headaches)
    // Group logs by cycle phase
    const lutealLogs = sortedLogs.filter((l) => {
      const matchingCycle = cycles.find((c) => {
        const start = new Date(c.startDate).getTime();
        const cur = new Date(l.date).getTime();
        return cur >= start && (!c.cycleEndDate || cur <= new Date(c.cycleEndDate).getTime());
      });
      if (!matchingCycle) return false;
      const day = Math.floor(
        (new Date(l.date).getTime() - new Date(matchingCycle.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
      return CycleEngine.determinePhase(day, stats.averageCycleLength, stats.averagePeriodLength) === 'Luteal';
    });

    const lutealHeadaches = lutealLogs.filter((l) =>
      l.symptoms.some((s) => s.symptomName.toLowerCase().includes('headache'))
    ).length;

    if (lutealHeadaches >= 2) {
      patterns.push({
        id: 'luteal-headache-correlation',
        category: 'SYMPTOM',
        title: 'Recurring Pre-Period Headaches',
        observation:
          'Headaches have appeared around a similar stage of your cycle in several recent cycles, typically in the days leading up to your period.',
        severity: 'NORMAL',
        detectedAt: new Date().toISOString(),
        isActive: true,
      });
    }

    const lutealBloating = lutealLogs.filter((l) =>
      l.symptoms.some((s) => s.symptomName.toLowerCase().includes('bloating'))
    ).length;

    if (lutealBloating >= 2) {
      patterns.push({
        id: 'luteal-bloating-correlation',
        category: 'SYMPTOM',
        title: 'Luteal Phase Bloating Pattern',
        observation:
          'You often report bloating during the luteal phase. Progesterone changes during this window frequently impact digestion and fluid retention.',
        severity: 'NORMAL',
        detectedAt: new Date().toISOString(),
        isActive: true,
      });
    }

    // 5. Hydration & Headache Co-occurrence
    const lowWaterHeadaches = sortedLogs.filter(
      (l) =>
        (l.waterIntakeMl || 0) < 1400 &&
        l.symptoms.some((s) => s.symptomName.toLowerCase().includes('headache'))
    ).length;

    if (lowWaterHeadaches >= 2) {
      patterns.push({
        id: 'hydration-headache-relation',
        category: 'LIFESTYLE',
        title: 'Hydration & Headaches Tendency',
        observation:
          'You tend to log headaches more often on days when your recorded water intake is lower than your usual goal.',
        severity: 'NORMAL',
        detectedAt: new Date().toISOString(),
        isActive: true,
      });
    }

    // Overall severity derivation
    const overallSeverity: DeviationSeverity = patterns.some((p) => p.severity === 'CONSIDER_CHECKING')
      ? 'CONSIDER_CHECKING'
      : patterns.some((p) => p.severity === 'NOTICE')
      ? 'NOTICE'
      : 'NORMAL';

    return {
      patterns,
      overallSeverity,
      baselines: {
        avgSleep,
        dominantEnergy,
        avgHydration,
        topSymptoms,
      },
    };
  }
}
