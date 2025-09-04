import React, { useState, useCallback } from 'react'
import MtgCard from './MtgCard'
import type { DbUICard, ColorId } from '../types'
import WinRateBar from './WinRateBar'
import CommanderNamePills from './CommanderNamePills'
import CommanderPeek from './CommanderPeek'
import CardModal from './CardModal'
import { normalizeWinratePercent } from '../lib/ui/winrate'
import RecordBadge from './RecordBadge'
import { Trophy } from 'lucide-react'
import SurfaceCard from './SurfaceCard'
import SectionLabel from './SectionLabel'
import Pill from './Pill'
import MetaRow from './MetaRow'

export type DeckBoxProps = {
  name: string // deck name (linked + gradient)
  tournamentName: string // neutral pill (empty string to hide)
  tournamentPlayers?: number
  tournamentId?: string
  commanders: DbUICard[] // 1–2 cards from our DB shape
  colors: ColorId[] // explicit colors (derive if empty)
  player: string

  // DB-driven stats
  wins: number
  losses: number
  draws: number
  avgWinRate: number // 0–1 or 0–100, normalized below
  top8Count: number
  deckCount: number
  sameCommanderCount?: number
  standing?: number
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
  tournamentPlayers = 0,
  tournamentId,
  sameCommanderCount = 0,
  standing,
  lastSeen,
  cardCount = 99,
  deckUrl = 'https://topdeck.gg/deck/yXwMlmGU74ISJ9x5OdlP/cQ30wpoy0eSg7t80b79fgn07Wz62', // example
  className,
  onOpenCard,
  peekWidth = 260,
  peekHeight = 160
}) => {
  const [open, setOpen] = useState<DbUICard | null>(null)
  const [hoverClickable, setHoverClickable] = useState(false)
  const [suppressClickable, setSuppressClickable] = useState(false)

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

  // Derived UI metrics
  const metaShare = tournamentPlayers > 0
    ? Math.round((sameCommanderCount / tournamentPlayers) * 100)
    : 0
  const showTop8 = (top8Count ?? 0) > 0
  // Modal handles ESC & focus

  const clickableActive = hoverClickable && !suppressClickable

  return (
    <>
      {/* Keep grid space when modal open, but hide visually */}
      <SurfaceCard
        interactive={false}
        className={[
          'relative w-full max-w-[25rem] sm:max-w-[26rem]',
          'px-4 sm:px-5 pb-4 sm:pb-5',
          'transition-shadow hover:shadow-[0_20px_60px_rgba(0,0,0,.55)]',
          // Emphasize clickability only when outside the peek zone and not over the tournament pill
          clickableActive ? 'hover:ring-[#DAA21C] hover:ring-2 focus-visible:ring-[#DAA21C] focus-visible:ring-2 transition-colors' : '',
          open ? 'invisible' : '',
          className ?? ''
        ].join(' ')}
        style={{ paddingTop, cursor: clickableActive ? 'pointer' : 'default' }}
        onClick={() => { if (deckUrl) window.location.href = deckUrl }}
        onKeyDown={(e) => { if (deckUrl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); (window.location.href = deckUrl) } }}
        role='link'
        tabIndex={0}
        aria-label={`View deck ${name}`}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          const y = e.clientY - rect.top
          // Make the top peek zone (and a small buffer) non-clickable for hover affordance
          const nonClickableHeight = peekZone + 12
          setHoverClickable(y > nonClickableHeight)
        }}
        onMouseLeave={() => setHoverClickable(false)}
        onFocus={() => setHoverClickable(true)}
        onBlur={() => setHoverClickable(false)}
      >
        {/* Commander peeks (inside reserved zone, lower z-index) */}
        <div
          className='absolute inset-x-0 z-0 flex justify-center gap-4 items-start cursor-default'
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

          {/* (Removed duplicate commander title link for cleaner hierarchy) */}

          {/* Tournament (neutral pill, compact metadata) */}
          {tournamentName && (
            <div
              className='rounded-xl border border-neutral-700/60 bg-neutral-800/70 px-3 py-2 mb-4 hover:border-[#DAA21C] focus-within:border-[#DAA21C] transition-colors'
              onMouseEnter={() => setSuppressClickable(true)}
              onMouseLeave={() => setSuppressClickable(false)}
              onFocus={() => setSuppressClickable(true)}
              onBlur={() => setSuppressClickable(false)}
            >
              <SectionLabel>Tournament</SectionLabel>
              <a
                href={tournamentId ? `/tournaments?id=${encodeURIComponent(tournamentId)}&name=${encodeURIComponent(tournamentName)}` : '/tournaments'}
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
              </a>
              <MetaRow>
                {standing && standing <= 3 ? (
                  <span className='inline-flex items-center gap-1'>
                    <Trophy className={`${standing === 1 ? 'text-amber-400' : standing === 2 ? 'text-gray-300' : 'text-orange-400'}`} size={16} />
                    <span className='text-neutral-200'>{ordinal(standing)} Place</span>
                  </span>
                ) : null}
                {tournamentPlayers ? <span>Players: {tournamentPlayers}</span> : null}
                {lastSeen ? <span>{new Date(lastSeen).toLocaleDateString()}</span> : null}
              </MetaRow>
            </div>
          )}

          {/* Player */}
          <div className='mb-3 flex items-center gap-3'>
            <div className='h-9 w-9 rounded-full bg-neutral-700 text-neutral-200 grid place-items-center text-xs font-bold'>
              {(player ?? '?').toString().slice(0, 2).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <div className='text-[11px] uppercase tracking-wide text-neutral-300'>
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
            <div className='col-span-2'>
              <RecordBadge wins={wins} losses={losses} draws={draws} />
            </div>

            {showTop8 ? (
              <div className='col-span-1'>
                <SectionLabel>Finish</SectionLabel>
                <Pill variant='success'>Top 8</Pill>
              </div>
            ) : null}


            <div>
              <SectionLabel>Cards</SectionLabel>
              <div className='text-sm font-semibold'>{cardCount}</div>
            </div>
            <div>
              <SectionLabel>Meta share</SectionLabel>
              <div className='text-sm font-semibold'>{metaShare}%</div>
            </div>
          </div>
        </div>
      </SurfaceCard>

      {/* Modal with full MtgCard */}
      <CardModal card={open} onClose={() => setOpen(null)} />
    </>
  )
}

export default DeckBox

function ordinal (n?: number): string {
  if (!n && n !== 0) return ''
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
