export const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'Cramps', icon: '⚡' },
  { id: 'headache', label: 'Headache', icon: '🤕' },
  { id: 'bloating', label: 'Bloating', icon: '🎈' },
  { id: 'fatigue', label: 'Fatigue', icon: '🥱' },
  { id: 'back_pain', label: 'Back pain', icon: '🩹' },
  { id: 'acne', label: 'Acne', icon: '✨' },
  { id: 'breast_tenderness', label: 'Breast tenderness', icon: '🌸' },
  { id: 'nausea', label: 'Nausea', icon: '🤢' },
  { id: 'dizziness', label: 'Dizziness', icon: '💫' },
  { id: 'mood_swings', label: 'Mood swings', icon: '🎭' },
  { id: 'insomnia', label: 'Insomnia', icon: '🌙' },
  { id: 'cravings', label: 'Food cravings', icon: '🍫' },
];

export const MOOD_OPTIONS = [
  { label: 'Happy', emoji: '😊', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Calm', emoji: '😌', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'Neutral', emoji: '😐', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { label: 'Irritated', emoji: '😤', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Anxious', emoji: '😰', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { label: 'Stressed', emoji: '😫', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Sad', emoji: '😢', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Low', emoji: '🥀', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const ENERGY_OPTIONS = [
  { level: 'VERY_LOW', label: 'Very Low', value: 1, icon: '🔋', color: 'text-rose-400' },
  { level: 'LOW', label: 'Low', value: 2, icon: '🪫', color: 'text-amber-400' },
  { level: 'NORMAL', label: 'Normal', value: 3, icon: '⚡', color: 'text-emerald-500' },
  { level: 'HIGH', label: 'High', value: 4, icon: '✨', color: 'text-sky-500' },
  { level: 'VERY_HIGH', label: 'Very High', value: 5, icon: '🔥', color: 'text-purple-500' },
];

export const FLOW_OPTIONS = [
  { level: 'SPOTTING', label: 'Spotting', description: 'Very light droplets' },
  { level: 'LIGHT', label: 'Light', description: 'Requires minimal protection' },
  { level: 'MEDIUM', label: 'Medium', description: 'Regular flow' },
  { level: 'HEAVY', label: 'Heavy', description: 'Frequent protection changes' },
];

export const PHASE_INFO = {
  Menstrual: {
    name: 'Menstrual Phase',
    description: 'Rest, recharge, and nourish your body.',
    color: 'from-rose-500 to-sakhi-600',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    tip: 'Your hormone levels are at their baseline. Prioritize iron-rich foods, warm teas, and gentle stretching.',
  },
  Follicular: {
    name: 'Follicular Phase',
    description: 'Rising energy and mental clarity.',
    color: 'from-amber-400 to-peach-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    tip: 'Estrogen is steadily climbing. Great time for creative planning, high-energy workouts, and social connection.',
  },
  Ovulatory: {
    name: 'Ovulatory Phase',
    description: 'Peak confidence and vibrancy.',
    color: 'from-emerald-400 to-teal-500',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    tip: 'Your energy and libido are typically at their height. Stay hydrated and fuel with colorful antioxidants.',
  },
  Luteal: {
    name: 'Luteal Phase',
    description: 'Nesting, winding down, and listening to your body.',
    color: 'from-purple-400 to-lavender-600',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    tip: 'Progesterone rises, then begins to decline. Prioritize magnesium, adequate sleep, and gentle movement like yoga.',
  },
};

export const MEDICAL_SAFETY_DISCLAIMER =
  'Sakhi is a personal wellness companion designed for holistic cycle awareness and is not a medical device. It does not diagnose medical conditions or replace advice from a physician. Always consult a licensed healthcare professional for medical concerns.';
