import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
import { mapGraphQLCardToUi } from './cardRowToUi'
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
  const query = `query($id: String!) {
    deckDetails(deckId: $id) {
      deckId
      tournamentId
      tournamentName
      totalPlayers
      topCut
      playerName
      wins
      losses
      draws
      winRate
      standing
      lastSeen
      commander1 {
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
      commander2 {
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
  
  const res = await graphql({ schema, source: query, variableValues: { id: deckId } })
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { deckDetails: any }
  const r = data?.deckDetails
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
  if (r.commander1) meta.commander1 = mapGraphQLCardToUi(r.commander1)
  if (r.commander2) meta.commander2 = mapGraphQLCardToUi(r.commander2)
  return meta
}

export async function loadDeckCards(deckId: string): Promise<DeckCardEntry[]> {
  const query = `query($id: String!) {
    deck(id: $id) {
      cards {
        quantity
        deckSection
        card {
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
    }
  }`
  
  const res = await graphql({ schema, source: query, variableValues: { id: deckId } })
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { deck: { cards: any[] } | null }
  const rows = data?.deck?.cards ?? []
  
  return rows.map((r: any) => {
    const card = mapGraphQLCardToUi(r.card)
    const deckSection = String(r.deckSection || '').toLowerCase()
    const primaryType = primaryTypeFrom(card.type_line)
    return { card, quantity: Number(r.quantity || 1), deckSection, primaryType }
  })
}
