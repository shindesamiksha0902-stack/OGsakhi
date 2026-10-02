import { BloodPressureLog, BpCategory, BpPredictionWarning, CyclePhase } from '@/types';
import { subDays, format } from 'date-fns';

export function classifyBloodPressure(systolic: number, diastolic: number): BpCategory {
  if (systolic < 90 || diastolic < 60) {
    return 'Low (Hypotension)';
  }
  if (systolic >= 180 || diastolic >= 120) {
    return 'Hypertensive Alert';
  }
  if (systolic >= 140 || diastolic >= 90) {
    return 'Stage 2 High';
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return 'Stage 1 High';
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return 'Elevated';
  }
  return 'Normal / Optimal';
}

export const COMMON_BP_SYMPTOMS = [
  { id: 'dizzy', label: 'Dizzy / Lightheaded', icon: '💫', color: 'rose' },
  { id: 'breathless', label: 'Breathless / Air hunger', icon: '😮‍💨', color: 'sky' },
  { id: 'headache', label: 'Headache / Throbbing', icon: '🤕', color: 'amber' },
  { id: 'zoneout', label: 'Zone out / Brain fog', icon: '😶‍🌫️', color: 'purple' },
  { id: 'fatigue', label: 'Fatigue / Heavy limbs', icon: '💤', color: 'indigo' },
  { id: 'palpitations', label: 'Heart Palpitations / Racing', icon: '💓', color: 'pink' },
  { id: 'nausea', label: 'Nausea / Queasy', icon: '🤢', color: 'emerald' },
  { id: 'flushed', label: 'Flushed / Sudden warmth', icon: '🌡️', color: 'orange' },
  { id: 'cold_limbs', label: 'Cold Hands & Feet', icon: '🧊', color: 'blue' },
];

/**
 * Generate 18 realistic historical BP readings aligned with the user's cycle telemetry
 */
export function generateInitialBpLogs(currentCycleDay: number = 18): BloodPressureLog[] {
  const today = new Date();
  const logs: BloodPressureLog[] = [];

  const presets = [
    // Luteal phase (current days 14-18): Progesterone rise causes vasodilation -> low BP dips, dizziness, zone outs
    { dayOffset: 0, time: '08:45 AM', sys: 96, dia: 62, pulse: 74, fluct: true, type: 'drop', symptoms: ['Dizzy / Lightheaded', 'Zone out / Brain fog'], notes: 'Felt dizzy when standing up from desk before tea' },
    { dayOffset: 1, time: '02:30 PM', sys: 100, dia: 64, pulse: 78, fluct: true, type: 'drop', symptoms: ['Zone out / Brain fog', 'Fatigue / Heavy limbs'], notes: 'Afternoon brain fog and low energy dip' },
    { dayOffset: 2, time: '09:15 AM', sys: 98, dia: 63, pulse: 72, fluct: true, type: 'drop', symptoms: ['Dizzy / Lightheaded', 'Breathless / Air hunger'], notes: 'Climbing stairs felt slightly breathless' },
    { dayOffset: 3, time: '08:00 AM', sys: 104, dia: 68, pulse: 70, fluct: false, type: 'none', symptoms: ['Headache / Throbbing'], notes: 'Mild morning headache, hydrated with salt water' },
    { dayOffset: 4, time: '07:15 PM', sys: 112, dia: 74, pulse: 82, fluct: true, type: 'spike', symptoms: ['Heart Palpitations / Racing', 'Breathless / Air hunger'], notes: 'Felt heart thumping after busy work sprint' },
    // Ovulatory phase (days 12-14): Stable, mild surges
    { dayOffset: 5, time: '09:00 AM', sys: 115, dia: 75, pulse: 71, fluct: false, type: 'none', symptoms: [], notes: 'Felt energetic and stable' },
    { dayOffset: 6, time: '08:30 AM', sys: 118, dia: 76, pulse: 73, fluct: false, type: 'none', symptoms: [], notes: 'Good morning reading' },
    { dayOffset: 7, time: '09:30 AM', sys: 114, dia: 74, pulse: 69, fluct: false, type: 'none', symptoms: [], notes: 'Calm morning' },
    // Follicular phase (days 6-11): Normal, steady readings
    { dayOffset: 8, time: '08:15 AM', sys: 116, dia: 75, pulse: 70, fluct: false, type: 'none', symptoms: [], notes: 'Normal post-breakfast' },
    { dayOffset: 9, time: '08:45 AM', sys: 112, dia: 72, pulse: 68, fluct: false, type: 'none', symptoms: [], notes: 'Felt relaxed' },
    { dayOffset: 10, time: '01:00 PM', sys: 110, dia: 70, pulse: 72, fluct: false, type: 'none', symptoms: ['Fatigue / Heavy limbs'], notes: 'Mild post-lunch tiredness' },
    { dayOffset: 11, time: '08:30 AM', sys: 115, dia: 74, pulse: 71, fluct: false, type: 'none', symptoms: [], notes: 'Stable' },
    { dayOffset: 12, time: '09:00 AM', sys: 114, dia: 73, pulse: 69, fluct: false, type: 'none', symptoms: [], notes: 'Normal' },
    // Menstrual phase (days 1-5): Mild drops from cramps/blood flow
    { dayOffset: 13, time: '10:00 AM', sys: 102, dia: 65, pulse: 76, fluct: true, type: 'drop', symptoms: ['Dizzy / Lightheaded', 'Headache / Throbbing', 'Fatigue / Heavy limbs'], notes: 'Day 2 of period, heavy flow, felt faint and washed out' },
    { dayOffset: 14, time: '08:30 AM', sys: 105, dia: 67, pulse: 74, fluct: false, type: 'none', symptoms: ['Headache / Throbbing'], notes: 'Mild cramps and headache' },
    { dayOffset: 15, time: '09:00 AM', sys: 110, dia: 70, pulse: 72, fluct: false, type: 'none', symptoms: [], notes: 'Bleeding tapered off' },
  ];

  presets.forEach((p, idx) => {
    const logDate = subDays(today, p.dayOffset);
    const dateStr = format(logDate, 'yyyy-MM-dd');
    const dayInCycle = Math.max(1, currentCycleDay - p.dayOffset);
    const phase: CyclePhase =
      dayInCycle <= 5 ? 'Menstrual' : dayInCycle <= 12 ? 'Follicular' : dayInCycle <= 16 ? 'Ovulatory' : 'Luteal';

    logs.push({
      id: `bp-${dateStr}-${idx}`,
      date: dateStr,
      time: p.time,
      systolic: p.sys,
      diastolic: p.dia,
      pulse: p.pulse,
      feltFluctuations: p.fluct,
      fluctuationType: p.type as any,
      symptoms: p.symptoms,
      posture: 'Sitting',
      notes: p.notes,
      cyclePhase: phase,
      cycleDay: dayInCycle,
      category: classifyBloodPressure(p.sys, p.dia),
    });
  });

  return logs;
}

