import sqlite3 from 'sqlite3'
import type { ParsedImageUris } from '../../types'

// Database utility functions
export function queryDatabase<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./test.db')
    
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows as T[])
    })
    
    db.close()
  })
}

export function queryDatabaseSingle<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./test.db')
    
    db.get(sql, params, (err, row) => {
      if (err) reject(err)
      else resolve(row as T || null)
    })
    
    db.close()
  })
}

// Helper functions for parsing JSON fields
export function parseColors(colorsJson: string | null): string[] {
  if (!colorsJson) return []
  try {
    return JSON.parse(colorsJson)
  } catch {
    return []
  }
}

export function parseImageUris(imageUrisJson: string | null): ParsedImageUris {
  if (!imageUrisJson) return {}
  try {
    return JSON.parse(imageUrisJson)
  } catch {
    return {}
  }
}

export function parseArchetypeTags(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
}

// Pre-built queries for common operations
export const queries = {
  topCommanders: (limit: number | null | undefined = 50) => ({
    sql: `SELECT * FROM top_commanders ORDER BY popularity_score DESC LIMIT ?`,
    params: [limit ?? 50]
  }),
  
  topCardsForCommander: (commanderName: string, limit: number | null | undefined = 50) => ({
    sql: `SELECT * FROM top_cards_for_commanders WHERE commander_name = ? ORDER BY inclusion_rate DESC LIMIT ?`,
    params: [commanderName, limit ?? 50]
  }),
  
  commanderRecommendations: (minDecks: number | null | undefined = 5, limit: number | null | undefined = 50) => ({
    sql: `SELECT * FROM commander_recommendations WHERE total_decks >= ? ORDER BY popularity_score DESC LIMIT ?`,
    params: [minDecks ?? 5, limit ?? 50]
  }),
  
  tournamentsByFormat: (format: string | null | undefined, limit: number | null | undefined = 20) => ({
    sql: `SELECT * FROM tournaments WHERE format = ? ORDER BY start_date DESC LIMIT ?`,
    params: [format ?? 'EDH', limit ?? 20]
  }),
  
  playerHistory: (playerId: string) => ({
    sql: `
      SELECT t.tournament_name, t.start_date, d.standing, d.win_rate, 
             d.commander_1, d.commander_2, d.deck_colors
      FROM decks d
      JOIN tournaments t ON d.tournament_id = t.tournament_id
      WHERE d.player_id = ?
      ORDER BY t.start_date DESC
    `,
    params: [playerId]
  }),
  
  deckCards: (deckId: string) => ({
    sql: `
      SELECT dc.*, c.type_line, c.cmc, c.rarity, c.price_usd
      FROM deck_cards dc
      JOIN cards c ON dc.card_name = c.card_name
      WHERE dc.deck_id = ?
      ORDER BY dc.deck_section, c.cmc, dc.card_name
    `,
    params: [deckId]
  }),

  // Cards with aggregated performance stats (used on Cards page)
  cardsWithStats: (
    limit: number = 24,
    offset: number = 0,
    q?: string
  ) => ({
    sql: `
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
    params: q ? [q, q, limit, offset] : [limit, offset]
  }),

  // Recent decks for DeckBox UI (top 3 per recent tournament)
  recentDeckBoxes: (tournamentsLimit: number, limit: number) => ({
    sql: `
      WITH recent_tournaments AS (
        SELECT t.tournament_id, COALESCE(t.start_date, MAX(d.created_at)) AS lastSeen
        FROM tournaments t
        LEFT JOIN decks d ON d.tournament_id = t.tournament_id
        GROUP BY t.tournament_id
        ORDER BY lastSeen DESC
        LIMIT ?
      ),
      deck_totals AS (
        SELECT deck_id, SUM(quantity) AS totalCards
        FROM deck_cards
        GROUP BY deck_id
      ),
      ranked AS (
        SELECT 
          d.deck_id AS deckId,
          d.tournament_id AS tournamentId,
          d.player_name AS playerName,
          d.wins, d.losses, d.draws,
          d.win_rate AS winRate,
          d.deck_colors AS deckColors,
          d.standing, t.top_cut AS topCut,
          t.total_players AS totalPlayers,
          COALESCE(t.start_date, d.created_at) AS lastSeen,
          t.tournament_name AS tournamentName,
          dt.totalCards AS totalCards,
          d.commander_1 AS c1_name,
          d.commander_2 AS c2_name,
          (COUNT(*) OVER (
            PARTITION BY d.tournament_id, d.commander_1, COALESCE(d.commander_2,'')
          ) - 1) AS same_commander_count,
          ROW_NUMBER() OVER (
            PARTITION BY d.tournament_id
            ORDER BY CASE WHEN d.standing IS NULL THEN 999999 ELSE d.standing END ASC, d.win_rate DESC
          ) AS rn
        FROM decks d
        JOIN recent_tournaments rt ON rt.tournament_id = d.tournament_id
        LEFT JOIN tournaments t ON t.tournament_id = d.tournament_id
        LEFT JOIN deck_totals dt ON dt.deck_id = d.deck_id
        WHERE d.has_decklist = 1
          AND d.commander_1 IS NOT NULL AND TRIM(d.commander_1) <> ''
      )
      SELECT ranked.*,
             c1.mana_cost AS c1_mana_cost, c1.type_line AS c1_type_line, c1.oracle_text AS c1_oracle_text,
             c1.power AS c1_power, c1.toughness AS c1_toughness, c1.colors AS c1_colors,
             c1.color_identity AS c1_color_identity, c1.image_uris AS c1_image_uris,
             c1.layout AS c1_layout, c1.card_faces AS c1_card_faces,
             c1.artist AS c1_artist, c1.set_name AS c1_set_name,
             c2.mana_cost AS c2_mana_cost, c2.type_line AS c2_type_line, c2.oracle_text AS c2_oracle_text,
             c2.power AS c2_power, c2.toughness AS c2_toughness, c2.colors AS c2_colors,
             c2.color_identity AS c2_color_identity, c2.image_uris AS c2_image_uris,
             c2.layout AS c2_layout, c2.card_faces AS c2_card_faces,
             c2.artist AS c2_artist, c2.set_name AS c2_set_name
      FROM ranked
      LEFT JOIN cards c1 ON c1.card_name = ranked.c1_name
      LEFT JOIN cards c2 ON c2.card_name = ranked.c2_name
      WHERE ranked.rn <= 3
      ORDER BY ranked.lastSeen DESC, ranked.standing ASC, ranked.winRate DESC
      LIMIT ?
    `,
    params: [tournamentsLimit, limit]
  }),

  // Tournament decks for DeckBox UI
  tournamentDeckBoxes: (tournamentId: string) => ({
    sql: `
      WITH deck_totals AS (
        SELECT deck_id, SUM(quantity) AS totalCards
        FROM deck_cards
        GROUP BY deck_id
      ),
      ranked AS (
        SELECT 
          d.deck_id AS deckId,
          d.tournament_id AS tournamentId,
          d.player_name AS playerName,
          d.wins, d.losses, d.draws,
          d.win_rate AS winRate,
          d.deck_colors AS deckColors,
          d.standing,
          COALESCE(t.start_date, d.created_at) AS lastSeen,
          t.tournament_name AS tournamentName,
          t.total_players AS totalPlayers,
          t.top_cut AS topCut,
          dt.totalCards AS totalCards,
          d.commander_1 AS c1_name,
          d.commander_2 AS c2_name,
          (COUNT(*) OVER (
            PARTITION BY d.tournament_id, d.commander_1, COALESCE(d.commander_2,'')
          ) - 1) AS same_commander_count
        FROM decks d
        LEFT JOIN tournaments t ON t.tournament_id = d.tournament_id
        LEFT JOIN deck_totals dt ON dt.deck_id = d.deck_id
        WHERE d.tournament_id = ?
          AND d.commander_1 IS NOT NULL AND TRIM(d.commander_1) <> ''
      )
      SELECT ranked.*,
             c1.mana_cost AS c1_mana_cost, c1.type_line AS c1_type_line, c1.oracle_text AS c1_oracle_text,
             c1.power AS c1_power, c1.toughness AS c1_toughness, c1.colors AS c1_colors,
             c1.color_identity AS c1_color_identity, c1.image_uris AS c1_image_uris,
             c1.layout AS c1_layout, c1.card_faces AS c1_card_faces,
             c1.artist AS c1_artist, c1.set_name AS c1_set_name,
             c2.mana_cost AS c2_mana_cost, c2.type_line AS c2_type_line, c2.oracle_text AS c2_oracle_text,
             c2.power AS c2_power, c2.toughness AS c2_toughness, c2.colors AS c2_colors,
             c2.color_identity AS c2_color_identity, c2.image_uris AS c2_image_uris,
             c2.layout AS c2_layout, c2.card_faces AS c2_card_faces,
             c2.artist AS c2_artist, c2.set_name AS c2_set_name
      FROM ranked
      LEFT JOIN cards c1 ON c1.card_name = ranked.c1_name
      LEFT JOIN cards c2 ON c2.card_name = ranked.c2_name
      ORDER BY CASE WHEN ranked.standing IS NULL THEN 999999 ELSE ranked.standing END ASC, ranked.winRate DESC
    `,
    params: [tournamentId]
  }),

  // Deck metadata by id with joined commanders & tournament info
  deckMeta: (deckId: string) => ({
    sql: `
      SELECT 
        d.deck_id AS deckId,
        d.tournament_id AS tournamentId,
        d.player_name AS playerName,
        d.wins, d.losses, d.draws,
        d.win_rate AS winRate,
        d.standing,
        COALESCE(t.start_date, d.created_at) AS lastSeen,
        t.tournament_name AS tournamentName,
        t.total_players AS totalPlayers,
        t.top_cut AS topCut,
        d.commander_1 AS c1_name,
        d.commander_2 AS c2_name,
        -- c1
        c1.mana_cost AS c1_mana_cost, c1.type_line AS c1_type_line, c1.oracle_text AS c1_oracle_text,
        c1.power AS c1_power, c1.toughness AS c1_toughness, c1.colors AS c1_colors,
        c1.color_identity AS c1_color_identity, c1.image_uris AS c1_image_uris,
        c1.layout AS c1_layout, c1.card_faces AS c1_card_faces,
        c1.artist AS c1_artist, c1.set_name AS c1_set_name,
        c1.card_power AS c1_card_power, c1.versatility AS c1_versatility,
        c1.popularity AS c1_popularity, c1.salt AS c1_salt, c1.price AS c1_price,
        c1.scryfall_uri AS c1_scryfall_uri,
        -- c2
        c2.mana_cost AS c2_mana_cost, c2.type_line AS c2_type_line, c2.oracle_text AS c2_oracle_text,
        c2.power AS c2_power, c2.toughness AS c2_toughness, c2.colors AS c2_colors,
        c2.color_identity AS c2_color_identity, c2.image_uris AS c2_image_uris,
        c2.layout AS c2_layout, c2.card_faces AS c2_card_faces,
        c2.artist AS c2_artist, c2.set_name AS c2_set_name,
        c2.card_power AS c2_card_power, c2.versatility AS c2_versatility,
        c2.popularity AS c2_popularity, c2.salt AS c2_salt, c2.price AS c2_price,
        c2.scryfall_uri AS c2_scryfall_uri
      FROM decks d
      LEFT JOIN tournaments t ON t.tournament_id = d.tournament_id
      LEFT JOIN cards c1 ON c1.card_name = d.commander_1
      LEFT JOIN cards c2 ON c2.card_name = d.commander_2
      WHERE d.deck_id = ?
      LIMIT 1
    `,
    params: [deckId]
  })
}
