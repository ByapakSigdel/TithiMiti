/**
 * Gemini API Integration for Dynamic Horoscope Generation
 * Free tier: 1,500 requests/day, 15/min
 * We use ~12 requests/day (one per zodiac)
 */

// Get your free API key from https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 'AIzaSyDPVpuIeiDKwhyXS_-Ty7Fs5rdnYWRrknM';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Generate a quirky, brutally honest horoscope for a Vedic zodiac sign
 */
export async function generateQuirkyHoroscope(zodiacSign: string): Promise<string> {
  const prompt = `You are a brutally honest, quirky astrologer writing daily horoscopes for Vedic zodiac signs. 
  
Write ONE short, sassy horoscope (2-3 sentences max) for ${zodiacSign} sign. 

Style requirements:
- Be brutally honest and direct, not sugar-coated
- Use a slightly sarcastic, witty tone
- Call out typical behaviors of this sign
- End with the sign name (e.g., "Channel that energy wisely, ${zodiacSign}.")
- Make it sound like tough love from a friend who knows them too well
- No generic positivity - be specific and real

Examples of the style:
"Stop rushing into everything without thinking. Your impulsive decisions might feel exciting but they're creating unnecessary chaos. Take a breath before you act, Mesh."
"Let go of what's no longer serving you, even if it feels comfortable. Clinging to the familiar is holding you back from better opportunities, Vrishabha."
"Not everyone is out to hurt you. Your defensive walls are keeping out the good stuff too. Let people in occasionally, Karka."

Now write ONE horoscope for ${zodiacSign} in this exact style:`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1000,
          topP: 0.95,
        },
        thinkingMode: {
          enabled: false
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error ${response.status}:`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    const horoscope = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (!horoscope) {
      console.error('No horoscope in response:', JSON.stringify(data));
      throw new Error('No horoscope generated');
    }

    return horoscope;
  } catch (error) {
    console.error(`Failed to generate horoscope for ${zodiacSign}:`, error);
    throw error;
  }
}

/**
 * Generate horoscopes for all 12 Vedic zodiac signs
 */
export async function generateAllHoroscopes(): Promise<Record<string, string>> {
  const zodiacs = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];
  const horoscopes: Record<string, string> = {};
  
  // Generate horoscopes sequentially to avoid rate limiting
  for (const zodiac of zodiacs) {
    horoscopes[zodiac] = await generateQuirkyHoroscope(zodiac);
    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return horoscopes;
}
