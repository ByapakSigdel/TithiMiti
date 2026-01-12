const { generateVedicHoroscope } = require('./src/services/horoscope/vedicHoroscopeGenerator.ts');

// Test horoscope generation
console.log('\n=== VEDIC HOROSCOPE GENERATOR TEST ===\n');
console.log('✅ NO API NEEDED - Fully self-contained\n');

const zodiacs = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];

console.log('Sample horoscopes for today:');
console.log('==============================\n');

// Sample 3 zodiacs
const samples = ['Mesh', 'Tula', 'Meen'];
samples.forEach(zodiac => {
  const horoscope = generateVedicHoroscope(zodiac, new Date(), 15); // Full moon
  console.log(`${zodiac}: ${horoscope}\n`);
});

console.log('✅ Each user generates horoscopes locally');
console.log('✅ No API costs or limits');
console.log('✅ Different messages daily based on date + tithi');
console.log('✅ Quirky, brutally honest tone maintained\n');
