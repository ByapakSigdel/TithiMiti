export interface GoldSilverPrices {
  date: string;
  goldHallmarkTola: string;
  goldTajabiTola: string;
  silverTola: string;
  goldHallmark10g: string;
  goldTajabi10g: string;
  silver10g: string;
}

export async function fetchHamroPatroGoldSilver(): Promise<GoldSilverPrices> {
  const url = 'https://www.hamropatro.com/gold';
  
  // Fetch HTML using native fetch API
  const response = await fetch(url);
  const html = await response.text();

  // Use regex to extract the prices directly from HTML
  const goldHallmarkTola = html.match(/Gold Hallmark - tola[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const goldTajabiTola = html.match(/Gold Tajabi - tola[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const silverTola = html.match(/Silver - tola[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const goldHallmark10g = html.match(/Gold Hallmark - 10g[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const goldTajabi10g = html.match(/Gold Tajabi - 10g[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const silver10g = html.match(/Silver - 10g[^N]*Nrs\.\s*([\d,.]+)/)?.[1] || '0';
  const date = html.match(/Last Updated:\s*([^<]+)/)?.[1]?.trim() || '';

  return {
    date,
    goldHallmarkTola,
    goldTajabiTola,
    silverTola,
    goldHallmark10g,
    goldTajabi10g,
    silver10g,
  };
}
