import { graphql } from 'graphql'
import { schema } from '../lib/graphql/schema'
import type { DbUICard } from '../types'
import { mapGraphQLCardToUi } from './cardRowToUi'

type Color = 'W' | 'U' | 'B' | 'R' | 'G'
type ColorId = 'W' | 'U' | 'B' | 'R' | 'G'

export interface SurveyCommander {
  name: string
  archetype: string
  description: string
  colors: ColorId[]
  deckCount: number
  card: DbUICard
  partnerCard?: DbUICard
  avgWinRate: number
  top8Finishes: number
  popularityScore: number
}

/**
 * Load commanders filtered by color identity for the survey
 * @param colors Array of color identities (e.g., ['W', 'U'] for Azorius)
 * @param powerLevel 'casual' | 'focused' | 'high_power' | 'cedh'
 * @param limit Number of commanders to return
 */
export async function loadCommandersForSurvey(
  colors: ColorId[], 
  powerLevel: 'casual' | 'focused' | 'high_power' | 'cedh' = 'casual',
  limit = 12
): Promise<SurveyCommander[]> {
  // Convert colors array to string for GraphQL query
  const colorString = colors.sort().join('')
  
  // Determine minimum deck threshold based on power level
  const minDecks = powerLevel === 'cedh' ? 50 : powerLevel === 'high_power' ? 25 : 10
  const minWinRate = powerLevel === 'cedh' ? 0.45 : powerLevel === 'high_power' ? 0.40 : 0.35

  const query = `query($limit: Int!, $colorString: String!, $minDecks: Int!, $minWinRate: Float!) {
    commandersByColors(
      limit: $limit, 
      colorString: $colorString, 
      minDecks: $minDecks,
      minWinRate: $minWinRate
    ) {
      commanderName
      partnerName
      totalDecks
      tournamentsPlayed
      avgWinRate
      avgStanding
      top8Finishes
      top16Finishes
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

  const res = await graphql({ 
    schema, 
    source: query, 
    variableValues: { 
      limit, 
      colorString, 
      minDecks,
      minWinRate
    } 
  })
  
  if (res.errors?.length) throw res.errors[0]
  
  const data = res.data as { commandersByColors: any[] }
  const rows = data?.commandersByColors ?? []
  
  return rows.map((r: any) => {
    const commanderCard = r.commanderCard ? mapGraphQLCardToUi(r.commanderCard) : null
    const partnerCard = r.partnerCard ? mapGraphQLCardToUi(r.partnerCard) : undefined
    
    if (!commanderCard) {
      throw new Error(`Missing commander card data for ${r.commanderName}`)
    }

    // Determine archetype based on card properties and stats
    const archetype = determineArchetype(commanderCard, r.avgWinRate, r.popularityScore)
    
    // Generate description based on card text and performance
    const description = generateDescription(commanderCard, partnerCard, r)

    // Get color identity from the cards
    const commanderColors = (commanderCard.color_identity || commanderCard.colors || []) as ColorId[]
    const partnerColors = partnerCard ? (partnerCard.color_identity || partnerCard.colors || []) as ColorId[] : []
    const allColors = [...new Set([...commanderColors, ...partnerColors])] as ColorId[]

    return {
      name: r.partnerName ? `${r.commanderName} / ${r.partnerName}` : r.commanderName,
      archetype,
      description,
      colors: allColors,
      deckCount: r.totalDecks,
      card: commanderCard,
      partnerCard: partnerCard || undefined,
      avgWinRate: r.avgWinRate,
      top8Finishes: r.top8Finishes,
      popularityScore: r.popularityScore
    }
  })
}

/**
 * Fallback function that uses the existing data structure
 * for when the GraphQL query isn't available yet
 */
export async function loadCommandersForSurveyFallback(
  colors: ColorId[], 
  powerLevel: 'casual' | 'focused' | 'high_power' | 'cedh' = 'casual',
  limit = 12
): Promise<SurveyCommander[]> {
  // Load all top commanders and filter client-side
  const { loadTopCommanders } = await import('./commanders')
  const allCommanders = await loadTopCommanders(100) // Get more to filter from
  
  const colorString = colors.sort().join('')
  
  const filtered = allCommanders.filter(commander => {
    const commanderColorString = commander.colors.sort().join('')
    
    // Exact match for color identity
    if (colors.length === 0) return commanderColorString === ''
    if (colorString === commanderColorString) return true
    
    // For survey purposes, also include commanders that are subset of selected colors
    return commander.colors.every(color => colors.includes(color as ColorId))
  })

  // Sort by relevance (deck count * win rate)
  const sorted = filtered
    .sort((a, b) => (b.totalDecks * b.avgWinRate) - (a.totalDecks * a.avgWinRate))
    .slice(0, limit)

  return sorted.map(commander => ({
    name: commander.name,
    archetype: determineArchetype(commander.commanders[0], commander.avgWinRate, commander.popularityScore),
    description: generateDescription(commander.commanders[0], commander.commanders[1], commander),
    colors: commander.colors as ColorId[],
    deckCount: commander.totalDecks,
    card: commander.commanders[0],
    partnerCard: commander.commanders[1],
    avgWinRate: commander.avgWinRate,
    top8Finishes: commander.top8Finishes,
    popularityScore: commander.popularityScore
  }))
}

/**
 * Determine archetype based on card properties and performance
 */
function determineArchetype(card: DbUICard, winRate: number, popularity: number): string {
  const text = (card.oracle_text || '').toLowerCase()
  const typeLine = (card.type_line || '').toLowerCase()
  
  // Check for specific archetypes based on card text
  if (text.includes('draw') && text.includes('card')) return 'Card Draw'
  if (text.includes('combo') || text.includes('infinite')) return 'Combo'
  if (text.includes('counter') && text.includes('spell')) return 'Control'
  if (text.includes('attack') || text.includes('combat')) return 'Aggro'
  if (text.includes('ramp') || text.includes('mana')) return 'Ramp'
  if (text.includes('graveyard') || text.includes('cemetery')) return 'Graveyard'
  if (text.includes('artifact')) return 'Artifacts'
  if (text.includes('token')) return 'Tokens'
  if (text.includes('tribal') || typeLine.includes('tribal')) return 'Tribal'
  if (text.includes('storm')) return 'Storm'
  if (text.includes('sacrifice')) return 'Sacrifice'
  if (text.includes('exile')) return 'Exile'
  
  // Fallback based on performance
  if (winRate > 0.55) return 'High Power'
  if (popularity > 80) return 'Popular'
  if (winRate > 0.45) return 'Competitive'
  
  return 'Value Engine'
}

/**
 * Generate description based on card and performance data
 */
function generateDescription(
  card: DbUICard, 
  partnerCard: DbUICard | undefined, 
  stats: any
): string {
  const winRatePercent = Math.round(stats.avgWinRate * 100)
  const isHighPerformance = stats.avgWinRate > 0.50
  const isPopular = stats.totalDecks > 100
  
  let baseDescription = ''
  
  if (partnerCard) {
    baseDescription = `Partner commanders offering flexible strategies and color access.`
  } else {
    const text = (card.oracle_text || '').toLowerCase()
    if (text.includes('draw')) {
      baseDescription = 'Provides card advantage and resource generation.'
    } else if (text.includes('combo')) {
      baseDescription = 'Enables powerful combo strategies and synergies.'
    } else if (text.includes('counter')) {
      baseDescription = 'Offers control elements and reactive gameplay.'
    } else if (text.includes('attack') || text.includes('combat')) {
      baseDescription = 'Focuses on aggressive strategies and combat optimization.'
    } else {
      baseDescription = 'Versatile commander with multiple strategic options.'
    }
  }
  
  // Add performance context
  if (isHighPerformance && isPopular) {
    return `${baseDescription} High-performing and widely adopted choice.`
  } else if (isHighPerformance) {
    return `${baseDescription} Strong competitive option with ${winRatePercent}% win rate.`
  } else if (isPopular) {
    return `${baseDescription} Popular choice with proven consistency.`
  } else {
    return `${baseDescription} Solid option for focused gameplay.`
  }
}