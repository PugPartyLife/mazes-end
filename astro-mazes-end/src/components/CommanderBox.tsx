import React, { useState } from 'react'
import MtgCard from './MtgCard'
import CommanderPeek from './CommanderPeek'
import WinRateBar from './WinRateBar'
import type { DbUICard } from '../types'
import CommanderNamePills from './CommanderNamePills'
import CardModal from './CardModal'
import { stripParens } from '../lib/ui/text'
import { formatDateShort } from '../lib/ui/format'
import { normalizeWinratePercent } from '../lib/ui/winrate'

export type CommanderBoxProps = {
  name: string
  commanders: DbUICard[]
  colors?: ('W'|'U'|'B'|'R'|'G')[]
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

// gradient + color derivation handled by CommanderNamePills

const CommanderBox: React.FC<CommanderBoxProps> = ({
  name, commanders,
  totalDecks, tournamentsPlayed, avgWinRate, avgStanding,
  top8Finishes, top16Finishes, firstSeen, lastSeen, popularityScore,
  peekWidth = 260,
  peekHeight = 160
}) => {
  const wr = normalizeWinratePercent(avgWinRate)
  const [open, setOpen] = useState<DbUICard | null>(null)
  const MASK_RATIO = 0.78
  const SHADOW_PAD = 16
  const peekZone = Math.ceil(peekHeight * MASK_RATIO) + SHADOW_PAD
  const paddingTop = peekZone + 16
  return (
    <div
      className='relative w-full max-w-[26rem] rounded-3xl bg-neutral-900/92 ring-1 ring-neutral-800 shadow-[0_15px_40px_rgba(0,0,0,.55)] px-5 pb-5'
      style={{ paddingTop }}
      aria-label={stripParens(name)}
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
      {/* Commander name pills (each with its own colors/pips, truncated for layout) */}
      <div className='relative z-[1] mb-3'>
        <CommanderNamePills
          commanders={commanders.slice(0, 2)}
          onOpen={(c) => setOpen(c)}
        />
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
      <CardModal card={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function formatDate (s?: string): string | undefined { return formatDateShort(s) }

export default CommanderBox
