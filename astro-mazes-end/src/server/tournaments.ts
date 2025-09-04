import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
import type { DeckBoxProps } from '../components/DeckBox'
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

export type TournamentSummary = {
  id: string
  name: string
  startDate: string | null
  totalPlayers: number | null
  topCut: number | null
  hasDecklists: number | null
}

export async function loadTournaments(limit = 20, offset = 0): Promise<TournamentSummary[]> {
  // schema.tournaments supports limit but not offset; get extra and slice for now
  const query = `query($limit: Int!, $format: String!) {
    tournaments(limit: $limit, format: $format) {
      tournamentId
      tournamentName
      startDate
      totalPlayers
      topCut
      hasDecklists
    }
  }`
  
  const res = await graphql({ schema, source: query, variableValues: { limit: limit + offset, format: 'EDH' } })
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { tournaments: any[] }
  const rows = (data?.tournaments ?? []).slice(offset)
  
  return rows.map((r: any) => ({
    id: r.tournamentId,
    name: r.tournamentName || r.tournamentId,
    startDate: r.startDate,
    totalPlayers: r.totalPlayers,
    topCut: r.topCut,
    hasDecklists: r.hasDecklists
  }))
}

export async function loadTournamentById(tournamentId: string): Promise<TournamentSummary | null> {
  const query = `query($id: String!) {
    tournament(id: $id) {
      tournamentId
      tournamentName
      startDate
      totalPlayers
      topCut
      hasDecklists
    }
  }`
  
  const res = await graphql({ schema, source: query, variableValues: { id: tournamentId } })
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { tournament: any }
  const r = data?.tournament
  if (!r) return null
  
  return {
    id: r.tournamentId,
    name: r.tournamentName || r.tournamentId,
    startDate: r.startDate,
    totalPlayers: r.totalPlayers,
    topCut: r.topCut,
    hasDecklists: r.hasDecklists
  }
}

// Legacy DB row type removed; queries now resolved via GraphQL

export async function loadTournamentDeckBoxes(tournamentId: string): Promise<DeckBoxProps[]> {
  const query = `query($id: String!) {
    tournamentDeckBoxes(tournamentId: $id) {
      deckId
      tournamentId
      tournamentName
      tournamentPlayers
      player
      wins
      losses
      draws
      avgWinRate
      standing
      lastSeen
      cardCount
      sameCommanderCount
      colors
      top8Count
      commanders {
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
  
  const res2 = await graphql({ schema, source: query, variableValues: { id: tournamentId } })
  if (res2.errors?.length) throw res2.errors[0]
  
  const data2 = res2.data as { tournamentDeckBoxes: any[] }
  const rows = data2?.tournamentDeckBoxes ?? []
  
  return rows.map((r: any) => {
    const colors = Array.isArray(r.colors) ? r.colors : parseDeckColorsString(r.deckColors)
    const commanders = (r.commanders || []).map((c: any) => mapGraphQLCardToUi(c))
    const name = `(${commanders[0]?.name || ''}${commanders[1]?.name ? `/${commanders[1]?.name}` : ''})`

    const deck: DeckBoxProps = {
      name,
      tournamentName: r.tournamentName || '',
      tournamentPlayers: r.tournamentPlayers ?? undefined,
      tournamentId: r.tournamentId || undefined,
      colors,
      player: r.player || 'Unknown',
      wins: Number(r.wins || 0),
      losses: Number(r.losses || 0),
      draws: Number(r.draws || 0),
      avgWinRate: Number(r.avgWinRate || 0),
      top8Count: r.top8Count ?? (r.standing != null && r.standing <= 8 ? 1 : 0),
      deckCount: 1,
      sameCommanderCount: Math.max(0, Number(r.sameCommanderCount || 0)),
      standing: r.standing ?? undefined,
      lastSeen: r.lastSeen || '',
      cardCount: Number(r.cardCount || (98 + commanders.length)),
      commanders,
      deckUrl: `/decks/${r.deckId}`,
      className: '',
      peekWidth: 260,
      peekHeight: 160,
      onOpenCard: () => {},
    }

    return deck
  })
}
