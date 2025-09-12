import { queryDatabase, queryDatabaseSingle, queries, parseColors, parseImageUris, parseArchetypeTags } from '../db/sqlite'
import { getComboGraphClient } from '../graph/comboGraphClient'
import { builder } from './schema/builder'
import { playerQueries } from './schema/player'
import { tournamentQueries } from './schema/tournament'
import { commanderQueries } from './schema/commander'
import { cardQueries } from './schema/card'
import type { ComboData, ComboPackage, Distance1Result, GraphStatistics, ComboSearchResult, TournamentResult, RandomCombosResult } from '../graph/comboGraphClient'
import type { 
  TopCommander, 
  TopCardForCommander, 
  CommanderRecommendation,
  Tournament,
  Player,
  Deck,
  Card,
  DeckCard,
  PlayerHistory,
  DatabaseSummary,
  ParsedImageUris,
  CardUsageData,
  DeckReference,
} from '../../types'

// Deck type
builder.objectType('Deck', {
  fields: (t) => ({
    deckId: t.exposeString('deck_id'),
    tournamentId: t.exposeString('tournament_id'),
    playerId: t.exposeString('player_id', { nullable: true }),
    playerName: t.exposeString('player_name'),
    standing: t.exposeInt('standing', { nullable: true }),
    wins: t.exposeInt('wins'),
    losses: t.exposeInt('losses'),
    draws: t.exposeInt('draws'),
    winsSwiss: t.exposeInt('wins_swiss'),
    lossesSwiss: t.exposeInt('losses_swiss'),
    winsBracket: t.exposeInt('wins_bracket'),
    lossesBracket: t.exposeInt('losses_bracket'),
    winRate: t.exposeFloat('win_rate'),
    byes: t.exposeInt('byes'),
    decklistRaw: t.exposeString('decklist_raw', { nullable: true }),
    decklistParsed: t.exposeBoolean('decklist_parsed'),
    commander1: t.exposeString('commander_1', { nullable: true }),
    commander2: t.exposeString('commander_2', { nullable: true }),
    deckColors: t.exposeString('deck_colors', { nullable: true }),
    hasDecklist: t.exposeBoolean('has_decklist'),
    createdAt: t.exposeString('created_at'),
    
    // Add cards in this deck
    cards: t.field({
      type: ['DeckCard'],
      resolve: async (parent) => {
        return queryDatabase<DeckCard>(
          'SELECT * FROM deck_cards WHERE deck_id = ? ORDER BY deck_section, card_name',
          [parent.deck_id]
        )
      }
    }),
  }),
})

