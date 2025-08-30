import sqlite3 from 'sqlite3'

export interface CardData {
  cardName: string
  totalEntries: number
  totalDecks: number
  avgWinRate: number
  firstSeen: string
  lastSeen: string
}

export interface CommanderData {
  commander1: string
  commander2: string | null
  deckCount: number
  avgWinRate: number
  top8Count: number
}

export function queryDatabase<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./mtg_tournament_data.db')
    
    db.all(sql, params, (err, rows) => {
      if (err) reject(err)
      else resolve(rows as T[])
    })
    
    db.close()
  })
}
