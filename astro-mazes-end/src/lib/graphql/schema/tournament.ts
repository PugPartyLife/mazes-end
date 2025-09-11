import { builder } from './builder'
import { queryDatabase, queryDatabaseSingle, queries } from '../../db/sqlite'
import type { Tournament, Deck } from '../../../types'

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

builder.objectType('TournamentResult', {
  fields: (t) => ({
    date: t.exposeString('date'),
    tournamentName: t.exposeString('tournament_name'),
    tournamentId: t.exposeString('tournament_id'),
    wins: t.exposeInt('wins'),
    draws: t.exposeInt('draws'),
    losses: t.exposeInt('losses'),
  }),
})

// Tournament-related queries
export const tournamentQueries = (t: any) => ({
  // Tournaments by format
  tournaments: t.field({
    type: ['Tournament'],
    args: {
      format: t.arg.string({ defaultValue: 'EDH' }),
      limit: t.arg.int({ defaultValue: 20 }),
    },
    resolve: async (_: any, { format, limit }: { format: string, limit: number }) => {
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
    resolve: async (_: any, { id }: { id: string }) => {
      return queryDatabaseSingle<Tournament>(
        'SELECT * FROM tournaments WHERE tournament_id = ?',
        [id]
      )
    },
  }),

  tournamentResults: t.field({
    type: ['TournamentResult'],
    args: {
      days: t.arg.int({ defaultValue: 30 }),
    },
    resolve: async (_: any, { days }: { days: number }) => {
      const defaultDays = days ?? 30
      const startDate = defaultDays === -1 
        ? '2025-08-01' 
        : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Using your existing queryDatabase function
      return queryDatabase<any>(
        `SELECT 
          DATE(t.start_date) as date,
          t.tournament_name,
          t.tournament_id,
          SUM(d.wins) as wins,
          SUM(d.draws) as draws,
          SUM(d.losses) as losses
        FROM tournaments t
        JOIN decks d ON t.tournament_id = d.tournament_id
        WHERE t.start_date >= ?
        GROUP BY DATE(t.start_date), t.tournament_name, t.tournament_id
        ORDER BY date DESC
        LIMIT 50`,
        [startDate]
      );
    },
  }),
})