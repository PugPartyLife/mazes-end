export type ManaFilterOptions = {
  gridSelector: string
  itemSelector: string
  textAttrs?: string[]
  colorsAttr?: string
  colorMode?: 'and' | 'or'
}

/** Attach reusable grid filtering driven by PageHeader events. */
export function setupManaFilter (opts: ManaFilterOptions): void {
  const {
    gridSelector,
    itemSelector,
    textAttrs = [],
    colorsAttr = 'data-colors',
    colorMode = 'and'
  } = opts

  const grid = document.querySelector<HTMLElement>(gridSelector)
  if (!grid) return

  // State shared per page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any
  w.__selectedColors = w.__selectedColors || []
  w.__searchTerm = w.__searchTerm || ''

  function matchesColors (el: Element, selected: Set<string>): boolean {
    if (selected.size === 0) return true
    const colorsRaw = el.getAttribute(colorsAttr) || ''
    const set = new Set(colorsRaw.split(''))
    const arr = Array.from(selected)
    return colorMode === 'and'
      ? arr.every(c => set.has(c))
      : arr.some(c => set.has(c))
  }

  function matchesSearch (el: Element, term: string): boolean {
    if (!term) return true
    const t = term.toLowerCase()
    for (const attr of textAttrs) {
      const v = (el.getAttribute(attr) || '').toLowerCase()
      if (v.includes(t)) return true
    }
    return false
  }

  function applyFilters (q?: string, colors?: string[]): void {
    const term = (q ?? w.__searchTerm ?? '').toLowerCase().trim()
    const selected = new Set<string>(colors ?? w.__selectedColors ?? [])
    grid.querySelectorAll(itemSelector).forEach(node => {
      const el = node as HTMLElement
      const ok = matchesSearch(el, term) && matchesColors(el, selected)
      el.style.display = ok ? '' : 'none'
    })
  }

  function onSearch (e: Event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (e as CustomEvent).detail as { q?: string } | undefined
    w.__searchTerm = detail?.q || ''
    applyFilters()
  }
  function onColors (e: Event) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (e as CustomEvent).detail as { colors?: string[] } | undefined
    w.__selectedColors = detail?.colors || []
    applyFilters()
  }

  window.addEventListener('filter:search', onSearch)
  window.addEventListener('filter:colors', onColors)

  // Initial render
  applyFilters()
}
