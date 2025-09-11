import { builder } from './builder'
import { queryDatabase, queries } from '../../db/sqlite'
import { parseColors, parseImageUris, parseArchetypeTags } from './shared/utils'
import type { TopCommander, TopCardForCommander, CommanderRecommendation, Card } from '../../../types'

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

// Commander-related queries
export const commanderQueries = (t: any) => ({
  // Top commanders using the view
  topCommanders: t.field({
    type: ['TopCommander'],
    args: {
      limit: t.arg.int({ defaultValue: 50 }),
      minDecks: t.arg.int({ defaultValue: 5 }),
    },
    resolve: async (_: any, { limit, minDecks }: { limit: number, minDecks: number }) => {
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
    resolve: async (_: any, { name }: { name: string }) => {
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
    resolve: async (_: any, { commanderName, limit, minInclusions }: { commanderName: string, limit: number, minInclusions: number }) => {
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
    resolve: async (_: any, { minDecks, limit, archetypeFilter }: { minDecks: number, limit: number, archetypeFilter?: string }) => {
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
})