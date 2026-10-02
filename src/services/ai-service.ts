import { CycleStats, DailyLogData, DetectedPatternItem, StructuredAiResponse } from '@/types';
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
  }): Promise<StructuredAiResponse> {
    const { userQuestion, stats, recentLogs, patterns, baselines } = params;
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
      avgCycleLength: stats.averageCycleLength,
      cycleVariation: stats.cycleVariationDays,
      recentAvgSleep,
      baselineSleep: baselines.avgSleep,
      recentSymptoms,
      patternsFound: patterns.map((p) => p.observation),
    };

    if (apiKey && apiKey.trim().length > 5) {
      try {
        const response = await this.callGeminiApi(apiKey, userQuestion, contextPayload);
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
    return this.synthesizeContextualResponse(userQuestion, contextPayload, patterns);
  }

  private static async callGeminiApi(
    apiKey: string,
    question: string,
    context: any
  ): Promise<Partial<StructuredAiResponse> | null> {
    const systemInstruction = `You are OGsakhi (सखी), a gentle, knowledgeable, and empathetic AI wellness companion for menstrual health, blood pressure balance, and holistic wellbeing.
CRITICAL SAFETY DIRECTIVES:
1. You MUST NOT diagnose medical conditions (never say "You have PCOS", "You have endometriosis", "This is anemia", etc.).
2. Always refer directly to the user's logged data when answering.
3. Use observational phrasing: "Looking at your tracked logs...", "You tend to report...", "This differs from your usual pattern..."
4. Keep suggestions simple, low-risk, and restorative (warm tea, rest, hydration, gentle stretches, journaling).
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
    patterns: DetectedPatternItem[]
  ): StructuredAiResponse {
    const qLower = question.toLowerCase();
    const phase = context.phase;
    const day = context.cycleDay;

    let whatNoticed = `You are currently on Cycle Day ${day} in your ${phase} Phase. `;
    let possibleExplanation = `During the ${phase.toLowerCase()} phase, hormonal fluctuations naturally influence energy, digestion, and physical comfort. `;
    let whatYouCanTry: string[] = [
      'Keep hydration steady throughout the day with water or warm herbal infusions.',
      'Allow for 15-20 minutes of gentle downtime or stretching this evening.',
    ];
    let whenToSeekCare: string | undefined = undefined;

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
    // Regularity question
    else if (qLower.includes('regular') || qLower.includes('late') || qLower.includes('cycle')) {
      whatNoticed += `Your historical average cycle length is ${context.avgCycleLength} days with a variation of ±${context.cycleVariation} days.`;
      possibleExplanation +=
        'Cycles commonly fluctuate by a few days month to month due to travel, stress, illness, or sleep changes.';
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
