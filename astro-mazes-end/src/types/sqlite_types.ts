// MTG Tournament Database Type Definitions

// Core table interfaces
export interface CardType {
  type_name: string
  type_plural: string
  description: string | null
}

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
  salt: number | null
  card_power: number | null
  versatility: number | null
  popularity: number | null
  price: number | null
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

// GraphQL-specific types (these are not database tables but query results)
export interface PlayerHistory {
  tournament_name: string | null
  start_date: string | null
  standing: number | null
  win_rate: number
  commander_1: string | null
  commander_2: string | null
  deck_colors: string | null
}

export interface DatabaseSummary {
  totalTournaments: number
  totalPlayers: number
  totalDecks: number
  totalCards: number
  totalDeckCards: number
  latestTournament: string
  databasePath: string
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
  [key: string]: string | undefined // For multi-face cards: face_0_small, face_1_small, etc.
}

// Enum types to match schema constraints
export type PlayStyle = 'Aggro' | 'Control' | 'Combo' | 'Midrange' | 'Casual'
export type WinConditionPref = 'Combat' | 'Combo' | 'Alt Win' | 'Value' | 'Any'
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type BudgetRange = 'Budget' | 'Mid' | 'High' | 'No Limit'
export type InteractionLevel = 'Low' | 'Medium' | 'High'
export type DeckSection = 'commander' | 'mainboard' | 'sideboard'

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

// Query parameter types for pre-built queries
export interface TopCommandersParams {
  limit?: number
  minDecks?: number
}

export interface TopCardsForCommanderParams {
  commanderName: string
  limit?: number
  minInclusions?: number
}

export interface CommanderRecommendationsParams {
  minDecks?: number
  limit?: number
  archetypeFilter?: string | null
}

export interface TournamentsByFormatParams {
  format?: string
  limit?: number
}

// Response types for aggregated data
export interface CommanderPerformanceStats {
  commanderName: string
  totalGames: number
  winRate: number
  avgStanding: number
  top8Rate: number
}

export interface CardInclusionStats {
  cardName: string
  inclusionRate: number
  performanceImpact: number // positive = improves win rate, negative = reduces
}

export interface CardUsageData {
  cardName: string
  timesPlayed: number
  decks: DeckReference[]
}

// Simplified deck reference for card usage
export interface DeckReference {
  deckId: string
  deckName: string
  commanderName: string
}

// Query result type for card usage aggregation
export interface CardUsageQueryResult {
  card_name: string
  times_played: number
  unique_decks: number
}

// Query result type for deck details with card
export interface DeckWithCardResult {
  deckId: string
  deckName: string
  commanderName: string
}

// Parameters for card usage query
export interface CardUsageParams {
  days?: number
  limit?: number
}

// Aggregated card usage with JSON decks (for optimized query)
export interface CardUsageWithJsonDecks {
  cardName: string
  timesPlayed: number
  decks: string // JSON string that needs to be parsed
}

// Card usage bin for histogram
export interface CardUsageBin {
  range: string
  minValue: number
  maxValue: number
  count: number
  cards: CardUsageData[]
}

// Update the AnyDatabaseType union to include new types
export type AnyDatabaseType = 
  | CardType 
  | Tournament 
  | Player 
  | Deck 
  | Card 
  | DeckCard 
  | PlayerSurvey 
  | CommanderArchetype
  | TopCommander
  | TopCardForCommander
  | CommanderRecommendation
  | CardUsageData
  | DeckReference

export interface CardFrequencyChange {
  cardName: string;
  month: string; // Format: YYYY-MM
  previousMonth: string; // Format: YYYY-MM
  currentFrequency: number; // Number of decks including this card in current month
  previousFrequency: number; // Number of decks including this card in previous month
  percentageChange: number; // Percentage change from previous month
  absoluteChange: number; // Raw difference in deck count
  significanceScore: number; // Statistical significance score
  card?: Card; // Optional link to full card details (using your existing Card type)
}

// If you need the raw database row type as well:
export interface CardFrequencyChangeRow {
  cardName: string;
  month: string;
  previousMonth: string;
  currentFrequency: number;
  previousFrequency: number;
  percentageChange: number;
  absoluteChange: number;
  significanceScore: number;
}

export interface CardFrequencyChange {
  cardName: string;
  month: string; // Format: YYYY-MM
  previousMonth: string; // Format: YYYY-MM
  currentFrequency: number; // Number of decks including this card in current month
  previousFrequency: number; // Number of decks including this card in previous month
  percentageChange: number; // Percentage change from previous month
  absoluteChange: number; // Raw difference in deck count
  significanceScore: number; // Statistical significance score
  
  // New statistical fields
  normalizedChange?: number; // Z-score difference (standard deviations from mean)
  powerLawNormalizedChange?: number; // Log-space z-score difference (better for power-law)
  monthlyVariance?: number; // Power-law variance for the month
  
  card?: Card; // Optional link to full card details
}

// Monthly distribution statistics type
export interface MonthlyDistributionStats {
  month: string;
  totalCards: number;
  minFrequency: number;
  maxFrequency: number;
  meanFrequency: number;
  medianFrequency: number;
  variance: number;
  stdDev: number;
  powerLawExponent: number; // Alpha parameter of power-law distribution
  giniCoefficient: number; // Inequality measure (0 = perfect equality, 1 = perfect inequality)
  
  // Percentiles
  q1: number; // 25th percentile
  q3: number; // 75th percentile  
  p90: number; // 90th percentile
  p95: number; // 95th percentile
  p99: number; // 99th percentile
  
  // Additional metrics
  logRange: number; // log(max/min) - indicates spread on log scale
  coefficientOfVariationSquared: number; // Normalized variance measure
}

export interface CardUsageWithDetails {
  cardName: string;
  timesPlayed: number;
  deckBoxes: DeckBoxData[]; // This references your existing DeckBoxData type
  card?: Card; // Optional reference to full card details
}

// If DeckBoxData isn't already in your types.ts, you'll need this too:
export interface DeckBoxData {
  deckId: string;
  tournamentId?: string;
  tournamentName?: string;
  totalPlayers?: number;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  standing?: number;
  lastSeen?: string;
  totalCards: number;
  deckColors?: string;
  same_commander_count?: number;
  // Commander data with c1_/c2_ prefixes as returned from query
  c1_name?: string;
  c1_mana_cost?: string;
  c1_type_line?: string;
  c1_oracle_text?: string;
  c1_power?: string;
  c1_toughness?: string;
  c1_colors?: string;
  c1_color_identity?: string;
  c1_image_uris?: string;
  c1_layout?: string;
  c1_card_faces?: string;
  c1_artist?: string;
  c1_set_name?: string;
  c1_card_power?: number;
  c1_versatility?: number;
  c1_popularity?: number;
  c1_salt?: number;
  c1_price?: number;
  c1_scryfall_uri?: string;
  // Commander 2 fields (same pattern)
  c2_name?: string;
  c2_mana_cost?: string;
  c2_type_line?: string;
  c2_oracle_text?: string;
  c2_power?: string;
  c2_toughness?: string;
  c2_colors?: string;
  c2_color_identity?: string;
  c2_image_uris?: string;
  c2_layout?: string;
  c2_card_faces?: string;
  c2_artist?: string;
  c2_set_name?: string;
  c2_card_power?: number;
  c2_versatility?: number;
  c2_popularity?: number;
  c2_salt?: number;
  c2_price?: number;
  c2_scryfall_uri?: string;
}