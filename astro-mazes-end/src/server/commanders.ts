import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
import type { DbUICard } from '../types'
import { mapGraphQLCardToUi } from './cardRowToUi'

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
  const query = `query($limit: Int!) {
    topCommanders(limit: $limit) {
      commanderName
      partnerName
      totalDecks
      tournamentsPlayed
      avgWinRate
      avgStanding
      top8Finishes
      top16Finishes
      firstSeen
      lastSeen
      popularityScore
      commanderCard {
        cardName
        manaCost
        typeLine
        oracleText
        power
        toughness
        cardFaces
        colors
        colorIdentity
        imageUris {
          small
          normal
          large
          png
          artCrop
          borderCrop
          face0Small
          face0Normal
          face0Large
          face0Png
          face0ArtCrop
          face0BorderCrop
          face1Small
          face1Normal
          face1Large
          face1Png
          face1ArtCrop
          face1BorderCrop
        }
        layout
        artist
        setName
        cardPower
        versatility
        popularity
        salt
        price
        scryfallUri
      }
      partnerCard {
        cardName
        manaCost
        typeLine
        oracleText
        power
        toughness
        cardFaces
        colors
        colorIdentity
        imageUris {
          small
          normal
          large
          png
          artCrop
          borderCrop
          face0Small
          face0Normal
          face0Large
          face0Png
          face0ArtCrop
          face0BorderCrop
          face1Small
          face1Normal
          face1Large
          face1Png
          face1ArtCrop
          face1BorderCrop
        }
        layout
        artist
        setName
        cardPower
        versatility
        popularity
        salt
        price
        scryfallUri
      }
    }
  }`

  const res = await graphql({ schema, source: query, variableValues: { limit } })
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { topCommanders: any[] }
  const rows = data?.topCommanders ?? []
  
  return rows.map((r: any) => {
    const commanders: DbUICard[] = []
    if (r.commanderCard) commanders.push(mapGraphQLCardToUi(r.commanderCard))
    if (r.partnerCard) commanders.push(mapGraphQLCardToUi(r.partnerCard))

    const set = new Set<Color>()
    for (const c of commanders) {
      const ids = (c.color_identity || c.colors || []) as string[]
      for (const k of ids) if ('WUBRG'.includes(k)) set.add(k as Color)
    }
    const colors: Color[] = Array.from(set) as Color[]

    return {
      name: `(${r.commanderName}${r.partnerName ? `/${r.partnerName}` : ''})`,
      commanders,
      colors,
      totalDecks: r.totalDecks,
      tournamentsPlayed: r.tournamentsPlayed,
      avgWinRate: r.avgWinRate,
      avgStanding: r.avgStanding,
      top8Finishes: r.top8Finishes,
      top16Finishes: r.top16Finishes,
      firstSeen: r.firstSeen,
      lastSeen: r.lastSeen,
      popularityScore: r.popularityScore,
    }
  })
}
