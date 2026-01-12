/**
 * Vedic Horoscope Generator
 * Generates quirky, brutally honest horoscopes using:
 * - Vedic astrology principles (tithi, nakshatra, day of week)
 * - Zodiac personality traits
 * - Algorithmic message generation
 * NO EXTERNAL API DEPENDENCIES
 */

interface ZodiacTraits {
  element: 'fire' | 'earth' | 'air' | 'water';
  quality: 'cardinal' | 'fixed' | 'mutable';
  ruler: string;
  positives: string[];
  negatives: string[];
  tendencies: string[];
}

// Vedic zodiac personality traits
const ZODIAC_TRAITS: Record<string, ZodiacTraits> = {
  Mesh: {
    element: 'fire',
    quality: 'cardinal',
    ruler: 'Mars',
    positives: ['bold', 'energetic', 'pioneering', 'confident'],
    negatives: ['impulsive', 'aggressive', 'impatient', 'reckless'],
    tendencies: ['rushing into things', 'starting fights', 'getting bored quickly', 'ignoring consequences']
  },
  Vrishabha: {
    element: 'earth',
    quality: 'fixed',
    ruler: 'Venus',
    positives: ['loyal', 'patient', 'reliable', 'practical'],
    negatives: ['stubborn', 'possessive', 'materialistic', 'resistant to change'],
    tendencies: ['clinging to comfort', 'avoiding change', 'overindulging', 'being overly cautious']
  },
  Mithuna: {
    element: 'air',
    quality: 'mutable',
    ruler: 'Mercury',
    positives: ['adaptable', 'witty', 'curious', 'communicative'],
    negatives: ['indecisive', 'superficial', 'gossipy', 'inconsistent'],
    tendencies: ['overthinking everything', 'spreading yourself too thin', 'changing your mind constantly', 'avoiding commitment']
  },
  Karka: {
    element: 'water',
    quality: 'cardinal',
    ruler: 'Moon',
    positives: ['nurturing', 'intuitive', 'protective', 'emotional'],
    negatives: ['moody', 'oversensitive', 'clingy', 'defensive'],
    tendencies: ['taking things personally', 'building walls', 'holding grudges', 'living in the past']
  },
  Simha: {
    element: 'fire',
    quality: 'fixed',
    ruler: 'Sun',
    positives: ['confident', 'generous', 'charismatic', 'creative'],
    negatives: ['arrogant', 'attention-seeking', 'dramatic', 'domineering'],
    tendencies: ['making everything about you', 'demanding admiration', 'refusing to admit mistakes', 'being overdramatic']
  },
  Kanya: {
    element: 'earth',
    quality: 'mutable',
    ruler: 'Mercury',
    positives: ['analytical', 'helpful', 'organized', 'practical'],
    negatives: ['critical', 'perfectionist', 'anxious', 'judgmental'],
    tendencies: ['overthinking details', 'criticizing everyone', 'worrying constantly', 'nitpicking minor flaws']
  },
  Tula: {
    element: 'air',
    quality: 'cardinal',
    ruler: 'Venus',
    positives: ['diplomatic', 'fair', 'social', 'harmonious'],
    negatives: ['indecisive', 'people-pleasing', 'superficial', 'avoidant'],
    tendencies: ['avoiding conflict at all costs', 'sacrificing your needs', 'being fake nice', 'never picking a side']
  },
  Vrishchika: {
    element: 'water',
    quality: 'fixed',
    ruler: 'Mars',
    positives: ['passionate', 'resourceful', 'brave', 'loyal'],
    negatives: ['jealous', 'secretive', 'vengeful', 'controlling'],
    tendencies: ['holding grudges forever', 'testing people', 'being suspicious', 'seeking revenge']
  },
  Dhanu: {
    element: 'fire',
    quality: 'mutable',
    ruler: 'Jupiter',
    positives: ['optimistic', 'adventurous', 'honest', 'philosophical'],
    negatives: ['tactless', 'irresponsible', 'overconfident', 'preachy'],
    tendencies: ['saying things without thinking', 'running away from commitment', 'being brutally honest at wrong times', 'lecturing everyone']
  },
  Makara: {
    element: 'earth',
    quality: 'cardinal',
    ruler: 'Saturn',
    positives: ['ambitious', 'disciplined', 'responsible', 'patient'],
    negatives: ['pessimistic', 'cold', 'rigid', 'workaholic'],
    tendencies: ['being too serious', 'prioritizing work over people', 'expecting the worst', 'refusing to have fun']
  },
  Kumbha: {
    element: 'air',
    quality: 'fixed',
    ruler: 'Saturn',
    positives: ['innovative', 'independent', 'humanitarian', 'intellectual'],
    negatives: ['detached', 'stubborn', 'aloof', 'unpredictable'],
    tendencies: ['emotionally distancing yourself', 'being contrarian for no reason', 'ignoring feelings', 'rejecting help']
  },
  Meen: {
    element: 'water',
    quality: 'mutable',
    ruler: 'Jupiter',
    positives: ['compassionate', 'artistic', 'intuitive', 'spiritual'],
    negatives: ['escapist', 'oversensitive', 'vague', 'martyr-complex'],
    tendencies: ['escaping reality', 'playing victim', 'being overly sacrificial', 'losing yourself in others']
  }
};

