// Server-only card data helpers
import { queryDatabase } from '../lib/db/sqlite'
import { mapCardFromRow } from './cardRowToUi'
import type { DbUICard } from '../types'

type DbCardRow = {
  card_name: string
  mana_cost: string | null
  type_line: string | null
  oracle_text: string | null
  power: string | null
  toughness: string | null
  colors: string | null // JSON
  color_identity: string | null // JSON
  image_uris: string | null // JSON
  layout: string | null
  card_faces: string | null // JSON
  artist: string | null
  set_name: string | null
  card_power: number | null
  versatility: number | null
  popularity: number | null
  salt: number | null
  price: number | null
  scryfall_uri: string | null
}

/**
 * Load top cards using a performance-weighted score from core tables.
 * Score blends: frequency + top finishes + standing + win rate.
 */
export async function loadCardsFromDb(limit = 12): Promise<DbUICard[]> {
  let rows = await queryDatabase<DbCardRow>(
    `
      WITH agg AS (
        SELECT 
          dc.card_name,
          COUNT(DISTINCT dc.deck_id) AS decks_included,
          COUNT(DISTINCT d.tournament_id) AS tournaments_seen,
          AVG(d.win_rate) AS avg_win_rate_with_card,
          AVG(CAST(d.standing AS REAL)) AS avg_standing_with_card,
          COUNT(CASE WHEN d.standing <= 8 THEN 1 END) AS top8_with_card,
          -- Weighted score: frequency + top finishes + standing+winrate influence
          (
            COUNT(DISTINCT dc.deck_id) * 0.5 +
            COUNT(CASE WHEN d.standing <= 8 THEN 1 END) * 1.0 +
            COALESCE((1.0 / AVG(CAST(d.standing AS REAL))) * COUNT(DISTINCT dc.deck_id), 0) * 0.3 +
            COALESCE(AVG(d.win_rate), 0) * COUNT(DISTINCT dc.deck_id) * 0.2
          ) AS score
        FROM deck_cards dc
        JOIN decks d ON d.deck_id = dc.deck_id
        WHERE d.has_decklist = 1 AND dc.deck_section != 'commander'
        GROUP BY dc.card_name
      )
      SELECT c.card_name, c.mana_cost, c.type_line, c.oracle_text, c.power, c.toughness,
             c.colors, c.color_identity, c.image_uris, c.layout, c.card_faces,
             c.artist, c.set_name,
             c.card_power, c.versatility, c.popularity, c.salt, c.price,
             c.scryfall_uri
      FROM agg a
      JOIN cards c ON c.card_name = a.card_name
      ORDER BY a.score DESC
      LIMIT ?
    `,
    [limit]
  )

  if (rows.length === 0) {
    rows = await queryDatabase<DbCardRow>(
      `SELECT card_name, mana_cost, type_line, oracle_text, power, toughness,
              colors, color_identity, image_uris, layout, card_faces,
              artist, set_name,
              card_power, versatility, popularity, salt, price,
              scryfall_uri
       FROM cards WHERE image_uris IS NOT NULL ORDER BY COALESCE(price_usd, 0) DESC LIMIT ?`,
      [limit]
    )
  }
  return rows.map((r) => mapCardFromRow(r, { nameField: 'card_name' }))
}

export type CardWithStats = {
  card: DbUICard
  decksIncluded: number
  tournamentsSeen: number
  top8WithCard: number
  winsWithCard: number
  lossesWithCard: number
  drawsWithCard: number
  avgWinRateWithCard: number
  avgStandingWithCard: number
  inclusionRate: number
  score: number
}

