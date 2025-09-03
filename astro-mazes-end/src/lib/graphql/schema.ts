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
    CardWithStats: any
    DeckBoxData: any
    DeckMetaData: any
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
    partnerCard: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        if (!parent.partner_name) return null
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.partner_name]
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
function coerceImageObj(parent: any): any {
  if (!parent) return {}
  if (typeof parent === 'string') {
    try { return JSON.parse(parent) } catch { return {} }
  }
  return parent
}

builder.objectType('ImageUris', {
  fields: (t) => ({
    small: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).small ?? null
    }),
    normal: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).normal ?? null
    }),
    large: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).large ?? null
    }),
    png: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).png ?? null
    }),
    artCrop: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).art_crop ?? null
    }),
    borderCrop: t.string({ 
      nullable: true,
      resolve: (parent) => coerceImageObj(parent).border_crop ?? null
    }),
    // Face 0
    face0Small: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_small`] ?? null }),
    face0Normal: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_normal`] ?? null }),
    face0Large: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_large`] ?? null }),
    face0Png: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_png`] ?? null }),
    face0ArtCrop: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_art_crop`] ?? null }),
    face0BorderCrop: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_0_border_crop`] ?? null }),
    // Face 1
    face1Small: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_small`] ?? null }),
    face1Normal: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_normal`] ?? null }),
    face1Large: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_large`] ?? null }),
    face1Png: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_png`] ?? null }),
    face1ArtCrop: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_art_crop`] ?? null }),
    face1BorderCrop: t.string({ nullable: true, resolve: (p) => coerceImageObj(p)[`face_1_border_crop`] ?? null }),
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
    layout: t.exposeString('layout', { nullable: true }),
    cardFaces: t.exposeString('card_faces', { nullable: true }),
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
    setName: t.exposeString('set_name', { nullable: true }),
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
    // Cards page: aggregated performance stats + card
    cardsWithStats: t.field({
      type: ['CardWithStats'],
      args: {
        limit: t.arg.int({ defaultValue: 24 }),
        offset: t.arg.int({ defaultValue: 0 }),
        q: t.arg.string({ required: false })
      },
      resolve: async (_, { limit, offset, q }) => {
        const { sql, params } = queries.cardsWithStats(limit!, offset!, q ?? undefined)
        return queryDatabase<any>(sql, params)
      }
    }),
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

    // Deck meta details for Deck page
    deckDetails: t.field({
      type: 'DeckMetaData',
      nullable: true,
      args: {
        deckId: t.arg.string({ required: true })
      },
      resolve: async (_, { deckId }) => {
        const { sql, params } = queries.deckMeta(deckId!)
        const rows = await queryDatabase<any>(sql, params)
        return rows?.[0] || null
      }
    }),

    // Recent decks for home/decks page
    recentDeckBoxes: t.field({
      type: ['DeckBoxData'],
      args: {
        limit: t.arg.int({ defaultValue: 15 })
      },
      resolve: async (_, { limit }) => {
        const perTournament = 3
        const tournamentsLimit = Math.max(5, Math.ceil((limit ?? 15) / perTournament) + 2)
        const { sql, params } = queries.recentDeckBoxes(tournamentsLimit, limit ?? 15)
        return queryDatabase<any>(sql, params)
      }
    }),

    // Tournament deck boxes
    tournamentDeckBoxes: t.field({
      type: ['DeckBoxData'],
      args: { tournamentId: t.arg.string({ required: true }) },
      resolve: async (_, { tournamentId }) => {
        const { sql, params } = queries.tournamentDeckBoxes(tournamentId!)
        return queryDatabase<any>(sql, params)
      }
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

// --------------
// Extra object types used by the new queries

// Shape returned from queries.cardsWithStats
builder.objectType('CardWithStats', {
  fields: (t) => ({
    // aggregated stats
    decksIncluded: t.int({ resolve: (p) => Number(p.decks_included || 0) }),
    tournamentsSeen: t.int({ resolve: (p) => Number(p.tournaments_seen || 0) }),
    top8WithCard: t.int({ resolve: (p) => Number(p.top8_with_card || 0) }),
    winsWithCard: t.int({ resolve: (p) => Number(p.wins_with_card || 0) }),
    lossesWithCard: t.int({ resolve: (p) => Number(p.losses_with_card || 0) }),
    drawsWithCard: t.int({ resolve: (p) => Number(p.draws_with_card || 0) }),
    avgWinRateWithCard: t.float({ resolve: (p) => Number(p.avg_win_rate_with_card || 0) }),
    avgStandingWithCard: t.float({ resolve: (p) => Number(p.avg_standing_with_card || 0) }),
    inclusionRate: t.float({ resolve: (p) => Math.max(0, Math.min(1, Number(p.inclusion_rate || 0))) }),
    score: t.float({ resolve: (p) => Number(p.score || 0) }),
    // card fields (from joined c.*)
    card: t.field({
      type: 'Card',
      resolve: (p) => p
    })
  })
})

// (moved) Build the schema after all types are declared — see end of file

// Parse deck colors string like "WURG" into ["W","U","R","G"]
function parseDeckColorsString(colors: string | null | undefined): string[] {
  if (!colors) return []
  const set = new Set<string>()
  for (const ch of String(colors).toUpperCase()) {
    if ('WUBRG'.includes(ch)) set.add(ch)
  }
  return Array.from(set)
}

// Commander cards from row with c1_/c2_ prefixes
function mapCommanderCards(row: any): any[] {
  const out: any[] = []
  if (row.c1_name) {
    out.push({
      card_name: row.c1_name,
      mana_cost: row.c1_mana_cost,
      type_line: row.c1_type_line,
      oracle_text: row.c1_oracle_text,
      power: row.c1_power,
      toughness: row.c1_toughness,
      colors: row.c1_colors,
      color_identity: row.c1_color_identity,
      image_uris: row.c1_image_uris,
      layout: row.c1_layout,
      card_faces: row.c1_card_faces,
      artist: row.c1_artist,
      set_name: row.c1_set_name,
      card_power: row.c1_card_power,
      versatility: row.c1_versatility,
      popularity: row.c1_popularity,
      salt: row.c1_salt,
      price: row.c1_price,
      scryfall_uri: row.c1_scryfall_uri
    })
  }
  if (row.c2_name) {
    out.push({
      card_name: row.c2_name,
      mana_cost: row.c2_mana_cost,
      type_line: row.c2_type_line,
      oracle_text: row.c2_oracle_text,
      power: row.c2_power,
      toughness: row.c2_toughness,
      colors: row.c2_colors,
      color_identity: row.c2_color_identity,
      image_uris: row.c2_image_uris,
      layout: row.c2_layout,
      card_faces: row.c2_card_faces,
      artist: row.c2_artist,
      set_name: row.c2_set_name,
      card_power: row.c2_card_power,
      versatility: row.c2_versatility,
      popularity: row.c2_popularity,
      salt: row.c2_salt,
      price: row.c2_price,
      scryfall_uri: row.c2_scryfall_uri
    })
  }
  return out
}

builder.objectType('DeckBoxData', {
  fields: (t) => ({
    deckId: t.string({ resolve: (p) => p.deckId }),
    tournamentId: t.string({ nullable: true, resolve: (p) => p.tournamentId }),
    tournamentName: t.string({ nullable: true, resolve: (p) => p.tournamentName }),
    tournamentPlayers: t.int({ nullable: true, resolve: (p) => p.totalPlayers ?? null }),
    player: t.string({ resolve: (p) => p.playerName || 'Unknown' }),
    wins: t.int({ resolve: (p) => Number(p.wins || 0) }),
    losses: t.int({ resolve: (p) => Number(p.losses || 0) }),
    draws: t.int({ resolve: (p) => Number(p.draws || 0) }),
    avgWinRate: t.float({ resolve: (p) => Number(p.winRate || 0) }),
    standing: t.int({ nullable: true, resolve: (p) => p.standing ?? null }),
    lastSeen: t.string({ nullable: true, resolve: (p) => p.lastSeen || null }),
    cardCount: t.int({ resolve: (p) => Number(p.totalCards || 0) }),
    sameCommanderCount: t.int({ resolve: (p) => Math.max(0, Number(p.same_commander_count || 0)) }),
    colors: t.field({ type: ['String'], resolve: (p) => parseDeckColorsString(p.deckColors) }),
    top8Count: t.int({ resolve: (p) => (p.standing != null && p.standing <= 8 ? 1 : 0) }),
    commanders: t.field({ type: ['Card'], resolve: (p) => mapCommanderCards(p) }),
  })
})

builder.objectType('DeckMetaData', {
  fields: (t) => ({
    deckId: t.string({ resolve: (p) => p.deckId }),
    tournamentId: t.string({ nullable: true, resolve: (p) => p.tournamentId }),
    tournamentName: t.string({ nullable: true, resolve: (p) => p.tournamentName || null }),
    totalPlayers: t.int({ nullable: true, resolve: (p) => p.totalPlayers ?? null }),
    topCut: t.int({ nullable: true, resolve: (p) => p.topCut ?? null }),
    playerName: t.string({ resolve: (p) => p.playerName || 'Unknown' }),
    wins: t.int({ resolve: (p) => Number(p.wins || 0) }),
    losses: t.int({ resolve: (p) => Number(p.losses || 0) }),
    draws: t.int({ resolve: (p) => Number(p.draws || 0) }),
    winRate: t.float({ resolve: (p) => Number(p.winRate || 0) }),
    standing: t.int({ nullable: true, resolve: (p) => p.standing ?? null }),
    lastSeen: t.string({ nullable: true, resolve: (p) => p.lastSeen || null }),
    commander1: t.field({ type: 'Card', nullable: true, resolve: (p) => mapCommanderCards(p)[0] || null }),
    commander2: t.field({ type: 'Card', nullable: true, resolve: (p) => mapCommanderCards(p)[1] || null }),
  })
})

// Build the schema after all object types are registered
export const schema = builder.toSchema()
