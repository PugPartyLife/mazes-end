import SchemaBuilder from '@pothos/core'
import DataloaderPlugin from '@pothos/plugin-dataloader'
import { queryDatabase, queryDatabaseSingle, queries, parseColors, parseImageUris, parseArchetypeTags } from '../db/sqlite'
import type { 
  TopCommander, 
  TopCardForCommander, 
  CommanderRecommendation,
  Tournament,
  Player,
  Deck,
  Card,
  DeckCard,
  PlayerHistory,
  DatabaseSummary,
  ParsedImageUris
} from '../../types'

export const builder = new SchemaBuilder<{
  Dataloader: true;
  Objects: {
    TopCommander: TopCommander
    TopCardForCommander: TopCardForCommander
    CommanderRecommendation: CommanderRecommendation
    Tournament: Tournament
    Player: Player
    Deck: Deck
    Card: Card
    DeckCard: DeckCard
    PlayerHistory: PlayerHistory
    DatabaseSummary: DatabaseSummary
    ImageUris: ParsedImageUris
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
    
    // Add commander card details
    commanderCard: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.commander_name]
        )
        return results[0] || null
      }
    }),
    
    // Add top cards for this commander
    topCards: t.field({
      type: ['TopCardForCommander'],
      args: {
        limit: t.arg.int({ defaultValue: 20, required: false }),
      },
      resolve: async (parent, { limit }) => {
        const { sql, params } = queries.topCardsForCommander(parent.commander_name, limit!)
        return queryDatabase<TopCardForCommander>(sql, params)
      }
    }),
  }),
})

// Top Cards for specific commanders
builder.objectType('TopCardForCommander', {
  fields: (t) => ({
    commanderName: t.exposeString('commander_name'),
    cardName: t.exposeString('card_name'),
    typeLine: t.exposeString('type_line', { nullable: true }),
    cmc: t.exposeInt('cmc', { nullable: true }),
    colors: t.field({
      type: ['String'],
      resolve: (parent) => parseColors(parent.colors)
    }),
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
    
    // Add full card details
    card: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.card_name]
        )
        return results[0] || null
      }
    }),
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
    colorIdentity: t.field({
      type: ['String'],
      nullable: true,
      resolve: (parent) => parent.color_identity ? parseColors(parent.color_identity) : null
    }),
    commanderType: t.exposeString('commander_type', { nullable: true }),
    commanderCost: t.exposeString('commander_cost', { nullable: true }),
    commanderCmc: t.exposeInt('commander_cmc', { nullable: true }),
    commanderAbility: t.exposeString('commander_ability', { nullable: true }),
    commanderImages: t.field({
      type: 'ImageUris',
      nullable: true,
      resolve: (parent) => parent.commander_images ? parseImageUris(parent.commander_images) : null
    }),
    commanderUrl: t.exposeString('commander_url', { nullable: true }),
    archetypeTags: t.field({
      type: ['String'],
      resolve: (parent) => parseArchetypeTags(parent.archetype_tags)
    }),
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
    
    // Add decks for this tournament
    decks: t.field({
      type: ['Deck'],
      args: {
        limit: t.arg.int({ defaultValue: 100 }),
      },
      resolve: async (parent, { limit }) => {
        return queryDatabase<Deck>(
          'SELECT * FROM decks WHERE tournament_id = ? ORDER BY standing LIMIT ?',
          [parent.tournament_id, limit]
        )
      }
    }),
  }),
})

// Player type
builder.objectType('Player', {
  fields: (t) => ({
    playerId: t.exposeString('player_id'),
    playerName: t.exposeString('player_name'),
    discordUsername: t.exposeString('discord_username', { nullable: true }),
    discordId: t.exposeString('discord_id', { nullable: true }),
    totalTournaments: t.exposeInt('total_tournaments'),
    firstSeen: t.exposeString('first_seen'),
    lastSeen: t.exposeString('last_seen'),
  }),
})

