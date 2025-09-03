// Server-only card data helpers (now backed by GraphQL)
import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
import { mapGraphQLCardToUi } from './cardRowToUi'
import type { DbUICard } from '../types'

/**
 * Load top cards using a performance-weighted score from core tables.
 * Score blends: frequency + top finishes + standing + win rate.
 */
export async function loadCardsFromDb(limit = 12): Promise<DbUICard[]> {
  const query = `query($limit: Int!) {
    cardsWithStats(limit: $limit) {
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
          small normal large png artCrop borderCrop
          face0Small face0Normal face0Large face0Png face0ArtCrop face0BorderCrop
          face1Small face1Normal face1Large face1Png face1ArtCrop face1BorderCrop
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
  // @ts-ignore
  const data = res.data
  const rows = data?.cardsWithStats ?? []
  return rows.map((r: any) => mapGraphQLCardToUi(r.card))
}

export type CardWithStats = {
  card: DbUICard
  decksIncluded: number
  tournamentsSeen: number
  top8WithCard: number
  winsWithCard: number
  lossesWithCard: number
  drawsWithCard: number
  avgWinRateWithCard: number
  avgStandingWithCard: number
  inclusionRate: number
  score: number
}

/** Paginated cards with performance stats for richer UI. */
export async function loadCardsWithStats(limit = 24, offset = 0, q?: string): Promise<CardWithStats[]> {
  const query = `query($limit: Int!, $offset: Int!, $q: String) {
    cardsWithStats(limit: $limit, offset: $offset, q: $q) {
      decksIncluded
      tournamentsSeen
      top8WithCard
      winsWithCard
      lossesWithCard
      drawsWithCard
      avgWinRateWithCard
      avgStandingWithCard
      inclusionRate
      score
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
          small normal large png artCrop borderCrop
          face0Small face0Normal face0Large face0Png face0ArtCrop face0BorderCrop
          face1Small face1Normal face1Large face1Png face1ArtCrop face1BorderCrop
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
  const res = await graphql({ schema, source: query, variableValues: { limit, offset, q: q ?? null } })
  if (res.errors?.length) throw res.errors[0]
  // @ts-ignore
  const data = res.data
  const rows = data?.cardsWithStats ?? []
  return rows.map((r: any) => ({
    card: mapGraphQLCardToUi(r.card),
    decksIncluded: r.decksIncluded,
    tournamentsSeen: r.tournamentsSeen,
    top8WithCard: r.top8WithCard,
    winsWithCard: r.winsWithCard,
    lossesWithCard: r.lossesWithCard,
    drawsWithCard: r.drawsWithCard,
    avgWinRateWithCard: r.avgWinRateWithCard,
    avgStandingWithCard: r.avgStandingWithCard,
    inclusionRate: r.inclusionRate,
    score: r.score
  }))
}
