// Server-side data for Decks page: return DeckBoxProps[] directly from DB
import type { DeckBoxProps } from '../components/DeckBox'
import { queryDatabase } from '../lib/db/sqlite'

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

type Row = {
  deckId: string
  tournamentName: string | null
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

export async function loadTopDeckBoxes(limit = 15): Promise<DeckBoxProps[]> {
  const rows = await queryDatabase<Row>(
    `
      WITH ranked AS (
        SELECT d.deck_id AS deckId,
               d.player_name AS playerName,
               d.wins, d.losses, d.draws,
               d.win_rate AS winRate,
               d.deck_colors AS deckColors,
               d.standing, t.top_cut AS topCut,
               COALESCE(t.start_date, d.created_at) AS lastSeen,
               t.tournament_name AS tournamentName,
               (SELECT SUM(quantity) FROM deck_cards dc WHERE dc.deck_id = d.deck_id) AS totalCards,
               d.commander_1 AS c1_name,
               d.commander_2 AS c2_name
        FROM decks d
        LEFT JOIN tournaments t ON t.tournament_id = d.tournament_id
        WHERE d.has_decklist = 1 AND d.commander_1 IS NOT NULL AND TRIM(d.commander_1) <> ''
        ORDER BY d.win_rate DESC, COALESCE(t.start_date, d.created_at) DESC
        LIMIT ?
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
    `,
    [limit]
  )

  return rows.map((r) => {
    const colors = parseDeckColorsString(r.deckColors)
    const commanders: any[] = []
    if (r.c1_name) {
      commanders.push({
        object: 'card',
        name: r.c1_name,
        mana_cost: r.c1_mana_cost || undefined,
        type_line: r.c1_type_line || undefined,
        oracle_text: r.c1_oracle_text || undefined,
        power: r.c1_power || undefined,
        toughness: r.c1_toughness || undefined,
        colors: r.c1_colors ? JSON.parse(r.c1_colors) : undefined,
        color_identity: r.c1_color_identity ? JSON.parse(r.c1_color_identity) : undefined,
        image_uris: r.c1_image_uris ? JSON.parse(r.c1_image_uris) : undefined,
        layout: r.c1_layout || undefined,
        card_faces: r.c1_card_faces ? JSON.parse(r.c1_card_faces) : undefined,
        artist: r.c1_artist || undefined,
        set_name: r.c1_set_name || undefined,
      })
    }
    if (r.c2_name) {
      commanders.push({
        object: 'card',
        name: r.c2_name,
        mana_cost: r.c2_mana_cost || undefined,
        type_line: r.c2_type_line || undefined,
        oracle_text: r.c2_oracle_text || undefined,
        power: r.c2_power || undefined,
        toughness: r.c2_toughness || undefined,
        colors: r.c2_colors ? JSON.parse(r.c2_colors) : undefined,
        color_identity: r.c2_color_identity ? JSON.parse(r.c2_color_identity) : undefined,
        image_uris: r.c2_image_uris ? JSON.parse(r.c2_image_uris) : undefined,
        layout: r.c2_layout || undefined,
        card_faces: r.c2_card_faces ? JSON.parse(r.c2_card_faces) : undefined,
        artist: r.c2_artist || undefined,
        set_name: r.c2_set_name || undefined,
      })
    }

    const name = `(${r.c1_name || ''}${r.c2_name ? `/${r.c2_name}` : ''})`
    const top8 = r.standing != null && r.topCut != null && r.standing <= r.topCut ? 1 : 0

    const deck: DeckBoxProps = {
      name,
      tournamentName: r.tournamentName || '',
      colors,
      player: r.playerName || 'Unknown',
      wins: Number(r.wins || 0),
      losses: Number(r.losses || 0),
      draws: Number(r.draws || 0),
      avgWinRate: Number(r.winRate || 0),
      top8Count: top8,
      deckCount: 1,
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