// Deck type
builder.objectType('Deck', {
  fields: (t) => ({
    deckId: t.exposeString('deck_id'),
    tournamentId: t.exposeString('tournament_id'),
    playerId: t.exposeString('player_id', { nullable: true }),
    playerName: t.exposeString('player_name'),
    standing: t.exposeInt('standing', { nullable: true }),
    wins: t.exposeInt('wins'),
    losses: t.exposeInt('losses'),
    draws: t.exposeInt('draws'),
    winsSwiss: t.exposeInt('wins_swiss'),
    lossesSwiss: t.exposeInt('losses_swiss'),
    winsBracket: t.exposeInt('wins_bracket'),
    lossesBracket: t.exposeInt('losses_bracket'),
    winRate: t.exposeFloat('win_rate'),
    byes: t.exposeInt('byes'),
    decklistRaw: t.exposeString('decklist_raw', { nullable: true }),
    decklistParsed: t.exposeBoolean('decklist_parsed'),
    commander1: t.exposeString('commander_1', { nullable: true }),
    commander2: t.exposeString('commander_2', { nullable: true }),
    deckColors: t.exposeString('deck_colors', { nullable: true }),
    hasDecklist: t.exposeBoolean('has_decklist'),
    createdAt: t.exposeString('created_at'),
    
    // Add cards in this deck
    cards: t.field({
      type: ['DeckCard'],
      resolve: async (parent) => {
        return queryDatabase<DeckCard>(
          'SELECT * FROM deck_cards WHERE deck_id = ? ORDER BY deck_section, card_name',
          [parent.deck_id]
        )
      }
    }),
  }),
})

// DeckCard type
builder.objectType('DeckCard', {
  fields: (t) => ({
    deckId: t.exposeString('deck_id'),
    cardName: t.exposeString('card_name'),
    quantity: t.exposeInt('quantity'),
    deckSection: t.exposeString('deck_section'),
    
    // Add card details
    card: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.card_name]
        )
        return results[0] || null
      }
    }),
  }),
})

