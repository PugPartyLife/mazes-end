import React, { useState, useCallback } from 'react'
import MtgCard from './MtgCard'
import type { DbUICard } from '../types'
import WinRateBar from './WinRateBar'
import CommanderNamePills from './CommanderNamePills'
import CommanderPeek from './CommanderPeek'
import CardModal from './CardModal'
import { stripParens } from '../lib/ui/text'
import { normalizeWinratePercent } from '../lib/ui/winrate'

type Color = 'W' | 'U' | 'B' | 'R' | 'G'

export type DeckBoxProps = {
  name: string // deck name (linked + gradient)
  tournamentName: string // neutral pill (empty string to hide)
  commanders: DbUICard[] // 1–2 cards from our DB shape
  colors: Color[] // explicit colors (derive if empty)
  player: string

  // DB-driven stats
  wins: number
  losses: number
  draws: number
  avgWinRate: number // 0–1 or 0–100, normalized below
  top8Count: number
  deckCount: number
  lastSeen: string

  cardCount: number
  deckUrl: string

  className: string
  peekWidth: number
  peekHeight: number
  onOpenCard: (card: DbUICard) => void
}

// color helpers and pips handled by CommanderNamePills

// gradient + color derivation handled by CommanderNamePills

// Use shared CommanderPeek component

const DeckBox: React.FC<DeckBoxProps> = ({
  name,
  tournamentName,
  commanders,
  colors,
  player,
  wins = 0,
  losses = 0,
  draws = 0,
  avgWinRate,
  top8Count,
  deckCount,
  lastSeen,
  cardCount = 99,
  deckUrl = 'https://topdeck.gg/deck/yXwMlmGU74ISJ9x5OdlP/cQ30wpoy0eSg7t80b79fgn07Wz62', // example
  className,
  onOpenCard,
  peekWidth = 260,
  peekHeight = 160
}) => {
  const [open, setOpen] = useState<DbUICard | null>(null)

  const safeCommanders = Array.isArray(commanders) ? commanders.slice(0, 2) : []

  // Normalize winrate (prefer DB avg, fallback to record)
  const winrate = normalizeWinratePercent(avgWinRate, wins, losses, draws)

  // Reserve enough vertical space for the visible slice, plus tilt/shadow padding
  const MASK_RATIO = 0.78 // must match CommanderPeek default
  const SHADOW_PAD = 16 // extra space for tilt & shadow
  const peekZone = Math.ceil(peekHeight * MASK_RATIO) + SHADOW_PAD
  const paddingTop = peekZone + 16 // header breathing room

  const handleOpen = useCallback(
    (c: DbUICard) => {
      setOpen(c)
      onOpenCard?.(c)
    },
    [onOpenCard]
  )

  // Modal handles ESC & focus

  return (
    <>
      {/* Keep grid space when modal open, but hide visually */}
      <div
        className={[
          'relative w-full max-w-[25rem] sm:max-w-[26rem]',
          'rounded-3xl overflow-visible',
          'bg-neutral-900/92 backdrop-blur',
          'shadow-[0_15px_40px_rgba(0,0,0,.55)] ring-1 ring-neutral-800',
          'px-4 sm:px-5 pb-4 sm:pb-5',
          open ? 'invisible' : '',
          className ?? ''
        ].join(' ')}
        style={{ paddingTop }}
        aria-hidden={!!open}
      >
        {/* Commander peeks (inside reserved zone, lower z-index) */}
        <div
          className='absolute inset-x-0 z-0 flex justify-center gap-4 items-start'
          style={{ top: 8, height: peekZone }}
        >
          {safeCommanders.length ? (
            safeCommanders.map((c, i) => (
              <CommanderPeek
                key={c?.id ?? i}
                card={c}
                width={peekWidth}
                height={peekHeight}
                tilt={i === 0 ? -2 : 2}
                onOpen={handleOpen}
                maskRatio={MASK_RATIO}
                className={i === 1 ? 'translate-y-[6px]' : ''}
              />
            ))
          ) : (
            <div className='text-sm text-neutral-400'>No commander data</div>
          )}
        </div>

        {/* CONTENT (higher z-index so it always sits above the peeks) */}
        <div className='relative z-[1]'>
          {/* Commander name pills (one per commander, truncated for layout) */}
          <div className='mb-3'>
            <CommanderNamePills commanders={safeCommanders} onOpen={handleOpen} />
          </div>

          {/* Deck name link (small, neutral) */}
          <div className='mb-4'>
            <a
              href={deckUrl}
              target='_blank'
              rel='noopener noreferrer'
              title={name}
              className='text-[13px] sm:text-[14px] font-medium text-neutral-100 hover:opacity-90 hover:underline underline-offset-2'
            >
              {stripParens(name)}
            </a>
          </div>

          {/* Tournament (neutral pill, unchanged) */}
          {tournamentName && (
            <div className='rounded-xl border border-neutral-700/60 bg-neutral-800/70 px-3 py-2 mb-4'>
              <div className='text-[11px] uppercase tracking-wide text-neutral-300 mb-1'>
                Tournament
              </div>
              <p
                className='text-sm sm:text-[15px] font-semibold leading-snug text-neutral-100'
                title={tournamentName}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {tournamentName}
              </p>
            </div>
          )}

          {/* Player */}
          <div className='mb-3 flex items-center gap-3'>
            <div className='h-9 w-9 rounded-full bg-neutral-700 text-neutral-200 grid place-items-center text-xs font-bold'>
              {(player ?? '?').toString().slice(0, 2).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <div className='text-[11px] uppercase tracking-wide text-neutral-400'>
                Player
              </div>
              <div className='text-sm sm:text-base font-medium text-neutral-300 truncate'>
                {player ?? 'Unknown'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className='grid grid-cols-2 gap-4 text-neutral-200'>
            <WinRateBar percent={winrate} className='col-span-2' />

            <div>
              <div className='text-[11px] uppercase tracking-wide text-neutral-400'>
                Top 8
              </div>
              <div className='text-sm font-semibold'>{top8Count ?? '—'}</div>
            </div>
            <div>
              <div className='text-[11px] uppercase tracking-wide text-neutral-400'>
                Decks
              </div>
              <div className='text-sm font-semibold'>{deckCount ?? '—'}</div>
            </div>

            <div>
              <div className='text-[11px] uppercase tracking-wide text-neutral-400'>
                Cards
              </div>
              <div className='text-sm font-semibold'>{cardCount}</div>
            </div>
            <div>
              <div className='text-[11px] uppercase tracking-wide text-neutral-400'>
                Last seen
              </div>
              <div className='text-sm font-semibold'>
                {lastSeen ? new Date(lastSeen).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal with full MtgCard */}
      <CardModal card={open} onClose={() => setOpen(null)} />
    </>
  )
}

export default DeckBox
