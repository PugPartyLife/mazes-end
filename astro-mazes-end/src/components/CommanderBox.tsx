import React, { useMemo, useState, useRef } from 'react'
import ManaText from './ManaText'
import MtgCard from './MtgCard'
import CommanderPeek from './CommanderPeek'
import WinRateBar from './WinRateBar'
import type { DbUICard } from '../types'

type Color = 'W' | 'U' | 'B' | 'R' | 'G'

export type CommanderBoxProps = {
  name: string
  commanders: DbUICard[]
  colors: Color[]
  // top_commanders metrics
  totalDecks: number
  tournamentsPlayed: number
  avgWinRate: number
  avgStanding: number
  top8Finishes: number
  top16Finishes: number
  firstSeen: string
  lastSeen: string
  popularityScore: number
  peekWidth?: number
  peekHeight?: number
}

function pipsText (colors?: Color[]) {
  if (!colors || colors.length === 0) return ''
  return colors.map(c => `{${c}}`).join('')
}

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

const CommanderBox: React.FC<CommanderBoxProps> = ({
  name, commanders, colors,
  totalDecks, tournamentsPlayed, avgWinRate, avgStanding,
  top8Finishes, top16Finishes, firstSeen, lastSeen, popularityScore,
  peekWidth = 260,
  peekHeight = 160
}) => {
  const pips = pipsText(colors)
  const wr = Math.round((avgWinRate || 0) * (avgWinRate <= 1 ? 100 : 1))
  const [open, setOpen] = useState<DbUICard | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const MASK_RATIO = 0.78
  const SHADOW_PAD = 16
  const peekZone = Math.ceil(peekHeight * MASK_RATIO) + SHADOW_PAD
  const paddingTop = peekZone + 16
  const gradientStyle = useMemo(() => headerGradient(colors), [colors])
  return (
    <div
      className='relative w-full max-w-[26rem] rounded-3xl bg-neutral-900/92 ring-1 ring-neutral-800 shadow-[0_15px_40px_rgba(0,0,0,.55)] px-5 pb-5'
      style={{ paddingTop }}
    >
      {/* Commander peeks */}
      <div className='absolute inset-x-0 z-0 flex justify-center gap-4 items-start' style={{ top: 8, height: peekZone }}>
        {commanders.slice(0, 2).map((c, i) => (
          <CommanderPeek
            key={c?.name || i}
            card={c}
            width={peekWidth}
            height={peekHeight}
            tilt={i === 0 ? -2 : 2}
            maskRatio={MASK_RATIO}
            className={i === 1 ? 'translate-y-[6px]' : ''}
            onOpen={(card) => setOpen(card)}
          />
        ))}
      </div>
      {/* Name pill */}
      <div className='relative z-[1] rounded-xl border border-neutral-700/60 px-3 py-2 mb-3 text-neutral-900 shadow-inner' style={gradientStyle}>
        <div className='flex items-start justify-between gap-2'>
          <div
            title={name}
            className='min-w-0 font-semibold leading-snug text-sm sm:text-[15px]'
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {stripParens(name)}
          </div>
          {pips && (
            <div className='shrink-0 translate-y-0.5'>
              <ManaText text={pips} size={16} gap={2} inline />
            </div>
          )}
        </div>
      </div>
      {/* Stats grid */}
      <div className='relative z-[1] grid grid-cols-2 gap-4 text-neutral-200'>
        <WinRateBar percent={wr} className='col-span-2' />
        <div>
          <div className='text-[11px] uppercase tracking-wide text-neutral-400'>Avg standing</div>
          <div className='text-sm font-semibold'>{avgStanding?.toFixed(2) ?? '—'}</div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-neutral-400'>Top 8</div>
          <div className='text-sm font-semibold'>{top8Finishes ?? 0}</div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-neutral-400'>Top 16</div>
          <div className='text-sm font-semibold'>{top16Finishes ?? 0}</div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-neutral-400'>Decks</div>
          <div className='text-sm font-semibold'>{totalDecks ?? 0}</div>
        </div>
        <div>
          <div className='text-[11px] uppercase tracking-wide text-neutral-400'>Popularity</div>
          <div className='text-sm font-semibold'>{popularityScore?.toFixed(2) ?? '—'}</div>
        </div>
      </div>
      <div className='relative z-[1] mt-3 text-[11px] text-neutral-400'>
        <span>First: {formatDate(firstSeen) || '—'}</span>
        <span className='mx-2'>•</span>
        <span>Last: {formatDate(lastSeen) || '—'}</span>
      </div>
      {/* Modal */}
      {open && (
        <div className='fixed inset-0 z-[70]'>
          <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' onClick={() => setOpen(null)} aria-hidden='true' />
          <div className='absolute inset-0 grid place-items-center p-4'>
            <div role='dialog' aria-modal='true' aria-label={open?.name ?? 'Card'} className='relative w-full max-w-[min(92vw,32rem)]'>
              <button ref={closeBtnRef} onClick={() => setOpen(null)} className='absolute -top-10 right-0 text-neutral-200 hover:text-white text-sm cursor-pointer'>
                ✕ Close
              </button>
              <div className='rounded-2xl overflow-hidden'>
                <MtgCard card={open} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function stripParens (s: string): string {
  if (!s) return s
  return s.replace(/^\(\s*/, '').replace(/\s*\)$/, '')
}

function formatDate (s?: string): string | undefined {
  if (!s) return undefined
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default CommanderBox