// ImageUris type
builder.objectType('ImageUris', {
  fields: (t) => ({
    small: t.string({ 
      nullable: true,
      resolve: (parent) => parent.small
    }),
    normal: t.string({ 
      nullable: true,
      resolve: (parent) => parent.normal
    }),
    large: t.string({ 
      nullable: true,
      resolve: (parent) => parent.large
    }),
    png: t.string({ 
      nullable: true,
      resolve: (parent) => parent.png
    }),
    artCrop: t.string({ 
      nullable: true,
      resolve: (parent) => parent.art_crop
    }),
    borderCrop: t.string({ 
      nullable: true,
      resolve: (parent) => parent.border_crop
    }),
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

// Define PlayerHistory object type
builder.objectType('PlayerHistory', {
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
    cmc: t.int({
      nullable: true,
      resolve: (parent) => parent.cmc
    }),
    typeLine: t.exposeString('type_line', { nullable: true }),
    oracleText: t.exposeString('oracle_text', { nullable: true }),
    power: t.exposeString('power', { nullable: true }),
    toughness: t.exposeString('toughness', { nullable: true }),
    colors: t.field({
      type: ['String'],
      resolve: (parent) => parseColors(parent.colors)
    }),
    colorIdentity: t.field({
      type: ['String'],
      resolve: (parent) => parseColors(parent.color_identity)
    }),
    rarity: t.exposeString('rarity', { nullable: true }),
    cardType: t.exposeString('card_type'),
    priceUsd: t.float({
      nullable: true,
      resolve: (parent) => parent.price_usd
    }),
    setCode: t.exposeString('set_code', { nullable: true }),
    artist: t.exposeString('artist', { nullable: true }),
    scryfallUri: t.exposeString('scryfall_uri', { nullable: true }),
    imageUris: t.field({
      type: 'ImageUris',
      nullable: true,
      resolve: (parent) => parseImageUris(parent.image_uris)
    }),
    
    // Custom ratings
    salt: t.float({
      nullable: true,
      resolve: (parent) => parent.salt
    }),
    cardPower: t.float({
      nullable: true,
      resolve: (parent) => parent.card_power
    }),
    versatility: t.float({
      nullable: true,
      resolve: (parent) => parent.versatility
    }),
    popularity: t.float({
      nullable: true,
      resolve: (parent) => parent.popularity
    }),
    price: t.float({
      nullable: true,
      resolve: (parent) => parent.price
    }),
  }),
})

builder.queryType({
  fields: (t) => ({
    // Top commanders using the view
    topCommanders: t.field({
      type: ['TopCommander'],
      args: {
        limit: t.arg.int({ defaultValue: 50 }),
        minDecks: t.arg.int({ defaultValue: 5 }),
      },
      resolve: async (_, { limit, minDecks }) => {
        return queryDatabase<TopCommander>(
          `SELECT * FROM top_commanders 
           WHERE total_decks >= ? 
           ORDER BY popularity_score DESC 
           LIMIT ?`,
          [minDecks, limit]
        )
      },
    }),

    // Single commander lookup
    commander: t.field({
      type: 'TopCommander',
      nullable: true,
      args: {
        name: t.arg.string({ required: true }),
      },
      resolve: async (_, { name }) => {
        const results = await queryDatabase<TopCommander>(
          'SELECT * FROM top_commanders WHERE commander_name = ?',
          [name]
        )
        return results[0] || null
      },
    }),

    // Top cards for a specific commander
    topCardsForCommander: t.field({
      type: ['TopCardForCommander'],
      args: {
        commanderName: t.arg.string({ required: true }),
        limit: t.arg.int({ defaultValue: 50 }),
        minInclusions: t.arg.int({ defaultValue: 3 }),
      },
      resolve: async (_, { commanderName, limit, minInclusions }) => {
        return queryDatabase<TopCardForCommander>(
          `SELECT * FROM top_cards_for_commanders 
           WHERE commander_name = ? AND total_inclusions >= ?
           ORDER BY inclusion_rate DESC 
           LIMIT ?`,
          [commanderName, minInclusions, limit]
        )
      },
    }),

    // Commander recommendations
    commanderRecommendations: t.field({
      type: ['CommanderRecommendation'],
      args: {
        minDecks: t.arg.int({ defaultValue: 5 }),
        limit: t.arg.int({ defaultValue: 50 }),
        archetypeFilter: t.arg.string({ required: false }),
      },
      resolve: async (_, { minDecks, limit, archetypeFilter }) => {
        let sql = `SELECT * FROM commander_recommendations WHERE total_decks >= ?`
        const params: any[] = [minDecks]
        
        if (archetypeFilter) {
          sql += ` AND archetype_tags LIKE ?`
          params.push(`%${archetypeFilter}%`)
        }
        
        sql += ` ORDER BY popularity_score DESC LIMIT ?`
        params.push(limit)
        
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

    // Single tournament lookup
    tournament: t.field({
      type: 'Tournament',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_, { id }) => {
        return queryDatabaseSingle<Tournament>(
          'SELECT * FROM tournaments WHERE tournament_id = ?',
          [id]
        )
      },
    }),

    // Player lookup
    player: t.field({
      type: 'Player',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_, { id }) => {
        return queryDatabaseSingle<Player>(
          'SELECT * FROM players WHERE player_id = ?',
          [id]
        )
      },
    }),

    // Player tournament history
    playerHistory: t.field({
      type: ['PlayerHistory'],
      args: {
        playerId: t.arg.string({ required: true }),
      },
      resolve: async (_, { playerId }) => {
        const { sql, params } = queries.playerHistory(playerId)
        return queryDatabase<PlayerHistory>(sql, params)
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
          databasePath: './test.db',
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
      nullable: true,
      args: {
        name: t.arg.string({ required: true }),
      },
      resolve: async (_, { name }) => {
        return queryDatabaseSingle<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [name]
        )
      },
    }),

    // Deck lookup
    deck: t.field({
      type: 'Deck',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_, { id }) => {
        return queryDatabaseSingle<Deck>(
          'SELECT * FROM decks WHERE deck_id = ?',
          [id]
        )
      },
    }),

    // Cards by type
    cardsByType: t.field({
      type: ['Card'],
      args: {
        cardType: t.arg.string({ required: true }),
        limit: t.arg.int({ defaultValue: 50 }),
      },
      resolve: async (_, { cardType, limit }) => {
        return queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_type = ? ORDER BY card_name LIMIT ?',
          [cardType, limit ?? 50]
        )
      },
    }),
  }),
})

export const schema = builder.toSchema()