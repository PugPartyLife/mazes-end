import { queryDatabase } from '../lib/db/sqlite'
import type { DbUICard } from '../types'

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
  commander_name: string
  partner_name: string | null
  total_decks: number
  tournaments_played: number
  avg_win_rate: number
  avg_standing: number
  top_8_finishes: number
  top_16_finishes: number
  first_seen: string
  last_seen: string
  popularity_score: number
  // card joins
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
  c1_flavor_text: string | null
  c1_artist: string | null
  c1_set_name: string | null
  c1_card_power: number | null
  c1_versatility: number | null
  c1_popularity: number | null
  c1_salt: number | null
  c1_price: number | null
  c1_scryfall_uri: string | null

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
  c2_flavor_text: string | null
  c2_artist: string | null
  c2_set_name: string | null
  c2_card_power: number | null
  c2_versatility: number | null
  c2_popularity: number | null
  c2_salt: number | null
  c2_price: number | null
  c2_scryfall_uri: string | null
}

export async function loadTopCommanders(limit = 20) {
  const rows = await queryDatabase<Row>(
    `
      SELECT tc.*, 
             -- Commander 1 card fields
             c1.mana_cost AS c1_mana_cost,
             c1.type_line AS c1_type_line,
             c1.oracle_text AS c1_oracle_text,
             c1.power AS c1_power,
             c1.toughness AS c1_toughness,
             c1.colors AS c1_colors,
             c1.color_identity AS c1_color_identity,
             c1.image_uris AS c1_image_uris,
             c1.layout AS c1_layout,
             c1.card_faces AS c1_card_faces,
             c1.flavor_text AS c1_flavor_text,
             c1.artist AS c1_artist,
             c1.set_name AS c1_set_name,
             c1.card_power AS c1_card_power,
             c1.versatility AS c1_versatility,
             c1.popularity AS c1_popularity,
             c1.salt AS c1_salt,
             c1.price AS c1_price,
             c1.scryfall_uri AS c1_scryfall_uri,
             -- Commander 2 card fields
             c2.mana_cost AS c2_mana_cost,
             c2.type_line AS c2_type_line,
             c2.oracle_text AS c2_oracle_text,
             c2.power AS c2_power,
             c2.toughness AS c2_toughness,
             c2.colors AS c2_colors,
             c2.color_identity AS c2_color_identity,
             c2.image_uris AS c2_image_uris,
             c2.layout AS c2_layout,
             c2.card_faces AS c2_card_faces,
             c2.flavor_text AS c2_flavor_text,
             c2.artist AS c2_artist,
             c2.set_name AS c2_set_name,
             c2.card_power AS c2_card_power,
             c2.versatility AS c2_versatility,
             c2.popularity AS c2_popularity,
             c2.salt AS c2_salt,
             c2.price AS c2_price,
             c2.scryfall_uri AS c2_scryfall_uri
      FROM top_commanders tc
      LEFT JOIN cards c1 ON c1.card_name = tc.commander_name
      LEFT JOIN cards c2 ON c2.card_name = tc.partner_name
      ORDER BY tc.top_8_finishes DESC
      LIMIT ?
    `,
    [limit]
  )

  return rows.map(r => {
    const commanders: DbUICard[] = []
    if (r.commander_name) {
      commanders.push({
        name: r.commander_name,
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
        flavor_text: r.c1_flavor_text || undefined,
        artist: r.c1_artist || undefined,
        set_name: r.c1_set_name || undefined,
        card_power: r.c1_card_power ?? undefined,
        versatility: r.c1_versatility ?? undefined,
        popularity: r.c1_popularity ?? undefined,
        salt: r.c1_salt ?? undefined,
        price: r.c1_price ?? undefined,
        scryfall_uri: r.c1_scryfall_uri || undefined,
      })
    }
    if (r.partner_name) {
      commanders.push({
        name: r.partner_name,
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
        flavor_text: r.c2_flavor_text || undefined,
        artist: r.c2_artist || undefined,
        set_name: r.c2_set_name || undefined,
        card_power: r.c2_card_power ?? undefined,
        versatility: r.c2_versatility ?? undefined,
        popularity: r.c2_popularity ?? undefined,
        salt: r.c2_salt ?? undefined,
        price: r.c2_price ?? undefined,
        scryfall_uri: r.c2_scryfall_uri || undefined,
      })
    }

    const colors: Color[] = []
    if (commanders.length) {
      const set = new Set<Color>()
      for (const c of commanders) {
        const ids = (c.color_identity || c.colors || []) as string[]
        for (const k of ids) if ('WUBRG'.includes(k)) set.add(k as Color)
      }
      colors.push(...Array.from(set))
    }

    return {
      name: `(${r.commander_name}${r.partner_name ? `/${r.partner_name}` : ''})`,
      commanders,
      colors,
      totalDecks: r.total_decks,
      tournamentsPlayed: r.tournaments_played,
      avgWinRate: r.avg_win_rate,
      avgStanding: r.avg_standing,
      top8Finishes: r.top_8_finishes,
      top16Finishes: r.top_16_finishes,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      popularityScore: r.popularity_score,
    }
  })
}
