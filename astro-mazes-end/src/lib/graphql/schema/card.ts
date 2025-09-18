import { builder } from './builder'
import { queryDatabase, queryDatabaseSingle, queries } from '../../db/sqlite'
import { parseColors, parseImageUris, coerceImageObj } from './shared/utils'
import type { Card, CardUsageData, DeckReference, CardFrequencyChange } from '../../../types'

function parseDeckColors(colors: string | null): string[] {
  if (!colors) return [];
  return colors.split('').filter(c => 'WUBRG'.includes(c));
}

function mapCommanderCards(row: any): any[] {
  const commanders = [];
  
  if (row.c1_name) {
    commanders.push({
      id: row.c1_name,
      card_name: row.c1_name,
      name: row.c1_name,
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
    });
  }
  
  if (row.c2_name) {
    commanders.push({
      id: row.c2_name,
      card_name: row.c2_name,
      name: row.c2_name,
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
    });
  }
  
  return commanders;
}

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

builder.objectType('CardUsageWithDetails', {
  fields: (t) => ({
    cardName: t.exposeString('cardName'),
    timesPlayed: t.exposeInt('timesPlayed'),
    deckBoxes: t.field({
      type: ['DeckBoxData'],
      resolve: (parent) => parent.deckBoxes || []
    }),
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

builder.objectType('DeckInfo', {
  fields: (t) => ({
    deckId: t.exposeString('deckId'),
    deckName: t.exposeString('deckName'),
    commanderName: t.exposeString('commanderName')
  })
})

builder.objectType('DeckBoxData', {
  fields: (t) => ({
    deckId: t.exposeString('deckId'),
    tournamentId: t.exposeString('tournamentId'),
    tournamentName: t.exposeString('tournamentName'),
    totalPlayers: t.exposeInt('totalPlayers', { nullable: true }),
    player: t.exposeString('playerName'),
    wins: t.exposeInt('wins'),
    losses: t.exposeInt('losses'),
    draws: t.exposeInt('draws'),
    winRate: t.exposeFloat('winRate', { nullable: true }),
    standing: t.exposeInt('standing', { nullable: true }),
    lastSeen: t.exposeString('lastSeen'),
    cardCount: t.exposeInt('totalCards'),
    colors: t.exposeString('deckColors', { nullable: true }),
    sameCommanderCount: t.exposeInt('same_commander_count'),
    commanders: t.field({
      type: ['Card'],
      resolve: (parent) => mapCommanderCards(parent)
    })
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

// Monthly card frequency change tracking
builder.objectType('CardFrequencyChange', {
  fields: (t) => ({
    cardName: t.exposeString('cardName'),
    month: t.exposeString('month'), // Format: YYYY-MM
    previousMonth: t.exposeString('previousMonth'),
    currentFrequency: t.exposeInt('currentFrequency'), // Number of decks this month
    previousFrequency: t.exposeInt('previousFrequency'), // Number of decks previous month
    percentageChange: t.exposeFloat('percentageChange'), // % change from previous month
    absoluteChange: t.exposeInt('absoluteChange'), // Raw difference in deck count
    significanceScore: t.exposeFloat('significanceScore'), // Statistical significance of change
    
    // Link to card details
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
    type: ['CardUsage'],
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

  // Track significant card frequency changes month-over-month
  cardFrequencyChanges: t.field({
    type: ['CardFrequencyChange'],
    args: {
      minChangePercent: t.arg.float({ defaultValue: 20.0 }), // Minimum % change to be considered significant
      minDecksThreshold: t.arg.int({ defaultValue: 10 }), // Minimum decks in a month to consider
      monthsBack: t.arg.int({ defaultValue: 6 }), // How many months back to analyze
    },
    resolve: async (_: any, { minChangePercent, minDecksThreshold, monthsBack }: { 
      minChangePercent: number, 
      minDecksThreshold: number,
      monthsBack: number 
    }) => {
      // Query to calculate month-over-month card frequency changes
      const results = await queryDatabase<any>(`
        WITH monthly_card_counts AS (
          -- Count card usage by month
          SELECT 
            dc.card_name,
            strftime('%Y-%m', t.start_date) as month,
            COUNT(DISTINCT dc.deck_id) as deck_count,
            COUNT(DISTINCT t.tournament_id) as tournament_count
          FROM deck_cards dc
          JOIN decks d ON dc.deck_id = d.deck_id
          JOIN tournaments t ON d.tournament_id = t.tournament_id
          WHERE d.has_decklist = 1
            AND dc.deck_section != 'commander'
            AND t.start_date >= date('now', '-' || ? || ' months')
          GROUP BY dc.card_name, strftime('%Y-%m', t.start_date)
          HAVING COUNT(DISTINCT dc.deck_id) >= ?
        ),
        month_pairs AS (
          -- Join each month with its previous month
          SELECT 
            curr.card_name,
            curr.month,
            prev.month as previous_month,
            curr.deck_count as current_frequency,
            prev.deck_count as previous_frequency,
            CAST((curr.deck_count - prev.deck_count) AS REAL) / prev.deck_count * 100 as percentage_change,
            curr.deck_count - prev.deck_count as absolute_change,
            -- Simple significance score based on both absolute and percentage change
            ABS(CAST((curr.deck_count - prev.deck_count) AS REAL) / prev.deck_count) * 
            LOG(curr.deck_count + prev.deck_count) as significance_score
          FROM monthly_card_counts curr
          INNER JOIN monthly_card_counts prev 
            ON curr.card_name = prev.card_name
            AND prev.month = strftime('%Y-%m', date(curr.month || '-01', '-1 month'))
          WHERE ABS(CAST((curr.deck_count - prev.deck_count) AS REAL) / prev.deck_count * 100) >= ?
        )
        SELECT 
          card_name as cardName,
          month,
          previous_month as previousMonth,
          current_frequency as currentFrequency,
          previous_frequency as previousFrequency,
          ROUND(percentage_change, 2) as percentageChange,
          absolute_change as absoluteChange,
          ROUND(significance_score, 3) as significanceScore
        FROM month_pairs
        ORDER BY month DESC, significance_score DESC
      `, [monthsBack, minDecksThreshold, minChangePercent]);

      return results;
    }
  }),

  // Get trending cards for a specific month
  trendingCardsForMonth: t.field({
    type: ['CardFrequencyChange'],
    args: {
      month: t.arg.string({ required: true }), // Format: YYYY-MM
      direction: t.arg.string({ defaultValue: 'both' }), // 'up', 'down', or 'both'
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_: any, { month, direction, limit }: { 
      month: string, 
      direction: string,
      limit: number 
    }) => {
      let directionClause = '';
      if (direction === 'up') {
        directionClause = 'AND percentage_change > 0';
      } else if (direction === 'down') {
        directionClause = 'AND percentage_change < 0';
      }

      const results = await queryDatabase<any>(`
        WITH monthly_card_counts AS (
          SELECT 
            dc.card_name,
            strftime('%Y-%m', t.start_date) as month,
            COUNT(DISTINCT dc.deck_id) as deck_count
          FROM deck_cards dc
          JOIN decks d ON dc.deck_id = d.deck_id
          JOIN tournaments t ON d.tournament_id = t.tournament_id
          WHERE d.has_decklist = 1
            AND dc.deck_section != 'commander'
            AND strftime('%Y-%m', t.start_date) IN (?, strftime('%Y-%m', date(? || '-01', '-1 month')))
          GROUP BY dc.card_name, strftime('%Y-%m', t.start_date)
          HAVING COUNT(DISTINCT dc.deck_id) >= 10
        ),
        month_comparison AS (
          SELECT 
            curr.card_name,
            curr.month,
            prev.month as previous_month,
            curr.deck_count as current_frequency,
            prev.deck_count as previous_frequency,
            CAST((curr.deck_count - prev.deck_count) AS REAL) / prev.deck_count * 100 as percentage_change,
            curr.deck_count - prev.deck_count as absolute_change,
            ABS(CAST((curr.deck_count - prev.deck_count) AS REAL) / prev.deck_count) * 
            LOG(curr.deck_count + prev.deck_count) as significance_score
          FROM monthly_card_counts curr
          INNER JOIN monthly_card_counts prev 
            ON curr.card_name = prev.card_name
            AND curr.month = ?
            AND prev.month = strftime('%Y-%m', date(? || '-01', '-1 month'))
          WHERE 1=1 ${directionClause}
        )
        SELECT 
          card_name as cardName,
          month,
          previous_month as previousMonth,
          current_frequency as currentFrequency,
          previous_frequency as previousFrequency,
          ROUND(percentage_change, 2) as percentageChange,
          absolute_change as absoluteChange,
          ROUND(significance_score, 3) as significanceScore
        FROM month_comparison
        ORDER BY significance_score DESC
        LIMIT ?
      `, [month, month, month, month, limit]);

      return results;
    }
  }),

  // Get available months with card data
  availableMonthsForFrequency: t.field({
    type: ['String'],
    resolve: async () => {
      const results = await queryDatabase<{ month: string }>(`
        SELECT DISTINCT strftime('%Y-%m', t.start_date) as month
        FROM tournaments t
        JOIN decks d ON t.tournament_id = d.tournament_id
        WHERE d.has_decklist = 1
        ORDER BY month DESC
      `, []);
      
      return results.map(r => r.month);
    }
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

  randomCards: t.field({
    type: ['Card'],
    args: {
      count: t.arg.int({ defaultValue: 1 }),
      excludeBasicLands: t.arg.boolean({ defaultValue: true }),
      minPlays: t.arg.int({ required: false }),
      maxPlays: t.arg.int({ required: false }),
      days: t.arg.int({ defaultValue: 30 }),
    },
    resolve: async (_: any, { count, excludeBasicLands, minPlays, maxPlays, days }: { 
      count: number, 
      excludeBasicLands: boolean,
      minPlays?: number,
      maxPlays?: number,
      days: number
    }) => {
      const excludeClause = excludeBasicLands 
        ? `AND c.card_name NOT IN ('Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 
          'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 
          'Snow-Covered Mountain', 'Snow-Covered Forest', 'Wastes')` 
        : '';
      
      // Calculate start date for play count filtering
      const startDate = days === -1
        ? '2025-08-01'
        : new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Build play count filtering
      let playCountJoin = '';
      let playCountWhere = '';
      const params: any[] = [];
      
      if (minPlays !== undefined || maxPlays !== undefined) {
        playCountJoin = `
          LEFT JOIN (
            SELECT dc.card_name, COUNT(*) as play_count
            FROM deck_cards dc
            JOIN decks d ON dc.deck_id = d.deck_id
            JOIN tournaments t ON d.tournament_id = t.tournament_id
            WHERE t.start_date >= ?
              AND d.has_decklist = 1
              AND dc.deck_section != 'commander'
            GROUP BY dc.card_name
          ) pc ON c.card_name = pc.card_name
        `;
        params.push(startDate);
        
        if (minPlays !== undefined && maxPlays !== undefined) {
          playCountWhere = `AND COALESCE(pc.play_count, 0) >= ? AND COALESCE(pc.play_count, 0) <= ?`;
          params.push(minPlays, maxPlays);
        } else if (minPlays !== undefined) {
          playCountWhere = `AND COALESCE(pc.play_count, 0) >= ?`;
          params.push(minPlays);
        } else if (maxPlays !== undefined) {
          playCountWhere = `AND COALESCE(pc.play_count, 0) <= ?`;
          params.push(maxPlays);
        }
      }
      
      params.push(count);
      
      return queryDatabase<Card>(
        `SELECT c.* FROM cards c
        ${playCountJoin}
        WHERE 1=1 
        ${excludeClause}
        ${playCountWhere}
        ORDER BY RANDOM() 
        LIMIT ?`,
        params
      );
    },
  }),

  cardUsageWithDeckDetails: t.field({
    type: ['CardUsageWithDetails'],
    args: {
      days: t.arg.int({ defaultValue: 30 }),
      cardName: t.arg.string({ required: false }),
    },
    resolve: async (_: any, { days, cardName }: { days: number, cardName?: string }) => {
      const defaultDays = days ?? 30;
      const startDate = defaultDays === -1
        ? '2025-08-01'
        : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Build the WHERE clause for card filtering
      const cardWhereClause = cardName ? 'AND dc.card_name = ?' : '';
      const cardParams = cardName ? [cardName] : [];

      // Single query that gets all data at once
      const results = await queryDatabase<any>(`
        WITH card_usage AS (
          SELECT 
            dc.card_name,
            COUNT(*) as times_played,
            COUNT(DISTINCT dc.deck_id) as unique_decks
          FROM deck_cards dc
          JOIN decks d ON dc.deck_id = d.deck_id
          JOIN tournaments t ON d.tournament_id = t.tournament_id
          WHERE t.start_date >= ?
            AND d.has_decklist = 1
            AND dc.deck_section != 'commander'
            ${cardWhereClause}
          GROUP BY dc.card_name
          ORDER BY times_played DESC
          ${cardName ? '' : 'LIMIT 100'}
        )
        SELECT 
          cu.card_name,
          cu.times_played,
          d.deck_id,
          d.player_name,
          d.standing,
          d.wins,
          d.losses,
          d.draws,
          d.win_rate,
          d.commander_1,
          d.commander_2,
          d.deck_colors,
          t.tournament_id,
          t.tournament_name,
          t.start_date,
          t.total_players,
          (SELECT COUNT(*) FROM deck_cards WHERE deck_id = d.deck_id) as card_count,
          (SELECT COUNT(*) FROM decks d2 WHERE d2.tournament_id = d.tournament_id AND d2.commander_1 = d.commander_1) as same_commander_count,
          c1.card_name as c1_name,
          c1.mana_cost as c1_mana_cost,
          c1.type_line as c1_type_line,
          c1.oracle_text as c1_oracle_text,
          c1.power as c1_power,
          c1.toughness as c1_toughness,
          c1.colors as c1_colors,
          c1.color_identity as c1_color_identity,
          c1.image_uris as c1_image_uris,
          c1.layout as c1_layout,
          c1.card_faces as c1_card_faces,
          c1.artist as c1_artist,
          c1.set_name as c1_set_name,
          c1.card_power as c1_card_power,
          c1.versatility as c1_versatility,
          c1.popularity as c1_popularity,
          c1.salt as c1_salt,
          c1.price as c1_price,
          c1.scryfall_uri as c1_scryfall_uri,
          c2.card_name as c2_name,
          c2.mana_cost as c2_mana_cost,
          c2.type_line as c2_type_line,
          c2.oracle_text as c2_oracle_text,
          c2.power as c2_power,
          c2.toughness as c2_toughness,
          c2.colors as c2_colors,
          c2.color_identity as c2_color_identity,
          c2.image_uris as c2_image_uris,
          c2.layout as c2_layout,
          c2.card_faces as c2_card_faces,
          c2.artist as c2_artist,
          c2.set_name as c2_set_name,
          c2.card_power as c2_card_power,
          c2.versatility as c2_versatility,
          c2.popularity as c2_popularity,
          c2.salt as c2_salt,
          c2.price as c2_price,
          c2.scryfall_uri as c2_scryfall_uri
        FROM card_usage cu
        JOIN deck_cards dc ON dc.card_name = cu.card_name
        JOIN decks d ON dc.deck_id = d.deck_id
        JOIN tournaments t ON d.tournament_id = t.tournament_id
        LEFT JOIN cards c1 ON d.commander_1 = c1.card_name
        LEFT JOIN cards c2 ON d.commander_2 = c2.card_name
        WHERE t.start_date >= ?
          AND d.has_decklist = 1
          AND dc.deck_section != 'commander'
        ORDER BY cu.times_played DESC, t.start_date DESC
      `, [startDate, ...cardParams, startDate]);

      // Group results by card
      const cardMap = new Map<string, any>();
      
      results.forEach(row => {
        if (!cardMap.has(row.card_name)) {
          cardMap.set(row.card_name, {
            cardName: row.card_name,
            timesPlayed: row.times_played,
            deckBoxes: []
          });
        }
        
        const card = cardMap.get(row.card_name);
        const existingDeck = card.deckBoxes.find((d: any) => d.deckId === row.deck_id);
        
        if (!existingDeck && card.deckBoxes.length < 50) {
          card.deckBoxes.push({
            deckId: row.deck_id,
            tournamentId: row.tournament_id,
            tournamentName: row.tournament_name,
            totalPlayers: row.total_players,
            playerName: row.player_name,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws,
            winRate: row.win_rate,
            standing: row.standing,
            lastSeen: row.start_date,
            totalCards: row.card_count,
            deckColors: row.deck_colors,
            same_commander_count: row.same_commander_count,
            c1_name: row.c1_name,
            c1_mana_cost: row.c1_mana_cost,
            c1_type_line: row.c1_type_line,
            c1_oracle_text: row.c1_oracle_text,
            c1_power: row.c1_power,
            c1_toughness: row.c1_toughness,
            c1_colors: row.c1_colors,
            c1_color_identity: row.c1_color_identity,
            c1_image_uris: row.c1_image_uris,
            c1_layout: row.c1_layout,
            c1_card_faces: row.c1_card_faces,
            c1_artist: row.c1_artist,
            c1_set_name: row.c1_set_name,
            c1_card_power: row.c1_card_power,
            c1_versatility: row.c1_versatility,
            c1_popularity: row.c1_popularity,
            c1_salt: row.c1_salt,
            c1_price: row.c1_price,
            c1_scryfall_uri: row.c1_scryfall_uri,
            c2_name: row.c2_name,
            c2_mana_cost: row.c2_mana_cost,
            c2_type_line: row.c2_type_line,
            c2_oracle_text: row.c2_oracle_text,
            c2_power: row.c2_power,
            c2_toughness: row.c2_toughness,
            c2_colors: row.c2_colors,
            c2_color_identity: row.c2_color_identity,
            c2_image_uris: row.c2_image_uris,
            c2_layout: row.c2_layout,
            c2_card_faces: row.c2_card_faces,
            c2_artist: row.c2_artist,
            c2_set_name: row.c2_set_name,
            c2_card_power: row.c2_card_power,
            c2_versatility: row.c2_versatility,
            c2_popularity: row.c2_popularity,
            c2_salt: row.c2_salt,
            c2_price: row.c2_price,
            c2_scryfall_uri: row.c2_scryfall_uri
          });
        }
      });

      return Array.from(cardMap.values());
    },
  }),
})