/**
 * Vedic Horoscope Generator
 * Generates quirky, brutally honest horoscopes using:
 * - Vedic astrology principles (tithi, nakshatra, day of week)
 * - Zodiac personality traits
 * - Algorithmic message generation with a seeded RNG so each slot
 *   (template, trait word, opener, closer, lucky line) varies independently
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

// Vedic zodiac personality traits. Each pool is deliberately generous so the
// templates can mix-and-match without feeling repetitive.
const ZODIAC_TRAITS: Record<string, ZodiacTraits> = {
  Mesh: {
    element: 'fire',
    quality: 'cardinal',
    ruler: 'Mars',
    positives: ['bold', 'energetic', 'pioneering', 'confident', 'fearless', 'driven'],
    negatives: ['impulsive', 'aggressive', 'impatient', 'reckless', 'hot-headed', 'restless'],
    tendencies: ['rushing into things', 'starting fights', 'getting bored quickly', 'ignoring consequences', 'picking battles you don\'t need', 'quitting the moment it gets slow']
  },
  Vrishabha: {
    element: 'earth',
    quality: 'fixed',
    ruler: 'Venus',
    positives: ['loyal', 'patient', 'reliable', 'practical', 'grounded', 'devoted'],
    negatives: ['stubborn', 'possessive', 'materialistic', 'resistant to change', 'inflexible', 'complacent'],
    tendencies: ['clinging to comfort', 'avoiding change', 'overindulging', 'being overly cautious', 'digging your heels in', 'hoarding what you should share']
  },
  Mithuna: {
    element: 'air',
    quality: 'mutable',
    ruler: 'Mercury',
    positives: ['adaptable', 'witty', 'curious', 'communicative', 'clever', 'quick'],
    negatives: ['indecisive', 'superficial', 'gossipy', 'inconsistent', 'scattered', 'restless'],
    tendencies: ['overthinking everything', 'spreading yourself too thin', 'changing your mind constantly', 'avoiding commitment', 'talking instead of doing', 'chasing every shiny new idea']
  },
  Karka: {
    element: 'water',
    quality: 'cardinal',
    ruler: 'Moon',
    positives: ['nurturing', 'intuitive', 'protective', 'emotional', 'caring', 'loyal'],
    negatives: ['moody', 'oversensitive', 'clingy', 'defensive', 'brooding', 'guarded'],
    tendencies: ['taking things personally', 'building walls', 'holding grudges', 'living in the past', 'mothering people who didn\'t ask', 'reading too much into a text']
  },
  Simha: {
    element: 'fire',
    quality: 'fixed',
    ruler: 'Sun',
    positives: ['confident', 'generous', 'charismatic', 'creative', 'warm', 'magnetic'],
    negatives: ['arrogant', 'attention-seeking', 'dramatic', 'domineering', 'prideful', 'vain'],
    tendencies: ['making everything about you', 'demanding admiration', 'refusing to admit mistakes', 'being overdramatic', 'sulking when ignored', 'turning a chat into a TED talk']
  },
  Kanya: {
    element: 'earth',
    quality: 'mutable',
    ruler: 'Mercury',
    positives: ['analytical', 'helpful', 'organized', 'practical', 'precise', 'diligent'],
    negatives: ['critical', 'perfectionist', 'anxious', 'judgmental', 'fussy', 'self-doubting'],
    tendencies: ['overthinking details', 'criticizing everyone', 'worrying constantly', 'nitpicking minor flaws', 'redoing work that was already fine', 'apologizing for things you didn\'t do']
  },
  Tula: {
    element: 'air',
    quality: 'cardinal',
    ruler: 'Venus',
    positives: ['diplomatic', 'fair', 'social', 'harmonious', 'charming', 'graceful'],
    negatives: ['indecisive', 'people-pleasing', 'superficial', 'avoidant', 'conflict-shy', 'wishy-washy'],
    tendencies: ['avoiding conflict at all costs', 'sacrificing your needs', 'being fake nice', 'never picking a side', 'agreeing just to keep peace', 'asking everyone but yourself']
  },
  Vrishchika: {
    element: 'water',
    quality: 'fixed',
    ruler: 'Mars',
    positives: ['passionate', 'resourceful', 'brave', 'loyal', 'magnetic', 'intense'],
    negatives: ['jealous', 'secretive', 'vengeful', 'controlling', 'suspicious', 'brooding'],
    tendencies: ['holding grudges forever', 'testing people', 'being suspicious', 'seeking revenge', 'keeping score nobody asked for', 'mistaking control for love']
  },
  Dhanu: {
    element: 'fire',
    quality: 'mutable',
    ruler: 'Jupiter',
    positives: ['optimistic', 'adventurous', 'honest', 'philosophical', 'open-minded', 'free-spirited'],
    negatives: ['tactless', 'irresponsible', 'overconfident', 'preachy', 'flaky', 'blunt'],
    tendencies: ['saying things without thinking', 'running away from commitment', 'being brutally honest at wrong times', 'lecturing everyone', 'overpromising and under-showing-up', 'booking the trip before checking the budget']
  },
  Makara: {
    element: 'earth',
    quality: 'cardinal',
    ruler: 'Saturn',
    positives: ['ambitious', 'disciplined', 'responsible', 'patient', 'dependable', 'strategic'],
    negatives: ['pessimistic', 'cold', 'rigid', 'workaholic', 'guarded', 'joyless'],
    tendencies: ['being too serious', 'prioritizing work over people', 'expecting the worst', 'refusing to have fun', 'measuring your worth in output', 'declining the invite to grind some more']
  },
  Kumbha: {
    element: 'air',
    quality: 'fixed',
    ruler: 'Saturn',
    positives: ['innovative', 'independent', 'humanitarian', 'intellectual', 'original', 'visionary'],
    negatives: ['detached', 'stubborn', 'aloof', 'unpredictable', 'contrarian', 'emotionally distant'],
    tendencies: ['emotionally distancing yourself', 'being contrarian for no reason', 'ignoring feelings', 'rejecting help', 'intellectualizing your way out of a hug', 'ghosting when things get close']
  },
  Meen: {
    element: 'water',
    quality: 'mutable',
    ruler: 'Jupiter',
    positives: ['compassionate', 'artistic', 'intuitive', 'spiritual', 'gentle', 'imaginative'],
    negatives: ['escapist', 'oversensitive', 'vague', 'martyr-complex', 'dreamy', 'avoidant'],
    tendencies: ['escaping reality', 'playing victim', 'being overly sacrificial', 'losing yourself in others', 'daydreaming past the deadline', 'absorbing everyone else\'s moods as your own']
  }
};

// Message templates for different cosmic energies (tithi-based)
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

// Painting mood themes. The widget maps each to a bundled painterly
// background, and the app fetches a real painting whose vibe matches.
export type HoroscopeMood = 'fiery' | 'earthy' | 'airy' | 'watery' | 'stormy' | 'radiant';

const ELEMENT_MOOD: Record<ZodiacTraits['element'], HoroscopeMood> = {
  fire: 'fiery',
  earth: 'earthy',
  air: 'airy',
  water: 'watery',
};

type MessageCategory = 'challenge' | 'advice' | 'callout' | 'prediction' | 'praise';

// Harsh tones get a stormy canvas; encouraging tones get a radiant one;
// everything else paints with the sign's elemental colors.
function moodForCategory(category: MessageCategory, element: ZodiacTraits['element']): HoroscopeMood {
  if (category === 'challenge' || category === 'callout') return 'stormy';
  if (category === 'advice' || category === 'praise') return 'radiant';
  return ELEMENT_MOOD[element] ?? 'airy';
}

// Playful, varied message templates. Placeholders are filled from the sign's
// traits + the day's cosmic energy. Keys available to every template:
//   {tendency} {positive} {negative}  - from the sign
//   {ruler}                            - the sign's ruling planet
//   {action} {dayFocus} {planet}       - from the weekday energy
//   {advice} {warning} {energy}        - from the tithi (moon phase) energy
//   {quality} {element}                - the sign's modality / element
//   {time}                             - a time-of-day hint
const MESSAGE_TEMPLATES: Record<MessageCategory, string[]> = {
  challenge: [
    "Stop {tendency}. The cosmos filed a formal complaint.",
    "Your habit of {tendency} is doing cardio while your goals nap on the couch.",
    "{tendency}? Bold choice. Wrong, but bold.",
    "The universe is tired of watching you {tendency}. Honestly, same.",
    "That thing where you keep {tendency}? Today's the day you quit cold turkey.",
    "Mercury didn't go retrograde just so you could keep {tendency}.",
    "Plot twist: {tendency} is not a personality trait. Set it down.",
    "If {tendency} were an Olympic sport you'd have gold. Now retire undefeated.",
    "{ruler} is side-eyeing your talent for {tendency}. Quit while you're ahead.",
    "Being {negative} again? The stars rolled their eyes so hard they realigned.",
    "Today the {energy} energy wants you to drop {tendency} like a bad habit. Because it is one.",
    "Your {negative} streak called. It wants a day off. Give it one.",
    "Less {tendency}, more {action}. The math really isn't hard.",
    "You keep {tendency} and calling it 'just how I am.' The planets disagree.",
    "The {planet} hour exposes your {negative} side. Don't feed it.",
    "Newsflash: {tendency} has never once worked out for you. Check the receipts.",
    "Stop running on {negative} autopilot today. {warning}.",
    "{tendency} again? Even your guardian planet {ruler} needs a break.",
    "Your {element}-sign confidence is great until it curdles into {negative}. Watch that line.",
    "The thing you call 'being real' is just {tendency} wearing a disguise. Take it off.",
  ],
  advice: [
    "Channel that {positive} energy into {action}. You might surprise yourself.",
    "Your {positive} side is the main character today. Let it {action}.",
    "Be {positive}, not {negative}. {advice}, and watch a door swing open.",
    "The stars whisper one word: {action}. Your ruler {ruler} cosigns.",
    "Today's {dayFocus} vibe was built for you to {action}. Go on.",
    "Lead with {positive}. The {negative} version of you can sit this round out.",
    "Small move, big ripple: {action} today and your future self sends thanks.",
    "Trust the {positive} instinct over the {negative} fear. {advice}.",
    "The {energy} energy favors the bold: {action} before the day gets loud.",
    "Put your {positive} foot forward. {planet} is lighting the path today.",
    "Don't overthink it. Be {positive}, {action}, repeat.",
    "{advice}. Your {positive} nature handles the rest.",
    "A {positive} heart and a clear head — that's today's entire strategy. {action}.",
    "Let {ruler} guide you. {advice} and stop negotiating with your fears.",
    "The day rewards {positive} people who {action}. That's literally you.",
    "Tune out the {negative} voice. Tune in to the {positive} one. Then {action}.",
    "{warning}, sure — but mostly just {action} and trust your {positive} streak.",
    "Your {quality} nature wants to {action} today. Honor it instead of fighting it.",
    "One {positive} decision early changes the whole shape of the day. {action}.",
    "Stop polishing the plan. {action}. {advice}.",
  ],
  callout: [
    "Not everything is about you. (Okay, today a little of it is.)",
    "That grudge is renting space in your head rent-free. Time to evict.",
    "Stop waiting for perfect. Perfect is stuck in traffic and not coming.",
    "Your {tendency} is showing again. Gently tuck it back in.",
    "Being {negative} is a full-time job with terrible pay. Consider quitting.",
    "You've now read this twice. Close the app and go {action}.",
    "The thing you're avoiding? It's smaller than the dread. {action} already.",
    "You're {positive} and you know it. So why are you acting {negative}?",
    "Spoiler: nobody's thinking about your mistake as much as you are.",
    "Your comfort zone called; it's getting a little crowded in there.",
    "Stop rehearsing the argument in your head. {action} instead.",
    "You promised yourself you'd {action}. {ruler} remembers, even if you don't.",
    "The {energy} energy says: less scrolling, more living. Yes, this counts.",
    "You're allowed to {action} without asking permission. Shocking, I know.",
    "Quit waiting to feel ready. Ready is a myth {negative} people invented.",
    "That 'I'll do it tomorrow' has a suspicious number of yesterdays attached.",
  ],
  prediction: [
    "Someone tests your patience by {time}. Pass the exam with a smile.",
    "An unexpected message lands today. Reply with your {positive} face on.",
    "Money, a snack, or a sincere compliment is heading your way. Stay open.",
    "A tiny win is hiding inside a boring task. {action} to uncover it.",
    "The {dayFocus} energy slips a small plot twist into your {time}. Roll with it.",
    "Your future self left a note: '{action} today, trust me on this.'",
    "Luck leans toward the {positive} around {time}. Make sure you show up.",
    "By nightfall one worry shrinks back to its actual size: pretty small.",
    "Around {time}, a door you assumed was locked turns out to be open.",
    "A {positive} stranger crosses your path by {time}. Say hello.",
    "{planet} sends a coincidence dressed as an accident around {time}. Notice it.",
    "Something you lost — an item, a mood, a friend — circles back this week.",
    "Expect a small {energy} moment near {time}. Let it land.",
    "Today's quiet plot twist: you change your mind about something by {time}, and you're right to.",
    "A conversation around {time} matters more than it looks. Be present.",
    "The {element} in you stirs around {time}. Follow it one honest step.",
    "An old idea resurfaces today wearing better clothes. Give it a second look.",
  ],
  praise: [
    "Your {positive} energy is genuinely magnetic today. People can tell.",
    "You've been quietly {positive} lately. The universe noticed. Keep going.",
    "Today rewards your {positive} streak. Go ahead and take the bow.",
    "Rare alignment: you're actually right about the thing. Act on it.",
    "Your ruler {ruler} is proud. {action} and ride the momentum.",
    "You handled something hard with grace recently. {planet} saw. Respect.",
    "That {positive} thing you do without noticing? It's your superpower today.",
    "You're in your {positive} era and it shows. Don't dim it for anyone.",
    "The {energy} energy and your {positive} nature are finally on the same team.",
    "Give yourself credit: being {positive} when it's hard is the whole flex.",
    "You've grown more {positive} than you realize. {planet} kept the receipts.",
    "Today the room tilts toward the {positive}. Good thing that's your default.",
  ],
};

// Optional lead-in fragments (end with punctuation so they glue to the body).
const OPENERS = [
  'Cosmic memo:',
  'Real talk:',
  "Today's forecast:",
  'Heads up:',
  'Star tip:',
  'Note from the universe:',
  'Quick read:',
  'Between us:',
  'Listen —',
  'Okay, so:',
];

// Optional closing nudges (standalone sentences).
const CLOSERS = [
  'Trust the timing.',
  "You've got this.",
  'The stars are rooting for you.',
  'Breathe, then begin.',
  'Small steps still count.',
  "Don't overthink the rest.",
  'Eyes up, shoulders back.',
  "Today's yours if you claim it.",
  'Proceed accordingly.',
  'The rest is just noise.',
  'Onward.',
  'No notes — just go.',
];

const LUCKY_COLORS = ['crimson', 'indigo', 'gold', 'emerald', 'ivory', 'charcoal', 'saffron', 'teal', 'plum', 'amber', 'turquoise', 'maroon', 'olive', 'rose', 'cobalt'];
const TIME_HINTS = ['noon', '3 PM', 'this evening', 'sundown', 'late afternoon', 'mid-morning', 'just after lunch', 'the golden hour', 'twilight', 'first light'];
const LUCKY_DIRECTIONS = ['east', 'north', 'south-west', 'north-east', 'west'];

// --- Seeded RNG ----------------------------------------------------------
// mulberry32: fast, deterministic, well-mixed. Each draw advances the stream
// so successive picks (template, words, opener, closer) vary independently.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function luckyLine(rng: () => number): string {
  const color = pick(rng, LUCKY_COLORS);
  const num = 1 + Math.floor(rng() * 9);
  // ~half the time also drop a lucky direction for extra variety.
  if (rng() < 0.5) {
    const dir = pick(rng, LUCKY_DIRECTIONS);
    return `Lucky color: ${color}. Lucky number: ${num}. Face ${dir} for the big stuff.`;
  }
  return `Lucky color: ${color}. Lucky number: ${num}.`;
}

function fillTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? '');
}

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

const CATEGORIES: MessageCategory[] = ['challenge', 'advice', 'callout', 'prediction', 'praise'];

export interface RichHoroscope {
  message: string;
  mood: HoroscopeMood;
}

/**
 * Generate a playful horoscope plus the painting mood it should wear.
 * Deterministic per day/zodiac/tithi - NO EXTERNAL API.
 */
