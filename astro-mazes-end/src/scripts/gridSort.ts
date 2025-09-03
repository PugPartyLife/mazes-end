export type SortKey = 'score' | 'staple' | 'decks' | 'top8' | 'tournaments'

export function setupGridSort(selectId: string, gridSelector: string) {
  const sel = document.getElementById(selectId) as HTMLSelectElement | null
  const grid = document.querySelector(gridSelector) as HTMLElement | null
  if (!sel || !grid) return

  function getAttrNum(el: HTMLElement, name: string): number {
    const v = el.getAttribute(name)
    const n = v ? Number(v) : 0
    return Number.isFinite(n) ? n : 0
  }

  function sort(key: SortKey) {
    const items = Array.from(grid.children) as HTMLElement[]
    const mapKey: Record<SortKey, string> = {
      score: 'data-score',
      staple: 'data-staple',
      decks: 'data-decks',
      top8: 'data-top8',
      tournaments: 'data-tournaments'
    }
    const attr = mapKey[key]
    items.sort((a, b) => getAttrNum(b, attr) - getAttrNum(a, attr))
    for (const el of items) grid.appendChild(el)
  }

  sel.addEventListener('change', () => sort(sel.value as SortKey))
  // initial sort respected
  sort(sel.value as SortKey)
}

