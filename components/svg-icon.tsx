import React from 'react';
import { SvgXml } from 'react-native-svg';

interface SvgIconProps {
  name: 'stat' | 'chat-duotone' | 'calendar-add';
  size?: number;
  color?: string;
}

const SVG_TEMPLATES: Record<SvgIconProps['name'], (color: string) => string> = {
  stat: (c) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="18" y="7" width="4" height="13" rx="1" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
<rect x="10" y="13" width="4" height="7" rx="1" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
<rect x="2" y="9" width="4" height="11" rx="1" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>
</svg>`,
  'chat-duotone': (c) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 12C20 8.22876 20 6.34315 18.8284 5.17157C17.6569 4 15.7712 4 12 4C8.22876 4 6.34315 4 5.17157 5.17157C4 6.34315 4 8.22876 4 12V18C4 18.9428 4 19.4142 4.29289 19.7071C4.58579 20 5.05719 20 6 20H12C15.7712 20 17.6569 20 18.8284 18.8284C20 17.6569 20 15.7712 20 12Z" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="1.6"/>
<path d="M9 10L15 10" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 14H12" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  'calendar-add': (c) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M19.5 9.5V8.7C19.5 7.57989 19.5 7.01984 19.282 6.59202C19.0903 6.21569 18.7843 5.90973 18.408 5.71799C17.9802 5.5 17.4201 5.5 16.3 5.5H7.7C6.5799 5.5 6.01984 5.5 5.59202 5.71799C5.21569 5.90973 4.90973 6.21569 4.71799 6.59202C4.5 7.01984 4.5 7.57989 4.5 8.7V9.5M19.5 9.5V16.3C19.5 17.4201 19.5 17.9802 19.282 18.408C19.0903 18.7843 18.7843 19.0903 18.408 19.282C17.9802 19.5 17.4201 19.5 16.3 19.5H7.7C6.57989 19.5 6.01984 19.5 5.59202 19.282C5.21569 19.0903 4.90973 18.7843 4.71799 18.408C4.5 17.9802 4.5 17.4201 4.5 16.3V9.5M19.5 9.5H4.5" stroke="${c}" stroke-width="1.6"/>
<path d="M8.5 3.5L8.5 7.5M15.5 3.5L15.5 7.5" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M12 17L12 12" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
<path d="M14.5 14.5L9.5 14.5" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>
</svg>`,
};

export function SvgIcon({ name, size = 28, color = '#000' }: SvgIconProps) {
  const xml = SVG_TEMPLATES[name](color);
  return <SvgXml xml={xml} width={size} height={size} />;
}
