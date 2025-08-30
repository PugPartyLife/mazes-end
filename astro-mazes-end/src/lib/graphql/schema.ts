import SchemaBuilder from '@pothos/core'
import DataloaderPlugin from '@pothos/plugin-dataloader';
import { queryDatabase } from '../db/sqlite'
import type { Card, CommanderPairing, CardStatsSummary, PlayerCardPreference, TrendingCard } from '../../types/cards'

export const builder = new SchemaBuilder<{
  Dataloader: true;
  Objects: {
    Card: Card
    CommanderPairing: CommanderPairing
    CardStatsSummary: CardStatsSummary
    PlayerCardPreference: PlayerCardPreference
    TrendingCard: TrendingCard
  }
}>({
  plugins: [DataloaderPlugin],
})

builder.objectType('Card', {
  fields: (t) => ({
    name: t.exposeString('cardName'),
    totalEntries: t.exposeInt('totalEntries'),
    totalDecks: t.exposeInt('totalDecks'),
    totalTournaments: t.exposeInt('totalTournaments'),
    avgWinRate: t.exposeFloat('avgWinRate'),
    avgStanding: t.exposeFloat('avgStanding'),
    firstSeen: t.exposeString('firstSeen'),
    lastSeen: t.exposeString('lastSeen'),
  }),
})

builder.objectType('CommanderPairing', {
  fields: (t) => ({
    commander1: t.exposeString('commander1'),
    commander2: t.exposeString('commander2', { nullable: true }),
    deckCount: t.exposeInt('deckCount'),
    avgWinRate: t.exposeFloat('avgWinRate'),
    top8Count: t.exposeInt('top8Count'),
    lastSeen: t.exposeString('lastSeen'),
  }),
})

builder.objectType('PlayerCardPreference', {
  fields: (t) => ({
    playerName: t.exposeString('playerName'),
    cardName: t.exposeString('cardName'),
    timesPlayed: t.exposeInt('timesPlayed'),
    tournamentsPlayed: t.exposeInt('tournamentsPlayed'),
    avgPerformance: t.exposeFloat('avgPerformance'),
    lastPlayed: t.exposeString('lastPlayed'),
  }),
})

builder.objectType('TrendingCard', {
  fields: (t) => ({
    cardName: t.exposeString('cardName'),
    entriesRecent: t.exposeInt('entriesRecent'),
    entriesPrevious: t.exposeInt('entriesPrevious'),
    totalEntries: t.exposeInt('totalEntries'),
    growthRate: t.exposeFloat('growthRate'),
  }),
})

builder.objectType('CardStatsSummary', {
  fields: (t) => ({
    totalTournaments: t.exposeInt('totalTournaments'),
    totalDecks: t.exposeInt('totalDecks'),
    totalCardEntries: t.exposeInt('totalCardEntries'),
    uniqueCards: t.exposeInt('uniqueCards'),
    uniquePlayers: t.exposeInt('uniquePlayers'),
    latestTournament: t.exposeString('latestTournament'),
    databasePath: t.exposeString('databasePath'),
    databaseSize: t.exposeInt('databaseSize'),
  }),
})

