// Server-side data for Decks page: now pulls via GraphQL
import type { DeckBoxProps } from '../components/DeckBox'
import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
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

type Row = any

export async function loadTopDeckBoxes(limit = 15): Promise<DeckBoxProps[]> {
  const query = `query($limit: Int!) {
    recentDeckBoxes(limit: $limit) {
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
        cardName manaCost typeLine oracleText power toughness cardFaces
        colors colorIdentity
        imageUris {
          small normal large png artCrop borderCrop
          face0Small face0Normal face0Large face0Png face0ArtCrop face0BorderCrop
          face1Small face1Normal face1Large face1Png face1ArtCrop face1BorderCrop
        }
        layout artist setName cardPower versatility popularity salt price scryfallUri
      }
    }
  }`

  const res = await graphql({ schema, source: query, variableValues: { limit } })
  if (res.errors?.length) throw res.errors[0]
  // @ts-ignore
  const data = res.data
  const rows: Row[] = data?.recentDeckBoxes ?? []

  return rows.map((r: any) => {
    const colors = Array.isArray(r.colors) ? r.colors : parseDeckColorsString(r.deckColors)
    const commanders = (r.commanders || []).map((c: any) => mapGraphQLCardToUi(c))

    const name = `(${commanders[0]?.name || ''}${commanders[1]?.name ? `/${commanders[1]?.name}` : ''})`
    // A true Top 8 means final standing is 8 or better, regardless of event's top_cut size
    const top8 = r.top8Count ?? (r.standing != null && r.standing <= 8 ? 1 : 0)

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
        top8Count: top8,
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