// Message templates for different cosmic energies
const TITHI_ENERGY = [
  // Waxing Moon (1-14) - Growing energy
  { range: [1, 5], energy: 'new beginnings', advice: 'start fresh', warning: 'don\'t rush' },
  { range: [6, 10], energy: 'building momentum', advice: 'push forward', warning: 'stay focused' },
  { range: [11, 14], energy: 'peak energy', advice: 'make your move', warning: 'don\'t overdo it' },
  // Full Moon (15) - Maximum energy
  { range: [15, 15], energy: 'intense emotions', advice: 'channel wisely', warning: 'emotions run high' },
  // Waning Moon (16-29) - Releasing energy
  { range: [16, 20], energy: 'reflection time', advice: 'let go', warning: 'release what doesn\'t serve' },
  { range: [21, 25], energy: 'clearing out', advice: 'clean up', warning: 'stop clinging' },
  { range: [26, 30], energy: 'rest and restore', advice: 'take it easy', warning: 'don\'t force things' }
];

// Day of week energies (Vedic)
const DAY_ENERGY = {
  0: { planet: 'Sun', focus: 'ego and authority', action: 'lead' },
  1: { planet: 'Moon', focus: 'emotions and intuition', action: 'feel' },
  2: { planet: 'Mars', focus: 'action and courage', action: 'fight' },
  3: { planet: 'Mercury', focus: 'communication and thought', action: 'think' },
  4: { planet: 'Jupiter', focus: 'wisdom and growth', action: 'expand' },
  5: { planet: 'Venus', focus: 'love and beauty', action: 'enjoy' },
  6: { planet: 'Saturn', focus: 'discipline and limits', action: 'work' }
};

// Brutally honest message templates
const MESSAGE_TEMPLATES = {
  // Challenge templates
  challenges: [
    "Stop {tendency}. It's creating unnecessary drama in your life.",
    "Your habit of {tendency} is holding you back more than you realize.",
    "{tendency}? Really? That's the hill you're choosing to die on?",
    "The universe is tired of watching you {tendency}. Cut it out.",
    "You know that thing where you keep {tendency}? Yeah, stop that."
  ],
  // Advice templates
  advice: [
    "Channel that {positive} energy into {action}. You might surprise yourself.",
    "Your {positive} nature is your superpower. Use it to {action} today.",
    "Time to be {positive} instead of {negative}. {advice}.",
    "The stars say {action}. Your {ruler} demands it.",
    "Today's {dayFocus} energy? Perfect for you to {action}."
  ],
  // Direct callouts
  callouts: [
    "Not everything is about you, even though you think it is.",
    "That grudge you're holding? It's hurting you more than them.",
    "Stop waiting for perfection. It's not coming.",
    "Your tendency to {tendency} is showing. Reign it in.",
    "Being {negative} won't solve your problems. Try {advice} instead."
  ]
};

