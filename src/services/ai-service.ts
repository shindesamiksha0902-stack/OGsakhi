import {
  CycleStats,
  DailyLogData,
  DetectedPatternItem,
  StructuredAiResponse,
  UserOnboardingProfile,
} from '@/types';
import { SafetyGuard } from './safety-guard';

export class AiService {
  /**
   * Generates a context-aware, safety-guarded response for user questions
   */
  static async answerWellnessQuestion(params: {
    userQuestion: string;
    stats: CycleStats;
    recentLogs: DailyLogData[];
    patterns: DetectedPatternItem[];
    baselines: {
      avgSleep: number;
      dominantEnergy: string;
      avgHydration: number;
    };
    onboardingProfile?: UserOnboardingProfile | null;
  }): Promise<StructuredAiResponse> {
    const { userQuestion, stats, recentLogs, patterns, baselines, onboardingProfile } = params;
    const apiKey = process.env.GEMINI_API_KEY;

    // Summarize contextual facts for prompt injection
    const recentSymptoms = Array.from(
      new Set(recentLogs.flatMap((l) => l.symptoms.map((s) => s.symptomName)))
    );
    const recentAvgSleep =
      recentLogs.length > 0
        ? Math.round(
            (recentLogs.reduce((acc, l) => acc + (l.sleepHours || 0), 0) / recentLogs.length) * 10
          ) / 10
        : baselines.avgSleep;

    const contextPayload = {
      cycleDay: stats.currentCycleDay,
      phase: stats.currentPhase,
      daysUntilPeriod: stats.daysUntilNextPeriod,
      daysUntilNextPeriod: stats.daysUntilNextPeriod,
      estimatedNextPeriodDate: stats.estimatedNextPeriodDate,
      avgCycleLength: stats.averageCycleLength,
      cycleVariation: stats.cycleVariationDays,
      recentAvgSleep,
      baselineSleep: baselines.avgSleep,
      recentSymptoms,
      patternsFound: patterns.map((p) => p.observation),
      userProfile: onboardingProfile
        ? {
            lastPeriodStartDate: onboardingProfile.lastPeriodStartDate,
            typicalCycleLength: onboardingProfile.typicalCycleLength,
            typicalPeriodLength: onboardingProfile.typicalPeriodLength,
            cycleRegularity: onboardingProfile.cycleRegularity,
            primaryGoals: onboardingProfile.primaryGoals,
            dizzinessOrBpHistory: onboardingProfile.dizzinessOrBpHistory,
          }
        : null,
    };

    if (apiKey && apiKey.trim().length > 5) {
      try {
        const response = await this.callGeminiApi(
          apiKey,
          userQuestion,
          contextPayload,
          onboardingProfile
        );
        if (response) {
          const overallSeverity = patterns.some((p) => p.severity === 'CONSIDER_CHECKING')
            ? 'CONSIDER_CHECKING'
            : patterns.some((p) => p.severity === 'NOTICE')
            ? 'NOTICE'
            : 'NORMAL';
          return SafetyGuard.enforceSafeStructure(response, overallSeverity);
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to intelligent synthesizer:', err);
      }
    }

    // Fallback: Intelligent Deterministic Synthesizer
    return this.synthesizeContextualResponse(
      userQuestion,
      contextPayload,
      patterns,
      onboardingProfile
    );
  }

  private static async callGeminiApi(
    apiKey: string,
    question: string,
    context: any,
    profile?: UserOnboardingProfile | null
  ): Promise<Partial<StructuredAiResponse> | null> {
    const profileDirective = profile
      ? `
USER PROFILE & ONBOARDING ANSWERS (CRITICAL TO KEEP IN MIND):
- Typical cycle length: ${profile.typicalCycleLength} days
- Bleeding duration: ${profile.typicalPeriodLength} days
- Cycle Regularity: ${profile.cycleRegularity}
- Primary user goals: ${profile.primaryGoals?.join(', ') || 'General wellness'}
- Dizziness / BP Dip History: ${profile.dizzinessOrBpHistory}
You MUST align your tone and advice with these personal profile details (e.g. if they have PCOS/irregular cycles, acknowledge natural variations; if they have dizziness/BP history, watch out for sudden blood pressure drops and rising slowly; if their goal is ovulation/fertility, emphasize the fertile window).`
      : '';

    const systemInstruction = `You are OGsakhi, a gentle, knowledgeable, and empathetic AI wellness companion for menstrual health, blood pressure balance, and holistic wellbeing.
CRITICAL SAFETY DIRECTIVES:
1. You MUST NOT diagnose medical conditions (never say "You have PCOS", "You have endometriosis", "This is anemia", etc.).
2. Always refer directly to the user's logged data and their personal profile when answering.
3. Use observational phrasing: "Looking at your tracked logs...", "You tend to report...", "This differs from your usual pattern..."
4. Keep suggestions simple, low-risk, and restorative (warm tea, rest, hydration, gentle stretches, journaling).
${profileDirective}
5. Always respond in valid JSON with these exact keys:
{
  "what_i_noticed": "string",
  "possible_explanation": "string",
  "what_you_can_try": ["string", "string"],
  "when_to_seek_care": "string or null"
}`;

    const prompt = `Context of the user right now:
${JSON.stringify(context, null, 2)}

User Question: "${question}"

Respond with ONLY the JSON object.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      return JSON.parse(rawText);
    }
    return null;
  }

  /**
   * Deterministic synthesis when API key is not present or offline
   */
  private static synthesizeContextualResponse(
    question: string,
    context: any,
    patterns: DetectedPatternItem[],
    profile?: UserOnboardingProfile | null
  ): StructuredAiResponse {
    const qLower = question.toLowerCase();
    const phase = context.phase;
    const day = context.cycleDay;

    let whatNoticed = `You are currently on Cycle Day ${day} in your ${phase} Phase. `;
    if (profile?.cycleRegularity === 'IRREGULAR_PCOS') {
      whatNoticed += `(Calibrated with your irregular/PCOS rhythm history). `;
    }
    let possibleExplanation = `During the ${phase.toLowerCase()} phase, hormonal fluctuations naturally influence energy, digestion, and physical comfort. `;
    let whatYouCanTry: string[] = [
      'Keep hydration steady throughout the day with water or warm herbal infusions.',
      'Allow for 15-20 minutes of gentle downtime or stretching this evening.',
    ];
    let whenToSeekCare: string | undefined = undefined;

    // Incorporate user's specific dizziness/BP history
    if (profile?.dizzinessOrBpHistory === 'OFTEN' || profile?.primaryGoals?.includes('bp_dizziness')) {
      whatYouCanTry.push(
        'Rise slowly from bed or sitting, especially during heavy flow or luteal phase, to protect against blood pressure dips.'
      );
    }

    // Tired / Energy question
    if (qLower.includes('tired') || qLower.includes('energy') || qLower.includes('fatigue')) {
      whatNoticed += `Over your recent check-ins, your average sleep was approximately ${context.recentAvgSleep} hours, compared to your ${context.baselineSleep} hour baseline.`;
      if (phase === 'Luteal') {
        possibleExplanation +=
          'In the late luteal phase before your period, progesterone rises and then drops, which commonly impacts sleep architecture and daytime stamina.';
      } else {
        possibleExplanation +=
          'A shift in sleep duration or increased daily stress can temporarily lower physical energy.';
      }
      whatYouCanTry = [
        'Try going to bed 30 minutes earlier and creating a relaxing wind-down routine without screens.',
        'Enjoy iron- and magnesium-rich snacks (like pumpkin seeds, almonds, or dark leafy greens).',
        'Consider a gentle 15-minute walk in natural sunlight to help reset circadian rhythm.',
      ];
      if (profile?.dizzinessOrBpHistory === 'OFTEN') {
        whatYouCanTry.push('Sip electrolyte water if fatigue is accompanied by lightheadedness or cold extremities.');
      }
    }
    // Headaches / Symptoms question
    else if (qLower.includes('headache') || qLower.includes('pain') || qLower.includes('cramp')) {
      const headachePattern = patterns.find((p) => p.category === 'SYMPTOM');
      if (headachePattern) {
        whatNoticed += `${headachePattern.observation} `;
      } else {
        whatNoticed += `Your logs indicate discomfort reported around this time in your cycle.`;
      }
      possibleExplanation +=
        'Estrogen fluctuations in the pre-menstrual or early menstrual days can trigger vascular sensitivity and tension.';
      whatYouCanTry = [
        'Apply a soothing warm compress to your neck or forehead.',
        'Sip peppermint or ginger tea to support blood flow and relaxation.',
        'Ensure steady fluid intake throughout the day.',
      ];
      whenToSeekCare =
        'If headaches are unusually severe, sudden, or accompanied by visual disturbances, please consult a healthcare professional.';
    }
    // Delayed / Late period question
    else if (
      qLower.includes('delay') ||
      qLower.includes('late') ||
      qLower.includes('missed') ||
      qLower.includes('overdue')
    ) {
      const daysOverdue =
        context.daysUntilNextPeriod !== undefined && context.daysUntilNextPeriod < 0
          ? Math.abs(context.daysUntilNextPeriod)
          : null;

      whatNoticed += daysOverdue
        ? `Your estimated period date was approximately ${daysOverdue} days ago (${context.estimatedNextPeriodDate || 'recent date'}).`
        : `Your cycle is extending beyond your typical ${context.avgCycleLength}-day baseline rhythm.`;

      possibleExplanation =
        'Occasional cycle delays of 2 to 8 days are extremely common and are most often triggered by temporary cortisol spikes (stress), sleep deficits, recent travel, delayed ovulation, or hormonal fluctuations like PCOS.';

      whatYouCanTry = [
        'Apply a soothing warm heating pad or take a warm bath to relax pelvic muscular tension.',
        'Enjoy warm herbal teas like ginger, chamomile, or cinnamon to promote restorative circulation.',
        'Practice 5–10 minutes of slow deep diaphragmatic breathing to help lower sympathetic stress hormones.',
        'Log today’s symptoms (such as light spotting, subtle cramping, or discharge changes) to help OGsakhi re-calibrate.',
        'If you are sexually active, an at-home pregnancy test is recommended once your period is 5–7 days late for clear reassurance.',
      ];

      whenToSeekCare =
        'If your period is delayed by more than 14–21 days with negative tests, or if you experience sudden severe lower abdominal pain or abnormal fever, please consult your doctor or gynecologist.';
    }
    // Regularity question
    else if (qLower.includes('regular') || qLower.includes('cycle')) {
      whatNoticed += `Your baseline cycle length is ${context.avgCycleLength} days with a variation of ±${context.cycleVariation} days.`;
      if (profile?.cycleRegularity === 'IRREGULAR_PCOS') {
        possibleExplanation +=
          'Because your cycles naturally have more variability, OGsakhi tracks your daily physiological signals (temperature, cervical signs, mood) rather than relying strictly on the calendar.';
      } else {
        possibleExplanation +=
          'Cycles commonly fluctuate by a few days month to month due to travel, stress, illness, or sleep changes.';
      }
      whatYouCanTry = [
        'Continue logging daily symptoms so your personal prediction window becomes increasingly accurate.',
        'Keep stress-management habits steady.',
      ];
      if (context.cycleVariation > 7) {
        whenToSeekCare =
          'If your cycle remains absent for more than 45 days or varies widely across three consecutive cycles, a healthcare provider can offer personalized guidance.';
      }
    }
    // General patterns question
    else {
      if (patterns.length > 0) {
        whatNoticed += `We identified patterns including: "${patterns[0].title}".`;
        possibleExplanation = patterns[0].observation;
      } else {
        whatNoticed += `Your logged entries show a steady rhythm with balanced sleep and mood.`;
        possibleExplanation =
          'Listening to your daily body signals helps clarify how different cycle phases affect your wellbeing.';
      }
    }

    return SafetyGuard.enforceSafeStructure(
      {
        what_i_noticed: whatNoticed,
        possible_explanation: possibleExplanation,
        what_you_can_try: whatYouCanTry,
        when_to_seek_care: whenToSeekCare,
      },
      patterns.some((p) => p.severity === 'CONSIDER_CHECKING') ? 'CONSIDER_CHECKING' : 'NORMAL'
    );
  }
}
