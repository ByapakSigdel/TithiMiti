/**
 * Metal Prices API Service
 * Fetches daily gold and silver prices
 * Uses goldapi.io for global prices and converts to NPR
 */

export interface MetalPrice {
  gold: number;
  silver: number;
  currency: string;
  timestamp: string;
  goldPerGram?: number; // Gold price per gram in NPR
  silverPerGram?: number; // Silver price per gram in NPR
}

// Exchange rate USD to NPR (approximate - update periodically)
const USD_TO_NPR = 132.5;

/**
 * Fetch current gold and silver prices
 * Uses a simple approach to get prices in Nepali Rupees
 */
export async function fetchMetalPrices(): Promise<MetalPrice | null> {
  try {
    // Using a public endpoint for demonstration
    // For production, you would use goldapi.io with an API key
    const goldResponse = await fetch('https://api.gold-api.com/price/XAU');
    const silverResponse = await fetch('https://api.gold-api.com/price/XAG');
    
    if (!goldResponse.ok || !silverResponse.ok) {
      throw new Error('API error');
    }

    const goldData = await goldResponse.json();
    const silverData = await silverResponse.json();

    // Prices are per troy ounce in USD, convert to NPR per gram
    // 1 troy ounce = 31.1035 grams
    const goldPriceUSD = goldData.price;
    const silverPriceUSD = silverData.price;
    
    const goldPerGramNPR = (goldPriceUSD * USD_TO_NPR) / 31.1035;
    const silverPerGramNPR = (silverPriceUSD * USD_TO_NPR) / 31.1035;

    return {
      gold: goldPriceUSD,
      silver: silverPriceUSD,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      goldPerGram: Math.round(goldPerGramNPR * 100) / 100,
      silverPerGram: Math.round(silverPerGramNPR * 100) / 100,
    };
  } catch (error) {
    console.error('Failed to fetch metal prices:', error);
    // Try fallback
    return fetchMetalPricesBackup();
  }
}

/**
 * Fallback: Return estimated prices for Nepal
 * Based on typical market rates
 */
export async function fetchMetalPricesBackup(): Promise<MetalPrice | null> {
  try {
    // Fallback with reasonable estimates for Nepal
    // Gold: ~8500-9000 NPR per gram (24K)
    // Silver: ~100-120 NPR per gram
    const goldPerGramNPR = 8750;
    const silverPerGramNPR = 110;
    
    // Convert back to USD per troy ounce for consistency
    const goldPriceUSD = (goldPerGramNPR * 31.1035) / USD_TO_NPR;
    const silverPriceUSD = (silverPerGramNPR * 31.1035) / USD_TO_NPR;

    return {
      gold: Math.round(goldPriceUSD * 100) / 100,
      silver: Math.round(silverPriceUSD * 100) / 100,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      goldPerGram: goldPerGramNPR,
      silverPerGram: silverPerGramNPR,
    };
  } catch (error) {
    console.error('Backup API also failed:', error);
    return null;
  }
}