builder.queryType({
  fields: (t) => ({
    topCards: t.field({
      type: ['Card'],
      args: {
        limit: t.arg.int({ defaultValue: 20 }),
        format: t.arg.string({ required: false }),
      },
      resolve: async (_, { limit, format }) => {
        let query = `
          SELECT 
            card_name as cardName,
            COUNT(*) as totalEntries,
            COUNT(DISTINCT deck_id) as totalDecks,
            COUNT(DISTINCT tournament_id) as totalTournaments,
            AVG(deck_win_rate) as avgWinRate,
            AVG(deck_standing) as avgStanding,
            MIN(tournament_date) as firstSeen,
            MAX(tournament_date) as lastSeen
          FROM card_entries
        `
        
        const params: any[] = []
        if (format) {
          query += ` WHERE tournament_format = ?`
          params.push(format)
        }
        
        query += `
          GROUP BY card_name
          ORDER BY totalEntries DESC
          LIMIT ?
        `
        params.push(limit)
        
        return queryDatabase<Card>(query, params)
      },
    }),
    
    commanderMeta: t.field({
      type: ['CommanderPairing'],
      args: {
        limit: t.arg.int({ defaultValue: 15 }),
        format: t.arg.string({ defaultValue: "EDH" }),
      },
      resolve: async (_, { limit, format }) => {
        return queryDatabase<CommanderPairing>(`
          SELECT 
            d.commander_1 as commander1,
            d.commander_2 as commander2,
            COUNT(DISTINCT d.deck_id) as deckCount,
            AVG(d.win_rate) as avgWinRate,
            COUNT(CASE WHEN d.standing <= 8 THEN 1 END) as top8Count,
            MAX(ce.tournament_date) as lastSeen
          FROM decks d
          JOIN card_entries ce ON d.deck_id = ce.deck_id
          WHERE d.commander_1 IS NOT NULL AND ce.tournament_format = ?
          GROUP BY d.commander_1, d.commander_2
          HAVING deckCount >= 3
          ORDER BY deckCount DESC
          LIMIT ?
        `, [format, limit])
      },
    }),

    playerPreferences: t.field({
      type: ['PlayerCardPreference'],
      args: {
        playerName: t.arg.string({ required: false }),
        limit: t.arg.int({ defaultValue: 20 }),
      },
      resolve: async (_, { playerName, limit }) => {
        let query = `
          SELECT 
            player_name as playerName,
            card_name as cardName,
            COUNT(*) as timesPlayed,
            COUNT(DISTINCT tournament_id) as tournamentsPlayed,
            AVG(deck_win_rate) as avgPerformance,
            MAX(tournament_date) as lastPlayed
          FROM card_entries
          WHERE player_name IS NOT NULL
        `
        
        const params: any[] = []
        if (playerName) {
          query += ` AND player_name = ?`
          params.push(playerName)
        }
        
        query += `
          GROUP BY player_name, card_name
          HAVING timesPlayed >= 2
          ORDER BY timesPlayed DESC, avgPerformance DESC
          LIMIT ?
        `
        params.push(limit)
        
        return queryDatabase<PlayerCardPreference>(query, params)
      },
    }),

    trendingCards: t.field({
      type: ['TrendingCard'],
      args: {
        days: t.arg.int({ defaultValue: 30 }),
        limit: t.arg.int({ defaultValue: 30 }),
      },
      resolve: async (_, { days, limit }) => {
        const daysValue = days ?? 30; // Provide fallback
        
        return queryDatabase<TrendingCard>(`
          SELECT 
            card_name as cardName,
            COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue} days') THEN 1 END) as entriesRecent,
            COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue * 2} days') 
                      AND tournament_date < date('now', '-${daysValue} days') THEN 1 END) as entriesPrevious,
            COUNT(*) as totalEntries,
            CASE 
              WHEN COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue * 2} days') 
                            AND tournament_date < date('now', '-${daysValue} days') THEN 1 END) > 0 
              THEN ((COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue} days') THEN 1 END) - 
                    COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue * 2} days') 
                          AND tournament_date < date('now', '-${daysValue} days') THEN 1 END)) * 100.0 / 
                    COUNT(CASE WHEN tournament_date >= date('now', '-${daysValue * 2} days') 
                          AND tournament_date < date('now', '-${daysValue} days') THEN 1 END))
              ELSE 0.0
            END as growthRate
          FROM card_entries
          WHERE tournament_date >= date('now', '-${daysValue * 2} days')
          GROUP BY card_name
          HAVING entriesRecent >= 3
          ORDER BY entriesRecent DESC
          LIMIT ?
        `, [limit])
      },
    }),

    summary: t.field({
      type: 'CardStatsSummary',
      resolve: async () => {
        const results = await queryDatabase<any>(`
          SELECT 
            (SELECT COUNT(*) FROM tournaments) as totalTournaments,
            (SELECT COUNT(*) FROM decks) as totalDecks,
            (SELECT COUNT(*) FROM card_entries) as totalCardEntries,
            (SELECT COUNT(DISTINCT card_name) FROM card_entries) as uniqueCards,
            (SELECT COUNT(DISTINCT player_name) FROM card_entries WHERE player_name IS NOT NULL) as uniquePlayers,
            (SELECT MAX(tournament_date) FROM card_entries) as latestTournament
        `)
        
        return {
          ...results[0],
          databasePath: './mtg_tournament_data.db',
          databaseSize: 0 // You could add file size calculation here
        }
      },
    }),
  }),
})