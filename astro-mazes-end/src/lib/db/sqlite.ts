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
  })
}