function getTithiEnergy(tithi: number | null): { energy: string; advice: string; warning: string } {
  if (!tithi || tithi < 1 || tithi > 30) {
    return { energy: 'unknown', advice: 'stay present', warning: 'be mindful' };
  }
  
  const match = TITHI_ENERGY.find(t => tithi >= t.range[0] && tithi <= t.range[1]);
  return match || TITHI_ENERGY[0];
}

function getDayEnergy(date: Date): { planet: string; focus: string; action: string } {
  const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  return DAY_ENERGY[dayOfWeek];
}

function selectRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateQuirkyMessage(
  zodiac: string,
  traits: ZodiacTraits,
  tithiEnergy: ReturnType<typeof getTithiEnergy>,
  dayEnergy: ReturnType<typeof getDayEnergy>,
  seed: number
): string {
  // Use seed for deterministic but varied selection
  const messageType = seed % 3;
  
  if (messageType === 0) {
    // Challenge message
    const template = MESSAGE_TEMPLATES.challenges[seed % MESSAGE_TEMPLATES.challenges.length];
    const tendency = traits.tendencies[seed % traits.tendencies.length];
    return template.replace('{tendency}', tendency) + ` ${zodiac}.`;
  } else if (messageType === 1) {
    // Advice message
    const template = MESSAGE_TEMPLATES.advice[seed % MESSAGE_TEMPLATES.advice.length];
    return template
      .replace('{positive}', traits.positives[seed % traits.positives.length])
      .replace('{negative}', traits.negatives[seed % traits.negatives.length])
      .replace('{action}', dayEnergy.action)
      .replace('{advice}', tithiEnergy.advice)
      .replace('{ruler}', traits.ruler)
      .replace('{dayFocus}', dayEnergy.focus)
      + ` ${zodiac}.`;
  } else {
    // Callout message
    const base = MESSAGE_TEMPLATES.callouts[seed % MESSAGE_TEMPLATES.callouts.length];
    if (base.includes('{tendency}')) {
      return base.replace('{tendency}', traits.tendencies[seed % traits.tendencies.length]) + ` ${zodiac}.`;
    }
    if (base.includes('{negative}')) {
      return base
        .replace('{negative}', traits.negatives[seed % traits.negatives.length])
        .replace('{advice}', tithiEnergy.advice)
        + ` ${zodiac}.`;
    }
    return base + ` ${zodiac}.`;
  }
}

/**
 * Generate a quirky, brutally honest horoscope for a zodiac sign
 * Uses date, tithi, and personality traits - NO EXTERNAL API
 */
export function generateVedicHoroscope(
  zodiac: string,
  date: Date = new Date(),
  tithi: number | null = null
): string {
  const traits = ZODIAC_TRAITS[zodiac];
  if (!traits) {
    return `The stars are a bit cloudy today. Open the app to refresh your horoscope. ${zodiac}.`;
  }

  // Create a seed from date for deterministic but daily-changing messages
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const zodiacIndex = Object.keys(ZODIAC_TRAITS).indexOf(zodiac);
  const seed = dayOfYear + zodiacIndex + (tithi || 0);

  const tithiEnergy = getTithiEnergy(tithi);
  const dayEnergy = getDayEnergy(date);

  // Generate two messages and combine for variety
  const msg1 = generateQuirkyMessage(zodiac, traits, tithiEnergy, dayEnergy, seed);
  const msg2 = generateQuirkyMessage(zodiac, traits, tithiEnergy, dayEnergy, seed + 7);

  // 70% chance of single message, 30% chance of combined
  if (seed % 10 < 7) {
    return msg1;
  } else {
    // Combine both messages
    return msg1.replace(` ${zodiac}.`, '') + ' ' + msg2;
  }
}

/**
 * Generate all 12 horoscopes for the day
 */
export function generateAllHoroscopes(date: Date = new Date(), tithi: number | null = null): Record<string, string> {
  const horoscopes: Record<string, string> = {};
  
  for (const zodiac of Object.keys(ZODIAC_TRAITS)) {
    horoscopes[zodiac] = generateVedicHoroscope(zodiac, date, tithi);
  }
  
  return horoscopes;
}
