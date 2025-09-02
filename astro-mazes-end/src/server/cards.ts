// Server-only card data helpers
import { queryDatabase, parseImageUris } from '../lib/db/sqlite'

type DbCardRow = {
  card_name: string
  mana_cost: string | null
  type_line: string | null
  oracle_text: string | null
  power: string | null
  toughness: string | null
  colors: string | null // JSON
  color_identity: string | null // JSON
  image_uris: string | null // JSON
  layout: string | null
  card_faces: string | null // JSON
  artist: string | null
  set_name: string | null
  card_power: number | null
  versatility: number | null
  popularity: number | null
  salt: number | null
  price: number | null
  scryfall_uri: string | null
}

function parseJsonArray(value: string | null): string[] {
  try {
    const arr = value ? JSON.parse(value) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** Load top EDH cards from DB and shape as Scryfall-like objects for MtgCard. */
export async function loadCardsFromDb(limit = 12): Promise<any[]> {
  let rows = await queryDatabase<DbCardRow>(
    `
      WITH ranked AS (
        SELECT dc.card_name, COUNT(DISTINCT dc.deck_id) AS decks_included
        FROM deck_cards dc
        JOIN decks d ON d.deck_id = dc.deck_id
        WHERE d.has_decklist = 1 AND dc.deck_section != 'commander'
        GROUP BY dc.card_name
        ORDER BY decks_included DESC
        LIMIT ?
      )
      SELECT c.card_name, c.mana_cost, c.type_line, c.oracle_text, c.power, c.toughness,
             c.colors, c.color_identity, c.image_uris, c.layout, c.card_faces,
             c.artist, c.set_name,
             c.card_power, c.versatility, c.popularity, c.salt, c.price,
             c.scryfall_uri
      FROM ranked r
      JOIN cards c ON c.card_name = r.card_name
      ORDER BY r.decks_included DESC
    `,
    [limit]
  )

  if (rows.length === 0) {
    rows = await queryDatabase<DbCardRow>(
      `SELECT card_name, mana_cost, type_line, oracle_text, power, toughness,
              colors, color_identity, image_uris, layout, card_faces,
              artist, set_name,
              card_power, versatility, popularity, salt, price,
              scryfall_uri
       FROM cards WHERE image_uris IS NOT NULL ORDER BY COALESCE(price_usd, 0) DESC LIMIT ?`,
      [limit]
    )
  }
  return rows.map((r) => {
    const colors = parseJsonArray(r.colors)
    const color_identity = parseJsonArray(r.color_identity)
    const image_uris = parseImageUris(r.image_uris)
    let card_faces: any[] | undefined
    try {
      card_faces = r.card_faces ? JSON.parse(r.card_faces) : undefined
    } catch {
      card_faces = undefined
    }
    return {
      object: 'card',
      name: r.card_name,
      mana_cost: r.mana_cost || undefined,
      type_line: r.type_line || undefined,
      oracle_text: r.oracle_text || undefined,
      power: r.power || undefined,
      toughness: r.toughness || undefined,
      colors,
      color_identity,
      image_uris,
      layout: r.layout || undefined,
      card_faces,
      artist: r.artist || undefined,
      set_name: r.set_name || undefined,
      // CardStats-related fields from DB
      card_power: r.card_power ?? undefined,
      versatility: r.versatility ?? undefined,
      popularity: r.popularity ?? undefined,
      salt: r.salt ?? undefined,
      price: r.price ?? undefined,
      scryfall_uri: r.scryfall_uri || undefined
    }
  })
}
