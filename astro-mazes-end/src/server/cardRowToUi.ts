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

