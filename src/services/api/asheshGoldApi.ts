import { fetchTextWithTimeout, formatNprAmount, GoldSilverPrices } from './hamroPatroGoldApi';

/**
 * Fallback gold/silver source: ashesh.com.np serves a plain HTML table with
 * all six values (hallmark/tajabi/silver x tola/10g) and has kept the same
 * markup for years. Parsed from tag-stripped text so cosmetic HTML changes
 * don't break it.
 */
export async function fetchAsheshGoldSilver(): Promise<GoldSilverPrices> {
  const html = await fetchTextWithTimeout('https://www.ashesh.com.np/gold/');

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  const toNum = (m: RegExpMatchArray | null) =>
    m ? parseFloat(m[1].replace(/,/g, '')) : undefined;

  const goldTola = toNum(text.match(/Gold Hallmark[^R]{0,120}?Rs\s*([\d,]+)\s*Tola/i));
  const tajabiTola = toNum(text.match(/Gold Tajabi\s*Rs\s*([\d,]+)\s*Tola/i));
  const silverTola = toNum(text.match(/Silver\s*Rs\s*([\d,]+)\s*Tola/i));
  const gold10g = toNum(text.match(/Gold Hallmark[^R]{0,120}?Rs\s*([\d,]+)\s*10 gram/i));
  const tajabi10g = toNum(text.match(/Gold Tajabi\s*Rs\s*([\d,]+)\s*10 gram/i));
  const silver10g = toNum(text.match(/Silver\s*Rs\s*([\d,]+)\s*10 gram/i));

  const date =
    text.match(/updated on\s*(\d{1,2}\s+\w+\s+\d{4})/i)?.[1] ||
    text.match(/(\d{1,2}-\w{3}-\d{4})/)?.[1] ||
    '';

  return {
    date,
    goldHallmarkTola: formatNprAmount(goldTola),
    goldTajabiTola: formatNprAmount(tajabiTola),
    silverTola: formatNprAmount(silverTola),
    goldHallmark10g: formatNprAmount(gold10g),
    goldTajabi10g: formatNprAmount(tajabi10g),
    silver10g: formatNprAmount(silver10g),
    source: 'ashesh',
  };
}
