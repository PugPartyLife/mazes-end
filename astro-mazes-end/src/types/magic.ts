export type ColorId = 'W' | 'U' | 'B' | 'R' | 'G';

export interface MagicColor {
  id: ColorId;
  name: string;
  symbol: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// Color combination types
export type ColorCombination = string;

// Commander data types
export interface Commander {
  name: string;
  archetype: string;
  description: string;
}

// Archetype categories for better type safety
export type CedhArchetype = 
  | 'Combo'
  | 'Control'
  | 'Storm'
  | 'Stax'
  | 'Aggro'
  | 'Value'
  | 'Midrange'
  | 'Toolbox'
  | 'Superfriends';

export type CasualArchetype = 
  | 'Voltron'
  | 'Tokens'
  | 'Group Hug'
  | 'Spellslinger'
  | 'Aristocrats'
  | 'Kindred'
  | 'Big Mana'
  | 'Graveyard'
  | 'Mill'
  | 'Lands'
  | 'Tempo'
  | 'Control'
  | 'Counters'
  | 'Aggro'
  | 'Ramp'
  | 'Lifegain'
  | 'Stax'
  | 'ETB'
  | 'Cheating'
  | 'Big Creatures'
  | 'Value'
  | 'Reanimator'
  | 'Cascade'
  | 'Artifacts'
  | 'Big Spells'
  | 'Creatures';

// More specific commander interfaces if needed
export interface CedhCommander extends Commander {
  archetype: CedhArchetype;
}

export interface CasualCommander extends Commander {
  archetype: CasualArchetype;
}

// Collection types
export type CommandersByColor<T extends Commander = Commander> = Record<ColorCombination, T[]>;

// Utility types for working with color combinations
export interface ColorCombinationInfo {
  colors: ColorId[];
  name: string;
  type: 'mono' | 'guild' | 'shard' | 'wedge' | 'four-color' | 'five-color';
}