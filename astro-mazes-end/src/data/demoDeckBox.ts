// src/data/demoDeckBox.ts
import type { DeckBoxProps } from '../components/DeckBox';
import type { CommanderData } from '../lib/db/sqlite'; // ⟵ adjust path if needed
import { queryDatabase } from '../lib/db/sqlite';

type Color = 'W' | 'U' | 'B' | 'R' | 'G';

// --- DB fetch ---------------------------------------------------------------

/** Pull top N commander pairings from SQLite (shape based on your table). */
async function fetchCommanderPairings(limit = 15): Promise<CommanderData[]> {
  // If you have tournament metadata in another table, you can LEFT JOIN it here.
  // For now, use columns defined in your interface; missing columns will come back as null.
  const sql = `
    SELECT
      commander_1      AS commander1,
      commander_2      AS commander2,
      deck_count       AS deckCount,
      avg_win_rate     AS avgWinRate,
      0                AS top8Count,      -- placeholder (not in your basic schema)
      COALESCE(last_seen, '') AS lastSeen,
      NULL             AS tournamentName, -- fill if you add a join later
      NULL             AS player,         -- "
      NULL             AS deckUrl         -- "
    FROM commander_pairings
    ORDER BY deck_count DESC, avg_win_rate DESC, last_seen DESC
    LIMIT ?
  `;
  return queryDatabase<CommanderData>(sql, [limit]);
}

// --- Scryfall helpers -------------------------------------------------------

async function fetchScryfallCardByName(name: string) {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(
    name.trim()
  )}`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'mazes-end/astro' },
  });
  if (!res.ok) throw new Error(`Scryfall ${res.status} for "${name}"`);
  return res.json();
}

/** Limit concurrency a bit so we don’t hammer Scryfall. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = Array(items.length) as any;
  let i = 0;
  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        out[idx] = await fn(items[idx], idx);
      }
    });
  await Promise.all(workers);
  return out;
}

function deriveColorsFromCards(cards: any[]): Color[] {
  const s = new Set<Color>();
  for (const c of cards) {
    const ids: string[] = c?.color_identity || c?.colors || [];
    for (const k of ids) {
      if (k === 'W' || k === 'U' || k === 'B' || k === 'R' || k === 'G') s.add(k);
    }
  }
  return Array.from(s);
}

// --- Public API -------------------------------------------------------------

/**
 * Load top commander decks from SQLite + Scryfall and shape them for <DeckBox />.
 * This returns fully-formed DeckBoxProps[]: { name, tournamentName, colors, commanders, ... }.
 */
export async function loadTopDeckBoxes(limit = 15): Promise<DeckBoxProps[]> {
  const rows = await fetchCommanderPairings(limit);

  // de-dupe Scryfall calls per-name within this request
  const cache = new Map<string, Promise<any>>();
  const getCard = (name: string) => {
    const key = name.trim();
    if (!cache.has(key)) cache.set(key, fetchScryfallCardByName(key));
    return cache.get(key)!;
  };

  return mapPool(rows, 5, async (row) => {
    const c1 = await getCard(row.commander1);
    const c2 = row.commander2 ? await getCard(row.commander2) : null;
    const commanders = [c1, c2].filter(Boolean) as any[];

    const colors = deriveColorsFromCards(commanders);

    // If you have exact wins/losses in DB, use those.
    // Otherwise, derive a rough record from avgWinRate × deckCount.
    const games = Math.max(1, Number(row.deckCount) || 1);
    const wr = Math.max(0, Math.min(1, Number(row.avgWinRate) || 0));
    const wins = Math.round(wr * games);
    const losses = Math.max(0, games - wins);
    const draws = 0;

    const deck: DeckBoxProps = {
      // Per your current UI: deck name at the top, under the commander peeks
      name: `(${row.commander1}${row.commander2 ? `/${row.commander2}` : ''})`,
      tournamentName: row.tournamentName || undefined,
      colors,
      player: row.player || undefined,
      wins,
      losses,
      draws,
      standing: undefined, // not in schema; add later if needed
      cardCount: 98 + commanders.length,
      commanders,
      // If your DeckBox supports deckUrl for linking the name, pass it along:
      // @ts-ignore (only if DeckBoxProps includes deckUrl)
      deckUrl: row.deckUrl || undefined,
    };

    return deck;
  });
}
