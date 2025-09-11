import { builder } from './builder'
import { queryDatabase, queryDatabaseSingle, queries } from '../../db/sqlite'
import { parseColors, parseImageUris, coerceImageObj } from './shared/utils'
import type { Card, CardUsageData, DeckReference } from '../../../types'

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

// ImageUris type
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

builder.objectType('DeckInfo', {
  fields: (t) => ({
    deckId: t.exposeString('deckId'),
    deckName: t.exposeString('deckName'),
    commanderName: t.exposeString('commanderName')
  })
})

builder.objectType('CardUsage', {
  fields: (t) => ({
    cardName: t.exposeString('cardName'),
    timesPlayed: t.exposeInt('timesPlayed'),
    decks: t.field({
      type: ['DeckInfo'],
      resolve: (parent) => parent.decks || []
    }),
    // Link to full card details
    card: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.cardName]
        )
        return results[0] || null
      }
    })
  })
})

// Card-related queries
export const cardQueries = (t: any) => ({
  // Cards page: aggregated performance stats + card
  cardsWithStats: t.field({
    type: ['CardWithStats'],
    args: {
      limit: t.arg.int({ defaultValue: 24 }),
      offset: t.arg.int({ defaultValue: 0 }),
      q: t.arg.string({ required: false })
    },
    resolve: async (_: any, { limit, offset, q }: { limit: number, offset: number, q?: string }) => {
      const { sql, params } = queries.cardsWithStats(limit!, offset!, q ?? undefined)
      return queryDatabase<any>(sql, params)
    }
  }),

  // Card usage tracking
  cardUsage: t.field({
    type: [],
    args: {
      days: t.arg.int({ defaultValue: 30 }),
    },
    resolve: async (_: any, { days }: { days: number }) => {
      const defaultDays = days ?? 30
      const startDate = defaultDays === -1 
        ? '2025-08-01' 
        : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
      // First get the card usage counts
      const cardUsageResults = await queryDatabase<any>(`
        WITH filtered_decks AS (
          SELECT d.deck_id, d.commander_1, d.tournament_id, t.tournament_name
          FROM decks d
          JOIN tournaments t ON d.tournament_id = t.tournament_id
          WHERE t.start_date >= ?
            AND d.has_decklist = 1
        ),
        card_counts AS (
          SELECT 
            dc.card_name,
            COUNT(*) as times_played,
            COUNT(DISTINCT dc.deck_id) as unique_decks
          FROM deck_cards dc
          JOIN filtered_decks fd ON dc.deck_id = fd.deck_id
          WHERE dc.deck_section != 'commander'
          GROUP BY dc.card_name
        )
        SELECT * FROM card_counts
        ORDER BY times_played DESC
        LIMIT 1000
      `, [startDate]);

      // For each card, get the decks it appears in
      const cardUsageWithDecks = await Promise.all(
        cardUsageResults.map(async (cardUsage: any) => {
          const deckResults = await queryDatabase<any>(`
            SELECT DISTINCT
              d.deck_id as deckId,
              COALESCE(t.tournament_name, 'Unknown Tournament') || ' - ' || d.player_name as deckName,
              COALESCE(d.commander_1, 'Unknown Commander') as commanderName
            FROM deck_cards dc
            JOIN decks d ON dc.deck_id = d.deck_id
            JOIN tournaments t ON d.tournament_id = t.tournament_id
            WHERE dc.card_name = ?
              AND t.start_date >= ?
              AND d.has_decklist = 1
              AND dc.deck_section != 'commander'
            ORDER BY t.start_date DESC
            LIMIT 50
          `, [cardUsage.card_name, startDate]);

          return {
            cardName: cardUsage.card_name,
            timesPlayed: cardUsage.times_played,
            decks: deckResults
          };
        })
      );

      return cardUsageWithDecks;
    },
  }),

  // Search cards by name
  searchCards: t.field({
    type: ['Card'],
    args: {
      query: t.arg.string({ required: true }),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_: any, { query, limit }: { query: string, limit: number }) => {
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
    resolve: async (_: any, { name }: { name: string }) => {
      return queryDatabaseSingle<Card>(
        'SELECT * FROM cards WHERE card_name = ?',
        [name]
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
    resolve: async (_: any, { cardType, limit }: { cardType: string, limit: number }) => {
      return queryDatabase<Card>(
        'SELECT * FROM cards WHERE card_type = ? ORDER BY card_name LIMIT ?',
        [cardType, limit ?? 50]
      )
    },
  }),
})