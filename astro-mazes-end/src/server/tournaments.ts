import { queryDatabase } from '../lib/db/sqlite'
import type { DeckBoxProps } from '../components/DeckBox'
import { mapCardFromRow } from './cardRowToUi'

type Color = 'W' | 'U' | 'B' | 'R' | 'G'

function parseDeckColorsString(colors: string | null | undefined): Color[] {
  if (!colors) return []
  const out: Color[] = []
  for (const ch of colors.toUpperCase()) {
    if (ch === 'W' || ch === 'U' || ch === 'B' || ch === 'R' || ch === 'G') {
      if (!out.includes(ch)) out.push(ch)
    }
  }
  return out
}

export type TournamentSummary = {
  id: string
  name: string
  startDate: string | null
  totalPlayers: number | null
  topCut: number | null
  hasDecklists: number | null
}

type TournamentRow = {
  tournament_id: string
  tournament_name: string | null
  start_date: string | null
  total_players: number | null
  top_cut: number | null
  has_decklists: number | null
}

export async function loadTournaments(limit = 20, offset = 0): Promise<TournamentSummary[]> {
  const rows = await queryDatabase<TournamentRow>(
    `
      SELECT tournament_id, tournament_name, start_date, total_players, top_cut, has_decklists
      FROM tournaments
      ORDER BY COALESCE(start_date, created_at) DESC
      LIMIT ? OFFSET ?
    `,
    [limit, offset]
  )
  return rows.map(r => ({
    id: r.tournament_id,
    name: r.tournament_name || r.tournament_id,
    startDate: r.start_date,
    totalPlayers: r.total_players,
    topCut: r.top_cut,
    hasDecklists: r.has_decklists
  }))
}

type DeckRow = {
  deckId: string
  tournamentId: string | null
  tournamentName: string | null
  totalPlayers: number | null
  playerName: string | null
  wins: number | null
  losses: number | null
  draws: number | null
  winRate: number | null
  deckColors: string | null
  lastSeen: string | null
  standing: number | null
  topCut: number | null
  totalCards: number | null
  same_commander_count: number | null
  // commander 1
  c1_name: string | null
  c1_mana_cost: string | null
  c1_type_line: string | null
  c1_oracle_text: string | null
  c1_power: string | null
  c1_toughness: string | null
  c1_colors: string | null
  c1_color_identity: string | null
  c1_image_uris: string | null
  c1_layout: string | null
  c1_card_faces: string | null
  c1_artist: string | null
  c1_set_name: string | null
  // commander 2
  c2_name: string | null
  c2_mana_cost: string | null
  c2_type_line: string | null
  c2_oracle_text: string | null
  c2_power: string | null
  c2_toughness: string | null
  c2_colors: string | null
  c2_color_identity: string | null
  c2_image_uris: string | null
  c2_layout: string | null
  c2_card_faces: string | null
  c2_artist: string | null
  c2_set_name: string | null
}

export async function loadTournamentDeckBoxes(tournamentId: string): Promise<DeckBoxProps[]> {
  const rows = await queryDatabase<DeckRow>(
    `
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
    [tournamentId]
  )

  return rows.map((r) => {
    const colors = parseDeckColorsString(r.deckColors)
    const commanders: any[] = []
    if (r.c1_name) {
      commanders.push(
        mapCardFromRow(r, { prefix: 'c1_', nameField: 'c1_name' })
      )
    }
    if (r.c2_name) {
      commanders.push(
        mapCardFromRow(r, { prefix: 'c2_', nameField: 'c2_name' })
      )
    }

    const name = `(${r.c1_name || ''}${r.c2_name ? `/${r.c2_name}` : ''})`

    const deck: DeckBoxProps = {
      name,
      tournamentName: r.tournamentName || '',
      tournamentPlayers: r.totalPlayers ?? undefined,
      tournamentId: r.tournamentId || undefined,
      colors,
      player: r.playerName || 'Unknown',
      wins: Number(r.wins || 0),
      losses: Number(r.losses || 0),
      draws: Number(r.draws || 0),
      avgWinRate: Number(r.winRate || 0),
      top8Count: r.standing != null && r.standing <= 8 ? 1 : 0,
      deckCount: 1,
      sameCommanderCount: Math.max(0, Number(r.same_commander_count || 0)),
      standing: r.standing ?? undefined,
      lastSeen: r.lastSeen || '',
      cardCount: Number(r.totalCards || (98 + commanders.length)),
      commanders,
      deckUrl: '#',
      className: '',
      peekWidth: 260,
      peekHeight: 160,
      onOpenCard: () => {},
    }

    return deck
  })
}
