import SchemaBuilder from '@pothos/core'
import DataloaderPlugin from '@pothos/plugin-dataloader'
import { queryDatabase, queries } from '../db/sqlite'
import type { 
  TopCommander, 
  TopCardForCommander, 
  CommanderRecommendation,
  Tournament,
  Player,
  Deck,
  Card
} from '../../types'

export const builder = new SchemaBuilder<{
  Dataloader: true;
  Objects: {
    TopCommander: TopCommander
    TopCardForCommander: TopCardForCommander
    CommanderRecommendation: CommanderRecommendation
    Tournament: Tournament
    Player: Player
    Deck: Card
    Card: Card
    DatabaseSummary: {
      totalTournaments: number
      totalPlayers: number
      totalDecks: number
      totalCards: number
      totalDeckCards: number
      latestTournament: string
      databasePath: string
    }
  }
}>({
  plugins: [DataloaderPlugin],
})

// Top Commanders from view
builder.objectType('TopCommander', {
  fields: (t) => ({
    commanderName: t.exposeString('commander_name'),
    partnerName: t.exposeString('partner_name', { nullable: true }),
    totalDecks: t.exposeInt('total_decks'),
    tournamentsPlayed: t.exposeInt('tournaments_played'),
    avgWinRate: t.exposeFloat('avg_win_rate'),
    avgStanding: t.exposeFloat('avg_standing'),
    top8Finishes: t.exposeInt('top_8_finishes'),
    top16Finishes: t.exposeInt('top_16_finishes'),
    firstSeen: t.exposeString('first_seen'),
    lastSeen: t.exposeString('last_seen'),
    popularityScore: t.exposeFloat('popularity_score'),
  }),
})

// Top Cards for specific commanders
builder.objectType('TopCardForCommander', {
  fields: (t) => ({
    commanderName: t.exposeString('commander_name'),
    cardName: t.exposeString('card_name'),
    typeLine: t.exposeString('type_line', { nullable: true }),
    cmc: t.exposeInt('cmc', { nullable: true }),
    colors: t.exposeString('colors', { nullable: true }),
    rarity: t.exposeString('rarity', { nullable: true }),
    priceUsd: t.exposeFloat('price_usd', { nullable: true }),
    cardType: t.exposeString('card_type'),
    totalInclusions: t.exposeInt('total_inclusions'),
    decksIncluded: t.exposeInt('decks_included'),
    tournamentsSeenIn: t.exposeInt('tournaments_seen'),
    inclusionRate: t.exposeFloat('inclusion_rate'),
    avgWinRateWithCard: t.exposeFloat('avg_win_rate_with_card'),
    avgStandingWithCard: t.exposeFloat('avg_standing_with_card'),
    deckSection: t.exposeString('deck_section'),
  }),
})

// Commander Recommendations from view
builder.objectType('CommanderRecommendation', {
  fields: (t) => ({
    commanderName: t.exposeString('commander_name'),
    partnerName: t.exposeString('partner_name', { nullable: true }),
    totalDecks: t.exposeInt('total_decks'),
    avgWinRate: t.exposeFloat('avg_win_rate'),
    popularityScore: t.exposeFloat('popularity_score'),
    top8Finishes: t.exposeInt('top_8_finishes'),
    colorIdentity: t.exposeString('color_identity', { nullable: true }),
    commanderType: t.exposeString('commander_type', { nullable: true }),
    commanderCost: t.exposeString('commander_cost', { nullable: true }),
    commanderCmc: t.exposeInt('commander_cmc', { nullable: true }),
    commanderAbility: t.exposeString('commander_ability', { nullable: true }),
    commanderImages: t.exposeString('commander_images', { nullable: true }),
    commanderUrl: t.exposeString('commander_url', { nullable: true }),
    archetypeTags: t.exposeString('archetype_tags', { nullable: true }),
    estimatedDeckPrice: t.exposeFloat('estimated_deck_price', { nullable: true }),
  }),
})

// Tournament data
builder.objectType('Tournament', {
  fields: (t) => ({
    tournamentId: t.exposeString('tournament_id'),
    tournamentName: t.exposeString('tournament_name', { nullable: true }),
    game: t.exposeString('game'),
    format: t.exposeString('format'),
    startDate: t.exposeString('start_date', { nullable: true }),
    swissRounds: t.exposeInt('swiss_rounds', { nullable: true }),
    topCut: t.exposeInt('top_cut', { nullable: true }),
    totalPlayers: t.exposeInt('total_players', { nullable: true }),
    locationCity: t.exposeString('location_city', { nullable: true }),
    locationState: t.exposeString('location_state', { nullable: true }),
    hasDecklists: t.exposeBoolean('has_decklists'),
  }),
})

// Database summary
builder.objectType('DatabaseSummary', {
  fields: (t) => ({
    totalTournaments: t.exposeInt('totalTournaments'),
    totalPlayers: t.exposeInt('totalPlayers'),
    totalDecks: t.exposeInt('totalDecks'),
    totalCards: t.exposeInt('totalCards'),
    totalDeckCards: t.exposeInt('totalDeckCards'),
    latestTournament: t.exposeString('latestTournament'),
    databasePath: t.exposeString('databasePath'),
  }),
})

