import React from 'react'
import ManaText from './ManaText'
import type { DbUICard } from '../types'

type Color = 'W' | 'U' | 'B' | 'R' | 'G'

const COLOR_TINT: Record<Color | 'C', string> = {
  W: '#F8F6D8',
  U: '#C1D7E9',
  B: '#CAC5C0',
  R: '#E49977',
  G: '#A3C095',
  C: '#D1D5DB'
}

function headerGradient (colors?: Color[]) {
  const cols = (colors?.length ? colors : ['C']) as (Color | 'C')[]
  if (cols.length === 1) {
    const c = COLOR_TINT[cols[0]]
    return { backgroundImage: `linear-gradient(180deg, ${c}, ${c})` }
  }
  const step = 100 / (cols.length - 1)
  const parts = cols.map((c, i) => `${COLOR_TINT[c]} ${Math.round(i * step)}%`).join(', ')
  return { backgroundImage: `linear-gradient(90deg, ${parts})` }
}

function pipsText (colors?: Color[]) {
  if (!colors || colors.length === 0) return ''
  return colors.map(c => `{${c}}`).join('')
}

function cardColors (card?: DbUICard): Color[] {
  const set = new Set<Color>()
  const ids = (card?.color_identity || card?.colors || []) as string[]
  for (const k of ids) if ('WUBRG'.includes(k)) set.add(k as Color)
  return Array.from(set)
}

export default function CommanderNamePills ({
  commanders,
  className,
  pillClassName,
  max = 2,
  onOpen
}: {
  commanders: DbUICard[]
  className?: string
  pillClassName?: string
  max?: number
  onOpen?: (c: DbUICard) => void
}) {
  const safe = Array.isArray(commanders) ? commanders.slice(0, max) : []
  return (
    <div className={`flex items-stretch gap-2 ${className ?? ''}`}>
      {safe.map((c, i) => {
        const cols = cardColors(c)
        const style = headerGradient(cols)
        const pips = pipsText(cols)
        return (
          <div
            key={c?.name || i}
            className={`flex-1 rounded-xl border border-neutral-700/60 px-3 py-2 text-neutral-900 shadow-inner min-w-0 ${pillClassName ?? ''}`}
            style={style}
            title={c?.name}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={() => onOpen?.(c)}
            onKeyDown={e => {
              if (!onOpen) return
              if (e.key === 'Enter' || e.key === ' ') onOpen(c)
            }}
          >
            <div className='flex items-start justify-between gap-2'>
              <div
                className='min-w-0 font-semibold leading-snug text-sm sm:text-[15px] hover:opacity-90 hover:underline underline-offset-2'
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {c?.name}
              </div>
              {pips && (
                <div className='shrink-0 translate-y-0.5'>
                  <ManaText text={pips} size={16} gap={2} inline />
                </div>
              )}
            </div>
          </div>
        )
      })}
      {/* When only one commander, let it expand full width (no filler) */}
    </div>
  )
}
