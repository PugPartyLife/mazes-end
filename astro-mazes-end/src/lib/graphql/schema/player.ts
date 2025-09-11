import { builder } from './builder'
import { queryDatabase, queries } from '../../db/sqlite'
import type { Player, PlayerHistory } from '../../../types'

// Player type
builder.objectType('Player', {
  fields: (t) => ({
    playerId: t.exposeString('player_id'),
    playerName: t.exposeString('player_name'),
    discordUsername: t.exposeString('discord_username', { nullable: true }),
    discordId: t.exposeString('discord_id', { nullable: true }),
    totalTournaments: t.exposeInt('total_tournaments'),
    firstSeen: t.exposeString('first_seen'),
    lastSeen: t.exposeString('last_seen'),
  }),
})

// Player History object type
builder.objectType('PlayerHistory', {
  fields: (t) => ({
    tournamentName: t.exposeString('tournament_name', { nullable: true }),
    startDate: t.exposeString('start_date', { nullable: true }),
    standing: t.exposeInt('standing', { nullable: true }),
    winRate: t.exposeFloat('win_rate'),
    commander1: t.exposeString('commander_1', { nullable: true }),
    commander2: t.exposeString('commander_2', { nullable: true }),
    deckColors: t.exposeString('deck_colors', { nullable: true }),
  }),
})

// Player-related queries
export const playerQueries = (t: any) => ({
  // Player lookup
  player: t.field({
    type: 'Player',
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_: any, { id }: { id: string }) => {
      const results = await queryDatabase<Player>(
        'SELECT * FROM players WHERE player_id = ?',
        [id]
      )
      return results[0] || null
    },
  }),

  // Player tournament history
  playerHistory: t.field({
    type: ['PlayerHistory'],
    args: {
      playerId: t.arg.string({ required: true }),
    },
    resolve: async (_: any, { playerId }: { playerId: string }) => {
      const { sql, params } = queries.playerHistory(playerId)
      return queryDatabase<PlayerHistory>(sql, params)
    },
  }),
})