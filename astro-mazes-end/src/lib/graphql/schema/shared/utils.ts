// Utility functions shared across schema files

// Parse color string like "WUBRG" into array ["W", "U", "B", "R", "G"]
export function parseColors(colors: string | null | undefined): string[] {
  if (!colors) return []
  // Handle JSON array strings like '["W","U"]'
  if (colors.startsWith('[')) {
    try {
      return JSON.parse(colors)
    } catch {
      return []
    }
  }
  // Handle comma-separated strings like "W,U"
  if (colors.includes(',')) {
    return colors.split(',').map(c => c.trim()).filter(Boolean)
  }
  // Handle concatenated strings like "WU" or "WUBRG"
  return colors.split('').filter(c => 'WUBRG'.includes(c))
}

// Parse JSON image URIs
export function parseImageUris(imageUris: string | null | undefined): any {
  if (!imageUris) return null
  if (typeof imageUris === 'object') return imageUris
  try {
    return JSON.parse(imageUris)
  } catch {
    return null
  }
}

// Parse archetype tags (comma-separated or JSON array)
export function parseArchetypeTags(tags: string | null | undefined): string[] {
  if (!tags) return []
  // Handle JSON array
  if (tags.startsWith('[')) {
    try {
      return JSON.parse(tags)
    } catch {
      return []
    }
  }
  // Handle comma-separated
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

// Parse deck colors string like "WURG" into ["W","U","R","G"]
export function parseDeckColorsString(colors: string | null | undefined): string[] {
  if (!colors) return []
  const set = new Set<string>()
  for (const ch of String(colors).toUpperCase()) {
    if ('WUBRG'.includes(ch)) set.add(ch)
  }
  return Array.from(set)
}

// Commander cards from row with c1_/c2_ prefixes
export function mapCommanderCards(row: any): any[] {
  const out: any[] = []
  if (row.c1_name) {
    out.push({
      card_name: row.c1_name,
      mana_cost: row.c1_mana_cost,
      type_line: row.c1_type_line,
      oracle_text: row.c1_oracle_text,
      power: row.c1_power,
      toughness: row.c1_toughness,
      colors: row.c1_colors,
      color_identity: row.c1_color_identity,
      image_uris: row.c1_image_uris,
      layout: row.c1_layout,
      card_faces: row.c1_card_faces,
      artist: row.c1_artist,
      set_name: row.c1_set_name,
      card_power: row.c1_card_power,
      versatility: row.c1_versatility,
      popularity: row.c1_popularity,
      salt: row.c1_salt,
      price: row.c1_price,
      scryfall_uri: row.c1_scryfall_uri
    })
  }
  if (row.c2_name) {
    out.push({
      card_name: row.c2_name,
      mana_cost: row.c2_mana_cost,
      type_line: row.c2_type_line,
      oracle_text: row.c2_oracle_text,
      power: row.c2_power,
      toughness: row.c2_toughness,
      colors: row.c2_colors,
      color_identity: row.c2_color_identity,
      image_uris: row.c2_image_uris,
      layout: row.c2_layout,
      card_faces: row.c2_card_faces,
      artist: row.c2_artist,
      set_name: row.c2_set_name,
      card_power: row.c2_card_power,
      versatility: row.c2_versatility,
      popularity: row.c2_popularity,
      salt: row.c2_salt,
      price: row.c2_price,
      scryfall_uri: row.c2_scryfall_uri
    })
  }
  return out
}

// Helper to coerce image object
export function coerceImageObj(parent: any): any {
  if (!parent) return {}
  if (typeof parent === 'string') {
    try { return JSON.parse(parent) } catch { return {} }
  }
  return parent
}