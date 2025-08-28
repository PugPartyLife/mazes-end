export interface Card {
  cardName: string;
  totalEntries: number;
  totalDecks: number;
  totalTournaments: number;
  avgWinRate: number;
  avgStanding: number;
  firstSeen: string;
  lastSeen: string;
}

export interface PlayerCardPreference {
  playerName: string;
  cardName: string;
  timesPlayed: number;
  tournamentsPlayed: number;
  avgPerformance: number;
  lastPlayed: string;
}

export interface TrendingCard {
  cardName: string;
  entriesRecent: number;
  entriesPrevious: number;
  totalEntries: number;
  growthRate: number;
}

export interface CommanderPairing {
  commander1: string;
  commander2: string | null;
  deckCount: number;
  avgWinRate: number;
  top8Count: number;
  lastSeen: string;
}

export interface CardStatsSummary {
  totalTournaments: number;
  totalDecks: number;
  totalCardEntries: number;
  uniqueCards: number;
  uniquePlayers: number;
  latestTournament: string;
  databasePath: string;
  databaseSize: number;
}