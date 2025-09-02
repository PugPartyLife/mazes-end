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