builder.queryType({
  fields: (t) => ({
    // Top commanders using the view
    topCommanders: t.field({
      type: ['TopCommander'],
      args: {
        limit: t.arg.int({ defaultValue: 50 }),
      },
      resolve: async (_, { limit }) => {
        const { sql, params } = queries.topCommanders(limit)
        return queryDatabase<TopCommander>(sql, params)
      },
    }),

    // Top cards for a specific commander
    topCardsForCommander: t.field({
      type: ['TopCardForCommander'],
      args: {
        commanderName: t.arg.string({ required: true }),
        limit: t.arg.int({ defaultValue: 50 }),
      },
      resolve: async (_, { commanderName, limit }) => {
        const { sql, params } = queries.topCardsForCommander(commanderName, limit)
        return queryDatabase<TopCardForCommander>(sql, params)
      },
    }),

    // Commander recommendations
    commanderRecommendations: t.field({
      type: ['CommanderRecommendation'],
      args: {
        minDecks: t.arg.int({ defaultValue: 5 }),
        limit: t.arg.int({ defaultValue: 50 }),
      },
      resolve: async (_, { minDecks, limit }) => {
        const { sql, params } = queries.commanderRecommendations(minDecks, limit)
        return queryDatabase<CommanderRecommendation>(sql, params)
      },
    }),

    // Tournaments by format
    tournaments: t.field({
      type: ['Tournament'],
      args: {
        format: t.arg.string({ defaultValue: 'EDH' }),
        limit: t.arg.int({ defaultValue: 20 }),
      },
      resolve: async (_, { format, limit }) => {
        const { sql, params } = queries.tournamentsByFormat(format, limit)
        return queryDatabase<Tournament>(sql, params)
      },
    }),

    // Player tournament history
    playerHistory: t.field({
      type: [builder.objectRef<{
        tournament_name: string | null
        start_date: string | null
        standing: number | null
        win_rate: number
        commander_1: string | null
        commander_2: string | null
        deck_colors: string | null
      }>('PlayerHistory')],
      args: {
        playerId: t.arg.string({ required: true }),
      },
      resolve: async (_, { playerId }) => {
        const { sql, params } = queries.playerHistory(playerId)
        return queryDatabase(sql, params)
      },
    }),

    // Database summary statistics
    summary: t.field({
      type: 'DatabaseSummary',
      resolve: async () => {
        const results = await queryDatabase<any>(`
          SELECT 
            (SELECT COUNT(*) FROM tournaments) as totalTournaments,
            (SELECT COUNT(*) FROM players) as totalPlayers,
            (SELECT COUNT(*) FROM decks) as totalDecks,
            (SELECT COUNT(*) FROM cards) as totalCards,
            (SELECT COUNT(*) FROM deck_cards) as totalDeckCards,
            (SELECT MAX(start_date) FROM tournaments) as latestTournament
        `)
        
        return {
          ...results[0],
          databasePath: './mtg_tournament_data.db',
        }
      },
    }),

    // Search cards by name
    searchCards: t.field({
      type: ['Card'],
      args: {
        query: t.arg.string({ required: true }),
        limit: t.arg.int({ defaultValue: 20 }),
      },
      resolve: async (_, { query, limit }) => {
        return queryDatabase<Card>(
          `SELECT * FROM cards WHERE card_name LIKE ? ORDER BY card_name LIMIT ?`,
          [`%${query}%`, limit]
        )
      },
    }),

    // Get specific card details
    card: t.field({
      type: 'Card',
      args: {
        name: t.arg.string({ required: true }),
      },
      resolve: async (_, { name }) => {
        const results = await queryDatabase<Card>(
          `SELECT * FROM cards WHERE card_name = ?`,
          [name]
        )
        return results[0] || null
      },
    }),
  }),
})

// Define PlayerHistory object type
builder.objectType(builder.objectRef<{
  tournament_name: string | null
  start_date: string | null
  standing: number | null
  win_rate: number
  commander_1: string | null
  commander_2: string | null
  deck_colors: string | null
}>('PlayerHistory'), {
  name: 'PlayerHistory',
  fields: (t) => ({
    tournamentName: t.exposeString('tournament_name', { nullable: true }),
    startDate: t.exposeString('start_date', { nullable: true }),
    standing: t.exposeInt('standing', { nullable: true }),
    winRate: t.exposeFloat('win_rate'),
    commander1: t.exposeString('commander_1', { nullable: true }),
    commander2: t.exposeString('commander_2', { nullable: true }),
    deckColors: t.exposeString('deck_colors', { nullable: true }),
  }),
})

// Card object type
builder.objectType('Card', {
  fields: (t) => ({
    cardName: t.exposeString('card_name'),
    scryfallId: t.exposeString('scryfall_id', { nullable: true }),
    manaCost: t.exposeString('mana_cost', { nullable: true }),
    cmc: t.exposeInt('cmc', { nullable: true }),
    typeLine: t.exposeString('type_line', { nullable: true }),
    oracleText: t.exposeString('oracle_text', { nullable: true }),
    power: t.exposeString('power', { nullable: true }),
    toughness: t.exposeString('toughness', { nullable: true }),
    colors: t.exposeString('colors', { nullable: true }),
    colorIdentity: t.exposeString('color_identity', { nullable: true }),
    rarity: t.exposeString('rarity', { nullable: true }),
    cardType: t.exposeString('card_type'),
    priceUsd: t.exposeFloat('price_usd', { nullable: true }),
    setCode: t.exposeString('set_code', { nullable: true }),
    artist: t.exposeString('artist', { nullable: true }),
    scryfallUri: t.exposeString('scryfall_uri', { nullable: true }),
  }),
})