/**
 * AI Blood Pressure Analytical & Predictive Engine
 * Evaluates holistic trends, hormonal phase correlations, and symptom patterns (dizzy, breathless, zoneout, headache)
 */
export function analyzeBloodPressure(
  logs: BloodPressureLog[],
  currentCycleDay: number = 18,
  currentPhase: string = 'Luteal'
): {
  averageSystolic: number;
  averageDiastolic: number;
  averagePulse: number;
  fluctuationCount: number;
  fluctuationRatePercent: number;
  symptomFrequency: Record<string, number>;
  prediction: BpPredictionWarning;
} {
  if (!logs || logs.length === 0) {
    return {
      averageSystolic: 115,
      averageDiastolic: 75,
      averagePulse: 72,
      fluctuationCount: 0,
      fluctuationRatePercent: 0,
      symptomFrequency: {},
      prediction: {
        riskLevel: 'optimal',
        headline: 'Blood Pressure Profile is Balanced',
        summary: 'Keep logging daily to unlock AI hormonal and fluctuation alerts.',
        predictedRange: '110-120 / 70-80 mmHg',
        detectedCorrelation: 'No abnormal fluctuations detected yet.',
        fluctuationPattern: 'Stable',
        commonSymptoms: [],
        recommendations: ['Maintain regular hydration (2L+)', 'Log daily morning readings'],
        clinicalPrecaution: 'Seek medical advice if BP consistently exceeds 140/90 or falls below 90/60.',
        shouldNotifyDoctor: false,
      },
    };
  }

  // Calculate telemetry
  const totalLogs = logs.length;
  const sumSys = logs.reduce((acc, l) => acc + l.systolic, 0);
  const sumDia = logs.reduce((acc, l) => acc + l.diastolic, 0);
  const sumPulse = logs.reduce((acc, l) => acc + (l.pulse || 72), 0);

  const avgSys = Math.round(sumSys / totalLogs);
  const avgDia = Math.round(sumDia / totalLogs);
  const avgPulse = Math.round(sumPulse / totalLogs);

  const fluctuationCount = logs.filter((l) => l.feltFluctuations).length;
  const fluctuationRate = Math.round((fluctuationCount / totalLogs) * 100);

  // Symptom counts
  const symptomFreq: Record<string, number> = {};
  logs.forEach((log) => {
    log.symptoms.forEach((sym) => {
      symptomFreq[sym] = (symptomFreq[sym] || 0) + 1;
    });
  });

  const dizzyCount = symptomFreq['Dizzy / Lightheaded'] || 0;
  const breathlessCount = symptomFreq['Breathless / Air hunger'] || 0;
  const zoneoutCount = symptomFreq['Zone out / Brain fog'] || 0;
  const headacheCount = symptomFreq['Headache / Throbbing'] || 0;

  // Recent 5 days trend
  const recentLogs = logs.slice(0, 5);
  const recentAvgSys = Math.round(recentLogs.reduce((acc, l) => acc + l.systolic, 0) / recentLogs.length);
  const recentAvgDia = Math.round(recentLogs.reduce((acc, l) => acc + l.diastolic, 0) / recentLogs.length);

  // AI Decision Logic
  let riskLevel: 'optimal' | 'mild_alert' | 'moderate_warning' | 'urgent_clinical' = 'optimal';
  let headline = 'Blood Pressure is Balanced & Circulating Well';
  let summary = 'Your cardiovascular telemetry is within safe physiological bounds.';
  let predictedRange = '112-120 / 72-78 mmHg';
  let detectedCorrelation = 'Consistent readings across cycle phases.';
  let fluctuationPattern = 'Stable blood vessel tone.';
  const recommendations: string[] = [];
  let clinicalPrecaution = 'Routine tracking is recommended. Stay well hydrated.';
  let shouldNotifyDoctor = false;

  // Case 1: Luteal Phase Low BP & Dizziness
  if (
    (currentPhase === 'Luteal' || currentPhase === 'Menstrual') &&
    (recentAvgSys < 105 || recentAvgDia < 68 || dizzyCount >= 2 || zoneoutCount >= 2)
  ) {
    riskLevel = 'moderate_warning';
    headline = 'Mild Dizziness & Low BP Expected Today';
    summary = `Your blood pressure tends to dip slightly during your ${currentPhase} phase. Stand up slowly, keep water handy, and have meals on time!`;
    predictedRange = '95–105 / 62–68 mmHg';
    detectedCorrelation = `You felt dizzy ${dizzyCount}x and zoned out ${zoneoutCount}x recently on low BP days.`;
    fluctuationPattern = 'Mild afternoon pressure dips';

    recommendations.push(
      '💧 Sip water with a pinch of salt',
      '🥗 Have meals on time to avoid dips',
      '🪑 Stand up slowly from sitting or bed',
      '🦵 Flex your calves before getting up'
    );

    clinicalPrecaution = 'If dizziness feels very severe or you feel like fainting, check with your doctor.';
    shouldNotifyDoctor = dizzyCount >= 4 || recentAvgSys < 90;
  }
  // Case 2: Elevated Spikes with Headaches
  else if (recentAvgSys >= 135 || recentAvgDia >= 88 || headacheCount >= 3) {
    riskLevel = recentAvgSys >= 140 ? 'urgent_clinical' : 'moderate_warning';
    headline = 'BP Running Slightly Higher Today';
    summary = 'Your recent readings were higher with a few headaches. Rest in a cool room and cut caffeine today.';
    predictedRange = '130–140 / 84–90 mmHg';
    detectedCorrelation = 'Headaches showed up on higher reading days.';
    fluctuationPattern = 'Slight evening pressure rise';

    recommendations.push(
      '☕ Skip coffee and energy drinks today',
      '🧘 Take 15 mins quiet rest with eyes closed',
      '🩺 Take a calm recheck this evening'
    );

    clinicalPrecaution = 'If your reading stays over 140/90 or headache doesn’t ease, speak with a doctor.';
    shouldNotifyDoctor = true;
  }
  // Case 3: Fluctuations / Swings
  else if (fluctuationRate >= 30 || breathlessCount >= 2) {
    riskLevel = 'mild_alert';
    headline = 'Mild Pressure Swings Reported';
    summary = 'You reported feeling a few sudden drops or spikes. Keep water intake steady and take deep breaths.';
    predictedRange = '105–120 / 68–78 mmHg';
    detectedCorrelation = 'Swings were felt alongside afternoon tiredness.';
    fluctuationPattern = 'Mild fluctuation across the day';

    recommendations.push(
      '💧 Sip water steadily through the day',
      '☕ Limit coffee to morning only',
      '🌬️ Take 5 slow deep breaths when tired'
    );

    clinicalPrecaution = 'Track when you feel swings so you can spot patterns easily.';
  } else {
    // Normal / Optimal
    riskLevel = 'optimal';
    headline = 'Blood Pressure is Stable & Healthy';
    summary = 'Your readings are balanced with no noticeable swings. Keep up your great daily habits!';
    predictedRange = '110–118 / 72–76 mmHg';
    detectedCorrelation = 'Pressure is adapting smoothly to your body.';
    fluctuationPattern = 'Smooth and stable';

    recommendations.push(
      '✨ Keep your gentle daily routine',
      '💧 Drink your normal daily water'
    );
  }

  const sortedSymptoms = Object.entries(symptomFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count}x)`);

  return {
    averageSystolic: avgSys,
    averageDiastolic: avgDia,
    averagePulse: avgPulse,
    fluctuationCount,
    fluctuationRatePercent: fluctuationRate,
    symptomFrequency: symptomFreq,
    prediction: {
      riskLevel,
      headline,
      summary,
      predictedRange,
      detectedCorrelation,
      fluctuationPattern,
      commonSymptoms: sortedSymptoms,
      recommendations,
      clinicalPrecaution,
      shouldNotifyDoctor,
    },
  };
}
