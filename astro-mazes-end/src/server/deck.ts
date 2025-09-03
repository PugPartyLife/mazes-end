import { queryDatabase } from '../lib/db/sqlite'
import { mapCardFromRow } from './cardRowToUi'
import type { DbUICard } from '../types'

export type DeckMeta = {
  deckId: string
  tournamentId?: string
  tournamentName?: string
  totalPlayers?: number
  playerName: string
  wins: number
  losses: number
  draws: number
  winRate: number
  standing?: number
  topCut?: number
  lastSeen?: string
  commander1?: DbUICard
  commander2?: DbUICard
}

export type DeckCardEntry = {
  card: DbUICard
  quantity: number
  deckSection: string
  primaryType: string
}

function primaryTypeFrom(typeLine?: string): string {
  const t = (typeLine || '').toLowerCase()
  if (t.includes('creature')) return 'Creature'
  if (t.includes('instant')) return 'Instant'
  if (t.includes('sorcery')) return 'Sorcery'
  if (t.includes('artifact')) return 'Artifact'
  if (t.includes('enchantment')) return 'Enchantment'
  if (t.includes('planeswalker')) return 'Planeswalker'
  if (t.includes('battle')) return 'Battle'
  if (t.includes('land')) return 'Land'
  return 'Other'
}

export async function loadDeckMeta(deckId: string): Promise<DeckMeta | null> {
  const rows = await queryDatabase<any>(
    `
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
    [deckId]
  )

  const r = rows?.[0]
  if (!r) return null

  const meta: DeckMeta = {
    deckId: r.deckId,
    tournamentId: r.tournamentId || undefined,
    tournamentName: r.tournamentName || undefined,
    totalPlayers: r.totalPlayers ?? undefined,
    playerName: r.playerName || 'Unknown',
    wins: Number(r.wins || 0),
    losses: Number(r.losses || 0),
    draws: Number(r.draws || 0),
    winRate: Number(r.winRate || 0),
    standing: r.standing ?? undefined,
    topCut: r.topCut ?? undefined,
    lastSeen: r.lastSeen || undefined,
  }

  if (r.c1_name) meta.commander1 = mapCardFromRow(r, { prefix: 'c1_', nameField: 'c1_name' })
  if (r.c2_name) meta.commander2 = mapCardFromRow(r, { prefix: 'c2_', nameField: 'c2_name' })
  return meta
}

export async function loadDeckCards(deckId: string): Promise<DeckCardEntry[]> {
  const rows = await queryDatabase<any>(
    `
      SELECT dc.deck_id, dc.card_name, dc.quantity, dc.deck_section,
             c.card_name AS c_card_name, c.mana_cost, c.type_line, c.oracle_text,
             c.power, c.toughness, c.colors, c.color_identity, c.image_uris,
             c.layout, c.card_faces, c.artist, c.set_name,
             c.card_power, c.versatility, c.popularity, c.salt, c.price, c.scryfall_uri
      FROM deck_cards dc
      LEFT JOIN cards c ON c.card_name = dc.card_name
      WHERE dc.deck_id = ?
      ORDER BY CASE WHEN dc.deck_section = 'Commander' THEN 0 ELSE 1 END, c.cmc, c.card_name
    `,
    [deckId]
  )

  return rows.map((r: any) => {
    // If the join didn't find a card row, fall back to deck_cards name
    const fallbackName = r.c_card_name || r.card_name
    const card = mapCardFromRow({ ...r, c_card_name: fallbackName }, { nameField: 'c_card_name' })
    const deckSection = String(r.deck_section || '').toLowerCase()
    const primaryType = primaryTypeFrom(card.type_line)
    return { card, quantity: Number(r.quantity || 1), deckSection, primaryType }
  })
}