/** Paginated cards with performance stats for richer UI. */
export async function loadCardsWithStats(limit = 24, offset = 0, q?: string): Promise<CardWithStats[]> {
  let rows = await queryDatabase<any>(
    `
      WITH base AS (
        SELECT 
          dc.card_name,
          d.deck_id,
          d.tournament_id,
          COALESCE(d.wins, 0) AS wins,
          COALESCE(d.losses, 0) AS losses,
          COALESCE(d.draws, 0) AS draws,
          CAST(d.standing AS REAL) AS standing,
          d.win_rate AS win_rate
        FROM deck_cards dc
        JOIN decks d ON d.deck_id = dc.deck_id
        WHERE LOWER(dc.deck_section) != 'commander'
      ),
      agg AS (
        SELECT 
          card_name,
          COUNT(DISTINCT deck_id) AS decks_included,
          COUNT(DISTINCT tournament_id) AS tournaments_seen,
          SUM(wins) AS wins_with_card,
          SUM(losses) AS losses_with_card,
          SUM(draws) AS draws_with_card,
          CAST(SUM(wins) AS REAL) / NULLIF(SUM(wins)+SUM(losses)+SUM(draws),0) AS avg_win_rate_with_card,
          AVG(standing) AS avg_standing_with_card,
          COUNT(CASE WHEN standing IS NOT NULL AND standing <= 8 THEN 1 END) AS top8_with_card,
          (
            COUNT(DISTINCT deck_id) * 0.5 +
            COUNT(CASE WHEN standing IS NOT NULL AND standing <= 8 THEN 1 END) * 1.0 +
            COALESCE((1.0 / AVG(standing)) * COUNT(DISTINCT deck_id), 0) * 0.3 +
            COALESCE(CAST(SUM(wins) AS REAL) / NULLIF(SUM(wins)+SUM(losses)+SUM(draws),0), 0) * COUNT(DISTINCT deck_id) * 0.2
          ) AS score
        FROM base
        GROUP BY card_name
      ),
      total AS (
        SELECT COUNT(DISTINCT deck_id) AS decks_total
        FROM deck_cards
        WHERE LOWER(deck_section) != 'commander'
      )
      SELECT a.*, c.card_name, c.mana_cost, c.type_line, c.oracle_text, c.power, c.toughness,
             c.colors, c.color_identity, c.image_uris, c.layout, c.card_faces,
             c.artist, c.set_name,
             c.card_power, c.versatility, c.popularity, c.salt, c.price,
             c.scryfall_uri,
             CAST(a.decks_included AS REAL) / (SELECT decks_total FROM total) AS inclusion_rate
      FROM agg a
      JOIN cards c ON c.card_name = a.card_name
      ${q ? `WHERE (c.card_name LIKE '%' || ? || '%' OR c.type_line LIKE '%' || ? || '%')` : ''}
      ORDER BY a.score DESC
      LIMIT ? OFFSET ?
    `,
    q ? [q, q, limit, offset] : [limit, offset]
  )

  // Fallback: if no usage data, return popular card rows with zeroed stats
  if (!rows || rows.length === 0) {
    rows = await queryDatabase<any>(
      `SELECT card_name, mana_cost, type_line, oracle_text, power, toughness,
              colors, color_identity, image_uris, layout, card_faces,
              artist, set_name,
              card_power, versatility, popularity, salt, price,
              scryfall_uri
       FROM cards WHERE image_uris IS NOT NULL
       ORDER BY COALESCE(price_usd, 0) DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    )
    return rows.map((r: any) => ({
      card: mapCardFromRow(r, { nameField: 'card_name' }),
      decksIncluded: 0,
      tournamentsSeen: 0,
      top8WithCard: 0,
      winsWithCard: 0,
      lossesWithCard: 0,
      drawsWithCard: 0,
      avgWinRateWithCard: 0,
      avgStandingWithCard: 0,
      inclusionRate: 0,
      score: 0
    }))
  }

  return rows.map((r: any) => ({
    card: mapCardFromRow(r, { nameField: 'card_name' }),
    decksIncluded: Number(r.decks_included || 0),
    tournamentsSeen: Number(r.tournaments_seen || 0),
    top8WithCard: Number(r.top8_with_card || 0),
    winsWithCard: Number(r.wins_with_card || 0),
    lossesWithCard: Number(r.losses_with_card || 0),
    drawsWithCard: Number(r.draws_with_card || 0),
    avgWinRateWithCard: Number(r.avg_win_rate_with_card || 0),
    avgStandingWithCard: Number(r.avg_standing_with_card || 0),
    inclusionRate: Math.max(0, Math.min(1, Number(r.inclusion_rate || 0))),
    score: Number(r.score || 0)
  }))
}
