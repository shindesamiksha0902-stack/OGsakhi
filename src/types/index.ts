export type FlowIntensity = 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'SPOTTING';

export type EnergyLevel = 'VERY_LOW' | 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';

export type MoodPrimary =
  | 'Happy'
  | 'Calm'
  | 'Neutral'
  | 'Irritated'
  | 'Sad'
  | 'Anxious'
  | 'Stressed'
  | 'Low';

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';

export type DeviationSeverity = 'NORMAL' | 'NOTICE' | 'CONSIDER_CHECKING';

export interface LogSymptomInput {
  symptomName: string;
  severity: number; // 1 to 3
}

export interface DailyLogData {
  id?: string;
  date: string; // ISO date string YYYY-MM-DD
  isPeriodDay: boolean;
  flowIntensity?: FlowIntensity | null;
  crampSeverity?: number | null; // 0 - 5
  moodPrimary?: MoodPrimary | null;
  moodIntensity?: number | null; // 1 - 5
  energyLevel?: EnergyLevel | null;
  sleepHours?: number | null;
  sleepQuality?: number | null; // 1 - 5
  bedTime?: string | null;
  wakeTime?: string | null;
  waterIntakeMl?: number | null;
  exerciseMinutes?: number | null;
  exerciseType?: string | null;
  caffeineCups?: number | null;
  stressLevel?: number | null; // 1 - 5
  mealsStatus?: 'ON_TIME' | 'SKIPPED' | 'DELAYED' | null;
  bloodPressureStatus?: 'NORMAL' | 'ELEVATED' | 'LOW' | null;
  notes?: string | null;
  symptoms: LogSymptomInput[];
}

export interface DailyRhythmGoal {
  id: string;
  category: 'meals' | 'mood' | 'hydration' | 'sleep' | 'movement';
  icon: string;
  tag: string;
  title: string;
  reason: string;
  completed?: boolean;
}

export interface CycleRecord {
  id: string;
  startDate: string;
  endDate?: string | null;
  cycleEndDate?: string | null;
  lengthDays?: number | null;
  periodDays?: number | null;
  isOngoing: boolean;
}

export interface FuturePeriodPrediction {
  cycleNumber: number;
  startDate: string;
  endDate: string;
  ovulationDate: string;
  fertileWindow: {
    start: string;
    end: string;
  };
  pmsWindow: {
    start: string;
    end: string;
  };
  confidence: number; // 0 - 100%
}

export interface CycleStats {
  currentCycleDay: number;
  currentPhase: CyclePhase;
  daysUntilNextPeriod: number;
  estimatedNextPeriodDate: string;
  averageCycleLength: number;
  averagePeriodLength: number;
  cycleVariationDays: number;
  totalCyclesTracked: number;
  confidenceScore: number;
  ovulationDate: string;
  fertileWindow: {
    start: string;
    end: string;
  };
  forecasts: FuturePeriodPrediction[];
}

export interface PopupReminder {
  id: string;
  title: string;
  message: string;
  type: 'period' | 'ovulation' | 'hydration' | 'sleep' | 'checkin' | 'wellness';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  actionText?: string;
  actionUrl?: string;
}

export interface ReminderSettings {
  enablePeriodAlert: boolean;
  periodAlertDaysBefore: number; // e.g. 2 days before
  enableOvulationAlert: boolean;
  enableHydrationNudge: boolean;
  enableDailyCheckin: boolean;
  dailyCheckinTime: string; // "20:00"
  enableAi?: boolean; // AI contextual insights toggle
}


export interface DetectedPatternItem {
  id: string;
  category: 'CYCLE' | 'MOOD' | 'ENERGY' | 'SYMPTOM' | 'LIFESTYLE';
  title: string;
  observation: string;
  severity: DeviationSeverity;
  detectedAt: string;
  isActive: boolean;
  metadata?: any;
}

export interface StructuredAiResponse {
  what_i_noticed: string;
  possible_explanation: string;
  what_you_can_try: string[];
  when_to_seek_care?: string;
  safety_level: DeviationSeverity;
  disclaimer: string;
}

export type BpCategory =
  | 'Low (Hypotension)'
  | 'Normal / Optimal'
  | 'Elevated'
  | 'Stage 1 High'
  | 'Stage 2 High'
  | 'Hypertensive Alert';

export interface BloodPressureLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "08:30 AM", "Morning", "Evening"
  systolic: number; // mmHg
  diastolic: number; // mmHg
  pulse?: number; // bpm
  feltFluctuations: boolean;
  fluctuationType?: 'none' | 'drop' | 'spike' | 'irregular';
  symptoms: string[]; // ['Dizzy / Lightheaded', 'Breathless', 'Headache', 'Zone out / Brain fog', ...]
  posture?: 'Sitting' | 'Lying down' | 'Standing';
  notes?: string;
  cyclePhase?: CyclePhase | string;
  cycleDay?: number;
  category: BpCategory;
}

export interface BpPredictionWarning {
  riskLevel: 'optimal' | 'mild_alert' | 'moderate_warning' | 'urgent_clinical';
  headline: string;
  summary: string;
  predictedRange: string;
  detectedCorrelation: string;
  fluctuationPattern: string;
  commonSymptoms: string[];
  recommendations: string[];
  clinicalPrecaution: string;
  shouldNotifyDoctor: boolean;
}

export interface UserOnboardingProfile {
  completed: boolean;
  lastPeriodStartDate: string; // ISO date YYYY-MM-DD
  typicalCycleLength: number; // e.g. 28, 29
  typicalPeriodLength: number; // e.g. 5
  cycleRegularity: 'REGULAR' | 'SOMEWHAT_IRREGULAR' | 'IRREGULAR_PCOS' | 'BIRTH_CONTROL_POSTPARTUM';
  primaryGoals: string[]; // e.g. ['period_prediction', 'ovulation', 'symptoms', 'bp_dizziness', 'daily_rhythm']
  dizzinessOrBpHistory: 'OFTEN' | 'OCCASIONALLY' | 'RARELY_NEVER';
  completedAt?: string;
}


