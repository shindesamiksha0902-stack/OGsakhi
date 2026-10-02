import { DeviationSeverity, StructuredAiResponse } from '@/types';
import { MEDICAL_SAFETY_DISCLAIMER } from '@/lib/constants';

export class SafetyGuard {
  // Disallowed diagnostic assertions that an AI must never state as fact
  private static FORBIDDEN_DIAGNOSTIC_PATTERNS = [
    /\byou have (pcos|polycystic|endometriosis|anemia|thyroid disorder|adenomyosis|pmdd|fibroids)\b/i,
    /\bthis definitely means you have\b/i,
    /\byou are suffering from\b/i,
    /\bdiagnosed with\b/i,
    /\byou likely have (a disorder|a disease|a pathology)\b/i,
  ];

  /**
   * Evaluates text for forbidden diagnostic phrasing and sanitizes it
   */
  static sanitizeAiText(rawText: string): string {
    let sanitized = rawText;

    for (const pattern of this.FORBIDDEN_DIAGNOSTIC_PATTERNS) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(
          pattern,
          'some people experience similar symptoms when body patterns change, which is best evaluated by a physician'
        );
      }
    }

    return sanitized;
  }

  /**
   * Evaluates severity of health metric changes based on established thresholds
   */
  static determineSeverity(params: {
    cycleDay: number;
    expectedCycleLength: number;
    consecutiveLowEnergyDays?: number;
    consecutivePoorSleepDays?: number;
    severeCrampDays?: number;
  }): DeviationSeverity {
    const {
      cycleDay,
      expectedCycleLength,
      consecutiveLowEnergyDays = 0,
      consecutivePoorSleepDays = 0,
      severeCrampDays = 0,
    } = params;

    // Severe pain across multiple days or extreme cycle deviation (>14 days past expected)
    if (severeCrampDays >= 3 || cycleDay > expectedCycleLength + 14) {
      return 'CONSIDER_CHECKING';
    }

    // Noticeable changes (period > 5 days late, or 3+ days low energy/sleep)
    if (
      cycleDay > expectedCycleLength + 5 ||
      consecutiveLowEnergyDays >= 3 ||
      consecutivePoorSleepDays >= 3 ||
      severeCrampDays >= 1
    ) {
      return 'NOTICE';
    }

    return 'NORMAL';
  }

  /**
   * Wraps and validates structured AI responses to ensure responsible wellness tone
   */
  static enforceSafeStructure(
    rawResponse: Partial<StructuredAiResponse>,
    calculatedSeverity: DeviationSeverity = 'NORMAL'
  ): StructuredAiResponse {
    const whatNoticed = this.sanitizeAiText(
      rawResponse.what_i_noticed ||
        'Based on your tracked logs, here is what we observed in your wellness rhythm.'
    );

    const possibleExplanation = this.sanitizeAiText(
      rawResponse.possible_explanation ||
        'Hormonal shifts throughout your cycle, sleep quality, and lifestyle factors can naturally influence how you feel.'
    );

    const suggestions = Array.isArray(rawResponse.what_you_can_try) && rawResponse.what_you_can_try.length > 0
      ? rawResponse.what_you_can_try.map((item) => this.sanitizeAiText(item))
      : [
          'Stay hydrated with warm water or herbal tea.',
          'Support your body with gentle rest and nourishing snacks.',
        ];

    let whenToSeekCare = rawResponse.when_to_seek_care;
    if (calculatedSeverity === 'CONSIDER_CHECKING' && !whenToSeekCare) {
      whenToSeekCare =
        'If this pattern is significantly different from your usual cycle or causes disruption in your daily life, consider speaking with a healthcare professional.';
    }

    return {
      what_i_noticed: whatNoticed,
      possible_explanation: possibleExplanation,
      what_you_can_try: suggestions,
      when_to_seek_care: whenToSeekCare,
      safety_level: calculatedSeverity,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    };
  }
}
