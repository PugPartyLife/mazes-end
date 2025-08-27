// Magic color data and combination mappings
import type { MagicColor, ColorCombination } from '../types';

export const magicColors: MagicColor[] = [
  { id: 'W', name: 'White', symbol: 'W', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', textColor: 'text-gray-800' },
  { id: 'U', name: 'Blue', symbol: 'U', bgColor: 'bg-blue-500', borderColor: 'border-blue-600', textColor: 'text-white' },
  { id: 'B', name: 'Black', symbol: 'B', bgColor: 'bg-gray-900', borderColor: 'border-gray-700', textColor: 'text-white' },
  { id: 'R', name: 'Red', symbol: 'R', bgColor: 'bg-red-500', borderColor: 'border-red-600', textColor: 'text-white' },
  { id: 'G', name: 'Green', symbol: 'G', bgColor: 'bg-green-500', borderColor: 'border-green-600', textColor: 'text-white' }
];

export const colorCombinations: Record<ColorCombination, string> = {
  // Single colors
  'W': 'Mono-White',
  'U': 'Mono-Blue', 
  'B': 'Mono-Black',
  'R': 'Mono-Red',
  'G': 'Mono-Green',
  
  // Two-color guilds
  'UW': 'Azorius (White/Blue)',
  'BU': 'Dimir (Blue/Black)',
  'BR': 'Rakdos (Black/Red)',
  'GR': 'Gruul (Red/Green)',
  'GW': 'Selesnya (Green/White)',
  'BW': 'Orzhov (White/Black)',
  'RU': 'Izzet (Blue/Red)',
  'BG': 'Golgari (Black/Green)',
  'RW': 'Boros (Red/White)',
  'GU': 'Simic (Green/Blue)',
  
  // Three-color shards
  'GUW': 'Bant (Green/White/Blue)',
  'BRW': 'Mardu (Red/White/Black)',
  'BUW': 'Esper (White/Blue/Black)',
  'BGR': 'Jund (Black/Red/Green)',
  'GRU': 'Temur (Green/Blue/Red)',
  
  // Three-color wedges
  'BGW': 'Abzan (White/Black/Green)',
  'BRU': 'Grixis (Blue/Black/Red)',
  'GRW': 'Naya (Red/Green/White)',
  'BGU': 'Sultai (Black/Green/Blue)',
  'RUW': 'Jeskai (Blue/Red/White)',
  
  // Four-color
  'BRUW': 'Artifice (Non-Green)',
  'BGUW': 'Growth (Non-Red)',
  'BGRW': 'Aggression (Non-Blue)',
  'GRUW': 'Altruism (Non-Black)',
  'BGRU': 'Chaos (Non-White)',
  'BGRUW': 'WUBRG (All Colors)'
};

export const getColorCombinationName = (colors: string[]): string => {
  if (!colors || colors.length === 0) return '';
  const colorStr = colors.sort().join('');
  return colorCombinations[colorStr] || `${colors.length}-Color Combination`;
};