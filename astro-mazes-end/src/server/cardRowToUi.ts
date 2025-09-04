import { parseImageUris } from '../lib/db/sqlite'
import type { DbUICard } from '../types'

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function parseFaces(value: string | null | undefined): any[] | undefined {
  if (!value) return undefined
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr : undefined
  } catch {
    return undefined
  }
}

/**
 * Map a DB card row (optionally with a prefix like `c1_`) into a DbUICard.
 * Provide the `nameField` when the row uses a non-standard name column (e.g. commander_name).
 */
export function mapCardFromRow<Row extends Record<string, any>>(
  row: Row,
  opts?: { prefix?: string; nameField?: string }
): DbUICard {
  const prefix = opts?.prefix ?? ''
  const get = (k: string) => row[(prefix + k) as keyof Row] as any
  const nameKey = (opts?.nameField ?? 'card_name') as keyof Row
  const name = (row[nameKey] as any) ?? get('name') ?? ''

  const colors = parseJsonArray(get('colors'))
  const color_identity = parseJsonArray(get('color_identity'))
  const image_uris = parseImageUris(get('image_uris'))
  const card_faces = parseFaces(get('card_faces'))

  const toNum = (v: any): number | undefined => {
    const n = typeof v === 'string' ? Number(v) : v
    return typeof n === 'number' && isFinite(n) ? n : undefined
  }

  return {
    name,
    mana_cost: get('mana_cost') || undefined,
    type_line: get('type_line') || undefined,
    oracle_text: get('oracle_text') || undefined,
    flavor_text: get('flavor_text') || undefined,
    power: get('power') || undefined,
    toughness: get('toughness') || undefined,
    colors,
    color_identity,
    image_uris,
    layout: get('layout') || undefined,
    card_faces,
    artist: get('artist') || undefined,
    set_name: get('set_name') || undefined,
    card_power: toNum(get('card_power')),
    versatility: toNum(get('versatility')),
    popularity: toNum(get('popularity')),
    salt: toNum(get('salt')),
    price: toNum(get('price')),
    scryfall_uri: get('scryfall_uri') || undefined
  }
}

// Map GraphQL Card (camelCase fields) to DbUICard (Scryfall-like underscores)
export function mapGraphQLCardToUi(card: any): DbUICard {
  if (!card) return { name: '' }
  const img = card.imageUris || {}
  // Convert camelCase keys to snake_case for image_uris
  const image_uris = {
    small: img.small,
    normal: img.normal,
    large: img.large,
    png: img.png,
    art_crop: img.artCrop,
    border_crop: img.borderCrop,
    // face-specific fallbacks (flattened)
    face_0_small: img.face0Small,
    face_0_normal: img.face0Normal,
    face_0_large: img.face0Large,
    face_0_png: img.face0Png,
    face_0_art_crop: img.face0ArtCrop,
    face_0_border_crop: img.face0BorderCrop,
    face_1_small: img.face1Small,
    face_1_normal: img.face1Normal,
    face_1_large: img.face1Large,
    face_1_png: img.face1Png,
    face_1_art_crop: img.face1ArtCrop,
    face_1_border_crop: img.face1BorderCrop,
    // Pass through any face_* keys if they already exist
    ...Object.keys(img)
      .filter((k) => k.startsWith('face_'))
      .reduce((acc: any, k) => { acc[k] = img[k]; return acc }, {})
  }

  return {
    name: card.cardName || card.name || '',
    mana_cost: card.manaCost ?? undefined,
    type_line: card.typeLine ?? undefined,
    oracle_text: card.oracleText ?? undefined,
    flavor_text: card.flavorText ?? undefined,
    power: card.power ?? undefined,
    toughness: card.toughness ?? undefined,
    colors: Array.isArray(card.colors) ? card.colors : undefined,
    color_identity: Array.isArray(card.colorIdentity) ? card.colorIdentity : undefined,
    image_uris,
    layout: card.layout ?? undefined,
    card_faces: card.cardFaces ?? undefined,
    artist: card.artist ?? undefined,
    set_name: card.setName ?? card.set_code ?? undefined,
    card_power: card.cardPower ?? undefined,
    versatility: card.versatility ?? undefined,
    popularity: card.popularity ?? undefined,
    salt: card.salt ?? undefined,
    price: card.price ?? card.priceUsd ?? undefined,
    scryfall_uri: card.scryfallUri ?? undefined
  }
}