export function generateRichHoroscope(
  zodiac: string,
  date: Date = new Date(),
  tithi: number | null = null
): RichHoroscope {
  const traits = ZODIAC_TRAITS[zodiac];
  if (!traits) {
    return { message: 'The stars are a bit cloudy today. Open the app to refresh your horoscope.', mood: 'airy' };
  }

  // Deterministic but daily-changing seed, well-mixed across sign/day/tithi so
  // neighbouring signs and consecutive days don't read alike.
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const zodiacIndex = Object.keys(ZODIAC_TRAITS).indexOf(zodiac);
  const year = date.getFullYear();
  const seed =
    (Math.imul(dayOfYear + 1, 2654435761) ^
      Math.imul(zodiacIndex + 1, 40503) ^
      Math.imul((tithi || 7) + 1, 2246822519) ^
      Math.imul(year, 668265263)) >>> 0;
  const rng = makeRng(seed);

  const tithiEnergy = getTithiEnergy(tithi);
  const dayEnergy = getDayEnergy(date);

  const category = pick(rng, CATEGORIES);
  const template = pick(rng, MESSAGE_TEMPLATES[category]);

  const ctx: Record<string, string> = {
    tendency: pick(rng, traits.tendencies),
    positive: pick(rng, traits.positives),
    negative: pick(rng, traits.negatives),
    action: dayEnergy.action,
    dayFocus: dayEnergy.focus,
    planet: dayEnergy.planet,
    advice: tithiEnergy.advice,
    warning: tithiEnergy.warning,
    energy: tithiEnergy.energy,
    ruler: traits.ruler,
    quality: traits.quality,
    element: traits.element,
    time: pick(rng, TIME_HINTS),
  };

  let message = fillTemplate(template, ctx);

  // Optional lead-in (~45% of days).
  if (rng() < 0.45) {
    message = `${pick(rng, OPENERS)} ${message}`;
  }

  // Optional closing nudge (~45% of days).
  if (rng() < 0.45) {
    message = `${message} ${pick(rng, CLOSERS)}`;
  }

  // Optional lucky tagline (~35% of days).
  if (rng() < 0.35) {
    message = `${message} ${luckyLine(rng)}`;
  }

  return { message, mood: moodForCategory(category, traits.element) };
}

/**
 * Backwards-compatible string-only horoscope.
 */
export function generateVedicHoroscope(
  zodiac: string,
  date: Date = new Date(),
  tithi: number | null = null
): string {
  return generateRichHoroscope(zodiac, date, tithi).message;
}

/**
 * Generate all 12 rich horoscopes for the day.
 */
export function generateAllRichHoroscopes(
  date: Date = new Date(),
  tithi: number | null = null
): Record<string, RichHoroscope> {
  const horoscopes: Record<string, RichHoroscope> = {};
  for (const zodiac of Object.keys(ZODIAC_TRAITS)) {
    horoscopes[zodiac] = generateRichHoroscope(zodiac, date, tithi);
  }
  return horoscopes;
}

/**
 * Generate all 12 horoscopes for the day (message strings only).
 */
export function generateAllHoroscopes(date: Date = new Date(), tithi: number | null = null): Record<string, string> {
  const horoscopes: Record<string, string> = {};
  for (const zodiac of Object.keys(ZODIAC_TRAITS)) {
    horoscopes[zodiac] = generateRichHoroscope(zodiac, date, tithi).message;
  }
  return horoscopes;
}
