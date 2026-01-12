import { Asset } from 'expo-asset';
import React from 'react';
import { SvgXml } from 'react-native-svg';

interface SvgIconProps {
  name: 'stat' | 'chat-duotone' | 'calendar-add';
  size?: number;
  color?: string;
}

const svgIcons = {
  stat: require('@/assets/images/Stat.svg'),
  'chat-duotone': require('@/assets/images/Chat_alt_duotone_line.svg'),
  'calendar-add': require('@/assets/images/Calendar_add_light.svg'),
};

export function SvgIcon({ name, size = 28, color = '#000' }: SvgIconProps) {
  const [svgContent, setSvgContent] = React.useState<string>('');

  React.useEffect(() => {
    const loadSvg = async () => {
      try {
        const asset = Asset.fromModule(svgIcons[name]);
        await asset.downloadAsync();
        const response = await fetch(asset.localUri || asset.uri);
        let svg = await response.text();
        
        // Replace fill/stroke colors with the provided color
        svg = svg.replace(/fill="[^"]*"/g, `fill="${color}"`);
        svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
        
        setSvgContent(svg);
      } catch (error) {
        console.error('Failed to load SVG:', error);
      }
    };
    loadSvg();
  }, [name, color]);

  if (!svgContent) return null;

  return <SvgXml xml={svgContent} width={size} height={size} />;
}
