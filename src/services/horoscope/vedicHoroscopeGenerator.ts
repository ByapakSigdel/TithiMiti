/**
 * Vedic Horoscope Generator
 * Generates playful, very-online "chaotic bestie" horoscopes using:
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
    "the stars said be {positive} today and you said 'no thx' and went right back to {tendency}. babe.",
    "{tendency} AGAIN?? we literally talked about this. the cosmos took notes and everything.",
    "you have {tendency} the way other people have hobbies. terrifying. unsubscribe.",
    "mercury is NOT retrograde, you just need to stop {tendency}. those are two different problems.",
    "the universe filed a report. subject line: '{tendency}, once more.' please respond.",
    "imagine being this {negative} on a {energy} day. couldn't be— oh. oh it's you.",
    "{ruler} pulled your stats and it's just {tendency} as far as the eye can see. seek help (mine).",
    "today's forecast: 100% chance of you {tendency} and calling it self care. it is not self care.",
    "you're {negative} again and the planets are too tired to even react. that's the real curse.",
    "the {energy} energy is RIGHT THERE and you picked {tendency}. picked it. on purpose. wow.",
    "stop {tendency}. i mean it, {ruler} means it, your future self is on the floor begging.",
    "being {negative} is not the lore drop you think it is. retire the bit, bestie.",
    "you and {tendency} need to break up. it's not even toxic-fun anymore, just toxic.",
    "the planets aligned SPECIFICALLY to watch you {tendency} and they are not entertained today.",
    "'it's just how i am' is a wild excuse for {tendency}. growth is free. it's literally free.",
    "less {negative}, more {action}. i drew you a chart. it's one arrow pointing away from {tendency}.",
    "the {planet} hour is exposing your {negative} side like a group chat screenshot. behave.",
    "you keep {tendency} like the receipts won't surface. they always surface. always.",
    "{tendency} is doing the absolute most while your goals do the absolute least. fix the ratio.",
    "today the cosmos gently (violently) suggests you stop being {negative}. for one day. just try.",
  ],
  advice: [
    "ok listen: be {positive}, {action} a little, log off, win. that's the whole horoscope today.",
    "the stars say {action} and for once they're not being cryptic about it. so. go.",
    "channel the {positive} energy, bestie. the {negative} version of you can wait in the car.",
    "{ruler} said {action} and {ruler} has never been wrong about you (we don't talk about tuesday).",
    "today's plan: be {positive}, {action}, refuse to spiral. revolutionary. you're welcome.",
    "{advice}. that's it. that's the cosmic wisdom. can't believe they pay me for this.",
    "lead with {positive} and let the {negative} thoughts buffer forever. no wifi for them.",
    "the {energy} energy is on your side today, which is rare, so {action} before it changes its mind.",
    "small move, huge plot armor: {action} today and watch the timeline reroute in your favor.",
    "trust the {positive} instinct over the {negative} panic. the panic lies. the panic always lies.",
    "you're {quality}-coded so {action}-ing today isn't optional, it's literally your design spec.",
    "stop refreshing the plan. {action}. {advice}. the plan was never the problem, the scrolling was.",
    "be {positive} on purpose today. fake it til {ruler} makes it real. it works, i checked.",
    "tune out the {negative} voice (it's a hater) and {action}. the {positive} voice has better taste.",
    "{warning}, technically. but mostly just {action} and trust your {positive} streak, it's been cooking.",
    "one {positive} decision before {time} and the whole day reorganizes itself around you. flex.",
    "the day literally rewards {positive} people who {action}. that's you. that's the assignment. go.",
  ],
  callout: [
    "not everything is about you. (today, like, 12% is. enjoy responsibly.)",
    "that grudge is living in your head rent free AND eating your snacks. evict it.",
    "you've read this twice now. close the app, go {action}. i'll still be here judging.",
    "the thing you're avoiding is smaller than the dread you built around it. it's giving haunted house.",
    "your {tendency} is showing. not in the cute way. tuck it back in.",
    "being {negative} is a full-time unpaid internship. quit. log the hours as character development.",
    "you're {positive} and you KNOW it so why are you out here acting {negative}. for who. for WHAT.",
    "spoiler: nobody remembers the embarrassing thing except you, replaying it nightly in 4k.",
    "your comfort zone is at capacity. fire marshal {ruler} says somebody has to leave (it's you).",
    "stop rehearsing the argument in the shower and {action} instead. the shower can't even respond.",
    "you promised yourself you'd {action} today. {ruler} remembers. {ruler} writes EVERYTHING down.",
    "the {energy} energy says less doomscrolling, more living. and yes, opening this app counts. barely.",
    "you're allowed to {action} without a permission slip. shocking. wild. unprecedented, even.",
    "'i'll do it tomorrow' has a suspicious number of yesterdays stacked behind it. just saying.",
    "ready is fake. {negative} people invented it to stall. {action} unready like the rest of us.",
    "today's the day you stop {tendency}. or it isn't. but wouldn't that be so sexy of you though.",
  ],
  prediction: [
    "someone tests your patience by {time}. pass the exam. do NOT show your work (or the receipts).",
    "unexpected text incoming. reply with your {positive} face on, not the {negative} 3am one.",
    "money, a snack, or a random compliment is heading your way. stay open. stay hungry.",
    "a tiny win is hiding in a boring task like a prize in cereal. {action} to dig it out.",
    "the {dayFocus} energy slips a plot twist into your {time}. it's a good one. mostly. probably.",
    "your future self left a sticky note: '{action} today. trust me. i'm you but slightly smarter.'",
    "luck leans {positive} around {time}. be there. don't be in your room overthinking. be THERE.",
    "by tonight one worry shrinks back to actual size, which is. tiny. embarrassing, even.",
    "around {time} a door you swore was locked is just... open. has been the whole time. anyway.",
    "a {positive} stranger crosses your path by {time}. say hi. or don't and write a poem about it.",
    "{planet} sends a coincidence disguised as an accident around {time}. notice it. it's the sign.",
    "something you lost — a thing, a mood, a person — does a little loop and circles back this week.",
    "expect a small {energy} moment near {time}. let it land. don't intellectualize it to death.",
    "you change your mind about something by {time} and (rare) you're actually right to. trust it.",
    "a convo around {time} matters more than it's dressed for. be present. put the phone DOWN.",
    "an old idea resurfaces today in better fits. give it a second look, it glowed up.",
  ],
  praise: [
    "your {positive} energy is genuinely insane today (good insane). people can feel it. iconic.",
    "you've been quietly {positive} lately and the universe SAW. screenshot saved. keep going.",
    "today rewards your {positive} streak so take the bow. take two. milk it. you earned it.",
    "rare cosmic event: you're right about the thing. ACT on it before the doubt logs back in.",
    "{ruler} is so proud it's a little embarrassing actually. {action} and ride the high.",
    "you handled something hard with grace recently and {planet} clocked it. quiet legend behavior.",
    "that {positive} thing you do without noticing? superpower. today especially. don't nerf yourself.",
    "you're in your {positive} era and it's SO obvious. do not dim it for some {negative} side character.",
    "the {energy} energy and your {positive} nature, finally on the same team. unstoppable. slightly scary.",
    "give yourself the credit. being {positive} when it's hard is the entire flex, and you did that.",
    "you've grown more {positive} than you clock. {planet} kept every receipt. it's a thick folder.",
    "the whole room tilts {positive} today and good news: that's just your factory setting.",
  ],
};

// Optional lead-in fragments (end with punctuation so they glue to the body).
const OPENERS = [
  'cosmic memo:',
  'real talk:',
  "today's forecast:",
  'heads up bestie:',
  'star tip:',
  'note from the universe:',
  'ok so:',
  'between us:',
  'listen.',
  'breaking:',
  'psa:',
  'hot off the planets:',
];

// Optional closing nudges (standalone sentences).
const CLOSERS = [
  'trust the timing or whatever.',
  "you've got this. probably. yes.",
  'the stars are rooting for you (low stakes, but still).',
  'breathe, then go be a menace (gently).',
  'small steps still count, drama queen.',
  "don't overthink the rest, i'm begging.",
  'eyes up, phone down.',
  "today's yours if you actually claim it.",
  'proceed chaotically but responsibly.',
  'the rest is just noise and you know it.',
  'onward, you absolute legend.',
  'no notes. just go. shoo.',
  'anyway. slay, i guess.',
  'log off and live a little.',
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
    return `lucky color: ${color}. lucky number: ${num}. face ${dir} for the big stuff (i don't make the rules).`;
  }
  return `lucky color: ${color}. lucky number: ${num}. don't ask, just trust.`;
}

function fillTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => ctx[key] ?? '');
}

/**
 * Approximate the lunar day (tithi, 1-30) from the date when the caller has no
 * real tithi at hand. Uses the mean synodic month from a known new-moon epoch
 * (2000-01-06 18:14 UTC) — accurate to within a day or so, which is plenty for
 * picking a moon-phase energy. Keeps messages deterministic per day.
 */
function approximateTithi(date: Date): number {
  const NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);
  const SYNODIC_MONTH_DAYS = 29.530588853;
  const daysSince = (date.getTime() - NEW_MOON_EPOCH_MS) / 86400000;
  const phase = ((daysSince % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  return Math.min(30, Math.floor((phase / SYNODIC_MONTH_DAYS) * 30) + 1);
}

function getTithiEnergy(tithi: number): { energy: string; advice: string; warning: string } {
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
    return { message: "the stars are buffering today, bestie. open the app to refresh your horoscope.", mood: 'airy' };
  }

  // No real tithi supplied (or out of range): approximate it from the moon
  // phase so templates never interpolate a literal "unknown" energy.
  const effectiveTithi =
    tithi && tithi >= 1 && tithi <= 30 ? tithi : approximateTithi(date);

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

  const tithiEnergy = getTithiEnergy(effectiveTithi);
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
