import React, { useEffect, useState } from 'react'
import ManaText from './ManaText'
import type { ColorId } from '../types'

export default function PageHeader ({
  title,
  subtitle,
  onSearch,
  colors = ['W','U','B','R','G'],
  onToggleColor,
  surface = true,
  showReset = true
}: {
  title: string
  subtitle?: string
  onSearch?: (q: string) => void
  colors?: ColorId[]
  onToggleColor?: (c: ColorId) => void
  surface?: boolean
  showReset?: boolean
}) {
  const [q, setQ] = useState('')
  const [sub, setSub] = useState<string | undefined>(subtitle)
  const [selected, setSelected] = useState<Set<ColorId>>(new Set())

  // If no subtitle provided, derive from query (?name=...)
  useEffect(() => {
    if (!subtitle && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const n = params.get('name') || undefined
      setSub(n || undefined)
    }
  }, [subtitle])

  const toggle = (c: ColorId) => {
    const next = new Set(selected)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    setSelected(next)
    onToggleColor?.(c)
    // Dispatch a DOM event for pages that don't use the callback
    if (!onToggleColor && typeof window !== 'undefined') {
      const e = new CustomEvent('filter:colors', { detail: { colors: Array.from(next) } })
      window.dispatchEvent(e)
    }
  }

  const resetFilters = () => {
    setQ('')
    const empty = new Set<ColorId>()
    setSelected(empty)
    onSearch?.('')
    if (!onSearch && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filter:search', { detail: { q: '' } }))
    }
    if (!onToggleColor && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filter:colors', { detail: { colors: [] } }))
    }
  }
  return (
    <div className='mx-auto max-w-7xl mb-6 sm:mb-8'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='font-serif font-bold text-me-yellow text-3xl md:text-4xl leading-tight'>{title}</h1>
          {sub ? (
            <p className='mt-1 text-[13px] md:text-sm text-neutral-300'>{sub}</p>
          ) : null}
        </div>
        <div className='flex items-center gap-3 w-full sm:w-auto'>
          <div className={[surface ? 'rounded-2xl ring-1 ring-neutral-700/50 bg-neutral-900/60 px-3 py-2' : '', 'flex items-center gap-2'].join(' ')}>
            {colors.map(c => (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={`h-8 w-8 grid place-items-center rounded-full ring-1 ${selected.has(c) ? 'bg-neutral-700 ring-neutral-400' : 'bg-neutral-800 ring-neutral-700 hover:bg-neutral-700'}`}
                title={c}
                aria-pressed={selected.has(c)}
                aria-label={`Toggle color ${c}`}
              >
                <ManaText text={`{${c}}`} size={16} gap={0} inline />
              </button>
            ))}
          </div>
          <div className='relative grow sm:grow-0'>
            <input
              value={q}
              onChange={e => {
                const v = e.target.value
                setQ(v)
                onSearch?.(v)
                if (!onSearch && typeof window !== 'undefined') {
                  const ev = new CustomEvent('filter:search', { detail: { q: v } })
                  window.dispatchEvent(ev)
                }
              }}
              placeholder='Search decks...'
              className='w-full sm:w-72 rounded-lg bg-neutral-800 text-neutral-100 placeholder-neutral-400 px-3 py-2 ring-1 ring-neutral-700 focus:outline-none focus:ring-neutral-500'
            />
          </div>
          {showReset && (
            <button
              type='button'
              onClick={resetFilters}
              className='hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-200 ring-1 ring-neutral-600 hover:bg-neutral-800'
              title='Reset filters'
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
