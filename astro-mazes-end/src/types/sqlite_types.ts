// MTG Tournament Database Type Definitions

// Core table interfaces
export interface Tournament {
  tournament_id: string
  tournament_name: string | null
  game: string
  format: string
  start_date: string | null
  swiss_rounds: number | null
  top_cut: number | null
  total_players: number | null
  location_city: string | null
  location_state: string | null
  location_venue: string | null
  has_decklists: boolean
  created_at: string
}

export interface Player {
  player_id: string
  player_name: string
  discord_username: string | null
  discord_id: string | null
  total_tournaments: number
  first_seen: string
  last_seen: string
}

export interface Deck {
  deck_id: string
  tournament_id: string
  player_id: string | null
  player_name: string
  standing: number | null
  wins: number
  losses: number
  draws: number
  wins_swiss: number
  losses_swiss: number
  wins_bracket: number
  losses_bracket: number
  win_rate: number
  byes: number
  decklist_raw: string | null
  decklist_parsed: boolean
  commander_1: string | null
  commander_2: string | null
  deck_colors: string | null
  has_decklist: boolean
  created_at: string
}

export interface Card {
  card_name: string
  scryfall_id: string | null
  mana_cost: string | null
  cmc: number | null
  type_line: string | null
  oracle_text: string | null
  power: string | null
  toughness: string | null
  colors: string | null // JSON string
  color_identity: string | null // JSON string
  layout: string | null
  card_faces: string | null // JSON string
  image_uris: string | null // JSON string
  component: string | null
  rarity: string | null
  flavor_text: string | null
  artist: string | null
  set_code: string | null
  set_name: string | null
  collector_number: string | null
  scryfall_uri: string | null
  uri: string | null
  rulings_uri: string | null
  prints_search_uri: string | null
  card_type: string
  price_usd: number | null
  price_updated: string | null
  first_seen: string
  last_updated: string
}

export interface DeckCard {
  deck_id: string
  card_name: string
  quantity: number
  deck_section: string
}

// View result interfaces
export interface TopCommander {
  commander_name: string
  partner_name: string | null
  total_decks: number
  tournaments_played: number
  avg_win_rate: number
  avg_standing: number
  top_8_finishes: number
  top_16_finishes: number
  first_seen: string
  last_seen: string
  popularity_score: number
}

export interface TopCardForCommander {
  commander_name: string
  card_name: string
  type_line: string | null
  cmc: number | null
  colors: string | null
  rarity: string | null
  price_usd: number | null
  card_type: string
  card_type_plural: string
  total_inclusions: number
  decks_included: number
  tournaments_seen: number
  inclusion_rate: number
  avg_win_rate_with_card: number
  avg_standing_with_card: number
  artist: string | null
  set_code: string | null
  layout: string | null
  deck_section: string
  first_seen: string
  last_seen: string
}

export interface CommanderRecommendation {
  commander_name: string
  partner_name: string | null
  total_decks: number
  avg_win_rate: number
  popularity_score: number
  top_8_finishes: number
  color_identity: string | null
  commander_type: string | null
  commander_cost: string | null
  commander_cmc: number | null
  commander_ability: string | null
  commander_images: string | null
  commander_url: string | null
  commander_card_type: string | null
  archetype_tags: string | null
  archetype_confidence: number | null
  estimated_deck_price: number | null
}

export interface PlayerSurvey {
  survey_id: string
  player_id: string | null
  preferred_colors: string | null // JSON array
  avoid_colors: string | null // JSON array
  play_style: string | null
  win_condition_pref: string | null
  experience_level: string | null
  complexity_comfort: number | null
  budget_range: string | null
  power_level_target: number | null
  interaction_level: string | null
  politics_comfort: boolean
  kindred_interest: boolean
  artifacts_interest: boolean
  graveyard_interest: boolean
  spellslinger_interest: boolean
  created_at: string
}

export interface CommanderArchetype {
  commander_name: string
  archetype_tag: string
  confidence_score: number
}

// Helper types for parsed JSON fields
export interface ParsedColors {
  colors: string[]
  colorIdentity: string[]
}

export interface ParsedImageUris {
  small?: string
  normal?: string
  large?: string
  png?: string
  art_crop?: string
  border_crop?: string
}

// Parsed card shape used by UI components (MtgCard, DeckBox commanders)
export interface DbUICard {
  name: string
  mana_cost?: string
  type_line?: string
  oracle_text?: string
  power?: string
  toughness?: string
  colors?: string[]
  color_identity?: string[]
  image_uris?: ParsedImageUris
  layout?: string
  card_faces?: any[]
  artist?: string
  set_name?: string
}

// Legacy interfaces for backward compatibility
export interface CardData {
  cardName: string
  totalEntries: number
  totalDecks: number
  avgWinRate: number
  firstSeen: string
  lastSeen: string
}

export interface CommanderData {
  commander1: string
  commander2: string | null
  deckCount: number
  avgWinRate: number
  top8Count: number
}
