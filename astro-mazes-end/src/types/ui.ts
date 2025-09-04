import type { ParsedImageUris } from './sqlite_types'

// UI-focused card shape consumed by components (MtgCard, DeckBox, CommanderBox)
export interface DbUICard {
  name: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  flavor_text?: string
  power?: string
  toughness?: string
  colors?: string[]
  color_identity?: string[]
  image_uris?: ParsedImageUris
  layout?: string
  card_faces?: any[]
  artist?: string
  set_name?: string

  // Optional analytics / ratings mapped from DB
  card_power?: number
  versatility?: number
  popularity?: number
  salt?: number
  price?: number
  scryfall_uri?: string
}

export interface ParsedCardFace {
  name: string
  mana_cost: string
  type_line: string
  oracle_text: string
  power?: string
  toughness?: string
  colors: string[]
  flavor_text?: string
  image_uris?: ParsedImageUris
}