// DeckCard type
builder.objectType('DeckCard', {
  fields: (t) => ({
    deckId: t.exposeString('deck_id'),
    cardName: t.exposeString('card_name'),
    quantity: t.exposeInt('quantity'),
    deckSection: t.exposeString('deck_section'),
    
    // Add card details
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

// Database summary
builder.objectType('DatabaseSummary', {
  fields: (t) => ({
    totalTournaments: t.exposeInt('totalTournaments'),
    totalPlayers: t.exposeInt('totalPlayers'),
    totalDecks: t.exposeInt('totalDecks'),
    totalCards: t.exposeInt('totalCards'),
    totalDeckCards: t.exposeInt('totalDeckCards'),
    latestTournament: t.exposeString('latestTournament'),
    databasePath: t.exposeString('databasePath'),
  }),
})

builder.objectType('Combo', {
  fields: (t) => ({
    id: t.exposeString('id'),
    cardNames: t.field({
      type: ['String'],
      resolve: (parent) => parent.card_names || []
    }),
    produces: t.field({
      type: ['String'],
      resolve: (parent) => parent.produces || []
    }),
    prerequisites: t.field({
      type: ['String'],
      resolve: (parent) => parent.prerequisites || []
    }),
    steps: t.field({
      type: ['String'],
      resolve: (parent) => parent.steps || []
    }),
    colorIdentity: t.exposeString('color_identity'),
    cards: t.field({
      type: ['ComboCard'],
      resolve: (parent) => parent.cards || []
    })
  })
})

// ComboCard type
builder.objectType('ComboCard', {
  fields: (t) => ({
    name: t.exposeString('name'),
    combosCount: t.exposeInt('combos_count'),
    // Link to your existing Card type
    cardData: t.field({
      type: 'Card',
      nullable: true,
      resolve: async (parent) => {
        const results = await queryDatabase<Card>(
          'SELECT * FROM cards WHERE card_name = ?',
          [parent.name]
        )
        return results[0] || null
      }
    })
  })
})

// Distance 1 result type
builder.objectType('Distance1ComboResult', {
  fields: (t) => ({
    total: t.exposeInt('total'),
    combos: t.field({
      type: ['Distance1Combo'],
      resolve: (parent) => parent.combos || []
    })
  })
})

builder.objectType('Distance1Combo', {
  fields: (t) => ({
    id: t.exposeString('id'),
    sharedCards: t.field({
      type: ['String'],
      resolve: (parent) => parent.shared_cards || []
    }),
    sharedCardsCount: t.exposeInt('shared_cards_count'),
    colorIdentity: t.exposeString('color_identity'),
    produces: t.field({
      type: ['String'],
      resolve: (parent) => parent.produces || []
    }),
    combo: t.field({
      type: 'Combo',
      nullable: true,
      resolve: async (parent) => {
        const client = getComboGraphClient()
        return client.getComboById(parent.id)
      }
    })
  })
})

// Combo search result
builder.objectType('ComboSearchResult', {
  fields: (t) => ({
    cardName: t.exposeString('card_name'),
    totalCombos: t.exposeInt('total_combos'),
    combos: t.field({
      type: ['ComboSummary'],
      resolve: (parent) => parent.combos || []
    })
  })
})

builder.objectType('ComboSummary', {
  fields: (t) => ({
    id: t.exposeString('id'),
    colorIdentity: t.exposeString('color_identity'),
    produces: t.field({
      type: ['String'],
      resolve: (parent) => parent.produces || []
    }),
    cardNames: t.field({
      type: ['String'],
      resolve: (parent) => parent.card_names || []
    })
  })
})

// Card importance
builder.objectType('CardImportanceResult', {
  fields: (t) => ({
    name: t.exposeString('name', { nullable: true }),
    combosCount: t.exposeInt('combos_count'),
    degreeCentrality: t.exposeFloat('degree_centrality'),
    betweennessCentrality: t.exposeFloat('betweenness_centrality'),
    eigenvectorCentrality: t.exposeFloat('eigenvector_centrality'),
    comboIds: t.field({
      type: ['String'],
      resolve: (parent) => parent.combo_ids || []
    })
  })
})

// Combo package
builder.objectType('ComboPackage', {
  fields: (t) => ({
    comboIds: t.field({
      type: ['String'],
      resolve: (parent) => parent.combo_ids || []
    }),
    comboCount: t.exposeInt('combo_count'),
    totalUniqueCards: t.exposeInt('total_unique_cards'),
    coreCards: t.field({
      type: ['String'],
      resolve: (parent) => parent.core_cards || []
    }),
    allCards: t.field({
      type: ['String'],
      resolve: (parent) => parent.all_cards || []
    }),
    combos: t.field({
      type: ['Combo'],
      resolve: async (parent) => {
        const client = getComboGraphClient()
        const combos = await Promise.all(
          parent.combo_ids.slice(0, 10).map(id => client.getComboById(id))
        )
        return combos.filter((combo): combo is ComboData => combo !== null)
      }
    })
  })
})

// Graph statistics
builder.objectType('ComboGraphStats', {
  fields: (t) => ({
    totalCombos: t.exposeInt('total_combos'),
    totalCards: t.exposeInt('total_cards'),
    totalEdges: t.exposeInt('total_edges'),
    graphDensity: t.exposeFloat('graph_density'),
    avgCardsPerCombo: t.exposeFloat('avg_cards_per_combo'),
    avgCombosPerCard: t.exposeFloat('avg_combos_per_card'),
    mostConnectedCombos: t.field({
      type: ['ComboConnection'],
      resolve: (parent) => {
        return parent.most_connected_combos.map(([id, count]: [string, number]) => ({
          combo_id: id,
          connection_count: count
        }))
      }
    }),
    mostVersatileCards: t.field({
      type: ['CardVersatility'],
      resolve: (parent) => {
        return parent.most_versatile_cards.map(([name, count]: [string, number]) => ({
          card_name: name,
          combo_count: count
        }))
      }
    }),
    colorDistribution: t.field({
      type: ['ColorCount'],
      resolve: (parent) => {
        return Object.entries(parent.color_distribution || {}).map(([color, count]) => ({
          color,
          count: count as number
        }))
      }
    })
  })
})

builder.objectType('ComboConnection', {
  fields: (t) => ({
    comboId: t.exposeString('combo_id'),
    connectionCount: t.exposeInt('connection_count'),
    combo: t.field({
      type: 'Combo',
      nullable: true,
      resolve: async (parent) => {
        const client = getComboGraphClient()
        return client.getComboById(parent.combo_id)
      }
    })
  })
})

builder.objectType('CardVersatility', {
  fields: (t) => ({
    cardName: t.exposeString('card_name'),
    comboCount: t.exposeInt('combo_count'),
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
    })
  })
})

builder.objectType('ColorCount', {
  fields: (t) => ({
    color: t.exposeString('color'),
    count: t.exposeInt('count')
  })
})

builder.objectType('RandomCombosResult', {
  fields: (t) => ({
    maxCards: t.exposeInt('max_cards'),
    requestedCount: t.exposeInt('requested_count'),
    returnedCount: t.exposeInt('returned_count'),
    totalEligible: t.exposeInt('total_eligible'),
    combos: t.field({
      type: ['Combo'],
      resolve: (parent) => parent.combos || []
    })
  })
})

builder.queryType({
  fields: (t) => ({
    ...playerQueries(t),
    ...tournamentQueries(t),
    ...commanderQueries(t),
    ...cardQueries(t), // This imports ALL card queries including the new ones

    // Remove the duplicate card queries that are now in cardQueries
    // Keep only the non-card queries below:

    randomCombos: t.field({
      type: 'RandomCombosResult',
      args: {
        maxCards: t.arg.int({ 
          defaultValue: 5,
          description: 'Maximum number of cards allowed in combos' 
        }),
        count: t.arg.int({ 
          defaultValue: 10,
          description: 'Number of random combos to return (max 100)' 
        })
      },
      resolve: async (_, { maxCards, count }) => {
        const client = getComboGraphClient()
        return client.getRandomCombos(maxCards ?? 5, count ?? 10)
      }
    }),

    // Database summary statistics
    summary: t.field({
      type: 'DatabaseSummary',
      resolve: async () => {
        const results = await queryDatabase<any>(`
          SELECT 
            (SELECT COUNT(*) FROM tournaments) as totalTournaments,
            (SELECT COUNT(*) FROM players) as totalPlayers,
            (SELECT COUNT(*) FROM decks) as totalDecks,
            (SELECT COUNT(*) FROM cards) as totalCards,
            (SELECT COUNT(*) FROM deck_cards) as totalDeckCards,
            (SELECT MAX(start_date) FROM tournaments) as latestTournament
        `)
        
        return {
          ...results[0],
          databasePath: './test.db',
        }
      },
    }),

    // Deck lookup
    deck: t.field({
      type: 'Deck',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (_, { id }) => {
        return queryDatabaseSingle<Deck>(
          'SELECT * FROM decks WHERE deck_id = ?',
          [id]
        )
      },
    }),

    // Deck meta details for Deck page
    deckDetails: t.field({
      type: 'DeckMetaData',
      nullable: true,
      args: {
        deckId: t.arg.string({ required: true })
      },
      resolve: async (_, { deckId }) => {
        const { sql, params } = queries.deckMeta(deckId!)
        const rows = await queryDatabase<any>(sql, params)
        return rows?.[0] || null
      }
    }),

    // Recent decks for home/decks page
    recentDeckBoxes: t.field({
      type: ['DeckBoxData'],
      args: {
        limit: t.arg.int({ defaultValue: 15 })
      },
      resolve: async (_, { limit }) => {
        const perTournament = 3
        const tournamentsLimit = Math.max(5, Math.ceil((limit ?? 15) / perTournament) + 2)
        const { sql, params } = queries.recentDeckBoxes(tournamentsLimit, limit ?? 15)
        return queryDatabase<any>(sql, params)
      }
    }),

    // Tournament deck boxes
    tournamentDeckBoxes: t.field({
      type: ['DeckBoxData'],
      args: { tournamentId: t.arg.string({ required: true }) },
      resolve: async (_, { tournamentId }) => {
        const { sql, params } = queries.tournamentDeckBoxes(tournamentId!)
        return queryDatabase<any>(sql, params)
      }
    }),

    combo: t.field({
      type: 'Combo',
      nullable: true,
      args: {
        id: t.arg.string({ required: true })
      },
      resolve: async (_, { id }) => {
        const client = getComboGraphClient()
        return client.getComboById(id)
      }
    }),

    comboDistance1: t.field({
      type: 'Distance1ComboResult',
      args: {
        comboId: t.arg.string({ required: true })
      },
      resolve: async (_, { comboId }) => {
        const client = getComboGraphClient()
        return client.getDistance1Combos(comboId)
      }
    }),

    combosByCard: t.field({
      type: 'ComboSearchResult',
      args: {
        cardName: t.arg.string({ required: true })
      },
      resolve: async (_, { cardName }) => {
        const client = getComboGraphClient()
        return client.searchCombosByCard(cardName)
      }
    }),

    comboPackages: t.field({
      type: ['ComboPackage'],
      args: {
        minSharedCards: t.arg.int({ defaultValue: 2 })
      },
      resolve: async (_, { minSharedCards }) => {
        const client = getComboGraphClient()
        return client.findComboPackages(minSharedCards ?? 2)
      }
    }),

    comboGraphStatistics: t.field({
      type: 'ComboGraphStats',
      resolve: async () => {
        const client = getComboGraphClient()
        return client.getGraphStatistics()
      }
    }),

    comboPackage: t.field({
      type: 'ComboPackage',
      args: {
        comboIds: t.arg.stringList({ required: true }),
        minSharedCards: t.arg.int({ defaultValue: 2 })
      },
      resolve: async (_, { comboIds, minSharedCards }) => {
        const client = getComboGraphClient()
        return client.getComboPackageById(comboIds, minSharedCards ?? 2)
      }
    })
  }),
})

// Parse deck colors string like "WURG" into ["W","U","R","G"]
function parseDeckColorsString(colors: string | null | undefined): string[] {
  if (!colors) return []
  const set = new Set<string>()
  for (const ch of String(colors).toUpperCase()) {
    if ('WUBRG'.includes(ch)) set.add(ch)
  }
  return Array.from(set)
}

// Commander cards from row with c1_/c2_ prefixes
function mapCommanderCards(row: any): any[] {
  const out: any[] = []
  if (row.c1_name) {
    out.push({
      card_name: row.c1_name,
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
    })
  }
  if (row.c2_name) {
    out.push({
      card_name: row.c2_name,
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
    })
  }
  return out
}

builder.objectType('DeckMetaData', {
  fields: (t) => ({
    deckId: t.string({ resolve: (p) => p.deckId }),
    tournamentId: t.string({ nullable: true, resolve: (p) => p.tournamentId }),
    tournamentName: t.string({ nullable: true, resolve: (p) => p.tournamentName || null }),
    totalPlayers: t.int({ nullable: true, resolve: (p) => p.totalPlayers ?? null }),
    topCut: t.int({ nullable: true, resolve: (p) => p.topCut ?? null }),
    playerName: t.string({ resolve: (p) => p.playerName || 'Unknown' }),
    wins: t.int({ resolve: (p) => Number(p.wins || 0) }),
    losses: t.int({ resolve: (p) => Number(p.losses || 0) }),
    draws: t.int({ resolve: (p) => Number(p.draws || 0) }),
    winRate: t.float({ resolve: (p) => Number(p.winRate || 0) }),
    standing: t.int({ nullable: true, resolve: (p) => p.standing ?? null }),
    lastSeen: t.string({ nullable: true, resolve: (p) => p.lastSeen || null }),
    commander1: t.field({ type: 'Card', nullable: true, resolve: (p) => mapCommanderCards(p)[0] || null }),
    commander2: t.field({ type: 'Card', nullable: true, resolve: (p) => mapCommanderCards(p)[1] || null }),
  })
})

// Build the schema after all object types are registered
export const schema = builder.toSchema()