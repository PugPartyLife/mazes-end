import React, { useMemo, useState } from 'react'
import ManaText from '../components/ManaText'
import PolygonStats from '../components/PolygonStats'
import StatsChips from '../components/StatsChips'
import type { DbUICard } from '../types'
import { symbols as allSets } from '../data/magicSets'
import Tooltip from '../components/Tooltip'
import { Eye, EyeOff } from 'lucide-react'

type InteractiveMtgCardProps = {
  card: DbUICard
  index?: number | string
  showChips?: boolean
  chips?: { staplePercent: number; decks: number; top8: number }
  interactive?: boolean
  revealedSections?: Set<string>
  onRevealSection?: (section: string) => void
  onNameGuess?: (guess: string) => void
}

/** Colors → hex used for borders/gradients */
const HEX: Record<string, string> = {
  W: '#F8F6D8',
  U: '#C1D7E9',
  B: '#CAC5C0',
  R: '#E49977',
  G: '#A3C095'
}
const COLORLESS = '#CAC5C0'
const ARTIFACT_BROWN = '#B89E72' // "old artifact" feel
const LEGEND_GOLD = '#DAA21C'

/** Prefer color identity (accounts for back side & activated abilities) */
function identityColors (card: DbUICard): string[] {
  const fromId: string[] = Array.isArray(card?.color_identity)
    ? card.color_identity
    : []
  const faces = getFaces(card)
  const face0 = faces[0]
  const fromFace0: string[] = Array.isArray(face0?.color_indicator)
    ? face0.color_indicator
    : []
  const set = new Set<string>([...fromId, ...fromFace0].filter(c => 'WUBRG'.includes(c)))
  return Array.from(set)
}

function parseJsonMaybe<T = any> (value: any): T | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return undefined }
  }
  return value as T
}

function parseFaces(value: string | null | undefined): any[] | undefined {
  if (!value) return undefined
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr : undefined
  } catch {
    return undefined
  }
}

function getFaces (card: DbUICard): any[] {
  // Prefer explicit faces if present
  if (Array.isArray(card?.card_faces)) return card.card_faces as any[]
  const parsed = parseFaces(card?.card_faces as string | null | undefined)
  if (Array.isArray(parsed)) return parsed

  // Fallback: infer dual faces from flattened image_uris or split name or layout
  const uris = parseJsonMaybe<any>(card?.image_uris)
  const hasF0 = !!pickFlattenedFaceUri(uris, 0)
  const hasF1 = !!pickFlattenedFaceUri(uris, 1)
  const nameParts = typeof card?.name === 'string' ? card.name.split(' // ') : []
  const looksDual = /transform|modal_dfc|double_faced|split|adventure/i.test(
    (card as any)?.layout || ''
  )
  if (hasF1 || (hasF0 && looksDual) || nameParts.length > 1) {
    return [
      { name: nameParts[0] || card?.name },
      { name: nameParts[1] || '' }
    ]
  }
  return []
}

/** First available art image for a given face or whole card */
function getArt (card: DbUICard, faceIdx?: number): string | undefined {
  const faces = getFaces(card)
  const f = faces[faceIdx ?? 0]
  const fUris = parseJsonMaybe<any>(f?.image_uris)
  const cUris = parseJsonMaybe<any>(card?.image_uris)
  const idx = faceIdx ?? 0
  const faceFlattened = pickFlattenedFaceUri(cUris, idx)
  return (
    fUris?.art_crop  || fUris?.normal   || faceFlattened ||
    cUris?.art_crop  || cUris?.normal   || cUris?.large ||
    fUris?.large
  )
}

function pickFlattenedFaceUri (uris: any, faceIdx: number): string | undefined {
  if (!uris || typeof uris !== 'object') return undefined
  const p = `face_${faceIdx}_`
  return (
    uris[`${p}art_crop`] ||
    uris[`${p}normal`]   ||
    uris[`${p}large`]    ||
    uris[`${p}small`]    ||
    uris[`${p}png`]
  )
}

/** Read a field from the active face if applicable */
function fromFace<T = any> (
  card: DbUICard,
  faceIdx: number | undefined,
  key: string,
  fallback: T = '' as T
): T {
  const faces = getFaces(card)
  const f = faces[faceIdx ?? 0]
  if (f?.[key] != null) return f[key] as T
  if ((card as any)?.[key] != null) return (card as any)[key] as T
  return fallback
}

/** Border class for mono / colorless; multicolor uses style() */
function cardBorderClass (card: any, colors: string[]): string {
  // Artifact & truly colorless → brown frame border
  const isArtifact = /\bArtifact\b/i.test(
    card?.type_line || fromFace(card, 0, 'type_line', '')
  )
  if (colors.length === 0) {
    return isArtifact ? 'border-[#B89E72]' : 'border-[#CAC5C0]'
  }
  if (colors.length === 1) {
    const c = colors[0]
    switch (c) {
      case 'W':
        return 'border-[#F8F6D8]'
      case 'U':
        return 'border-[#C1D7E9]'
      case 'B':
        return 'border-[#CAC5C0]'
      case 'R':
        return 'border-[#E49977]'
      case 'G':
        return 'border-[#A3C095]'
    }
  }
  return 'border-transparent'
}

/**
 * Multicolor gradient (mana colors only; no gold blending)
 * Use layered backgrounds instead of border-image so rounded corners render
 * consistently across browsers and wrappers. The outer element already has
 * `border-4` and a transparent border when multicolor.
 */
function cardBorderStyle (card: any, colors: string[]): React.CSSProperties {
  if (colors.length <= 1) return {}
  const stops = colors.map(c => HEX[c] ?? COLORLESS)
  const step = 100 / (stops.length - 1)
  const parts = stops.map((s, i) => `${s} ${Math.round(i * step)}%`).join(', ')
  // Tailwind neutral-800 is rgb(38,38,38). Keep in sync with class.
  const fill = 'rgb(38 38 38)' // bg-neutral-800
  return {
    background: `linear-gradient(${fill}, ${fill}) padding-box, linear-gradient(90deg, ${parts}) border-box`,
    backgroundClip: 'padding-box, border-box'
  }
}

/** Tiny circle button with an Up/Down triangle (matches transform icons vibe) */
function TransformButton ({
  up = true,
  onClick
}: {
  up?: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onClick(e)
      }}
      className='inline-grid place-items-center h-7 w-7 rounded-full bg-black/65 ring-1 ring-white/70 shadow-md hover:bg-black/75'
      title={up ? 'Show back face' : 'Show front face'}
      aria-label={up ? 'Show back face' : 'Show front face'}
    >
      <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
        {up ? (
          <polygon points='12,4 20,20 4,20' fill='white' />
        ) : (
          <polygon points='4,4 20,4 12,20' fill='white' />
        )}
      </svg>
    </button>
  )
}

/** Inline renderer that injects <ManaText> */
function InlineMana ({ text }: { text: string }) {
  if (!text) return null
  const parts = text.split(/(\{[^}]+\})/g).filter(Boolean)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('{') && p.endsWith('}') ? (
          <ManaText key={`${p}-${i}`} text={p} size={14} gap={1} inline />
        ) : (
          <span key={`t-${i}`}>{p}</span>
        )
      )}
    </>
  )
}

/** Clickable hidden section overlay */
function HiddenOverlay ({ 
  section, 
  onClick,
  small = false
}: { 
  section: string
  onClick: () => void
  small?: boolean
}) {
  return (
    <div 
      className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors z-10"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <div className={`text-center ${small ? 'scale-75' : ''}`}>
        <EyeOff className="w-6 h-6 text-gray-400 mx-auto mb-1" />
        <span className="text-xs text-gray-400">Click to reveal</span>
      </div>
    </div>
  )
}

export default function InteractiveMtgCard ({
  card,
  index,
  showChips,
  chips,
  interactive = false,
  revealedSections = new Set(['image']),
  onRevealSection = () => {},
  onNameGuess = () => {}
}: InteractiveMtgCardProps): React.JSX.Element {
  const hasFaces = getFaces(card).length > 1
  const [faceIdx, setFaceIdx] = useState<number>(0)

  // pull from active face where possible
  const name = fromFace<string>(card, faceIdx, 'name', card?.name || '')
  const manaCost = fromFace<string>(card, faceIdx, 'mana_cost', '')
  const typeLine = fromFace<string>(card, faceIdx, 'type_line', '')
  const oracleText = fromFace<string>(card, faceIdx, 'oracle_text', '')
  const flavorText = fromFace<string>(card, faceIdx, 'flavor_text', '')
  const artist = fromFace<string>(card, faceIdx, 'artist', card?.artist || '')
  const power = fromFace<string>(card, faceIdx, 'power', '')
  const toughness = fromFace<string>(card, faceIdx, 'toughness', '')
  const loyalty = fromFace<string>(card, faceIdx, 'loyalty', '')
  const artSrc = getArt(card, faceIdx)
  const setName: string = card?.set_name || ''

  // Resolve set info (code + set icon) from local list
  const setInfo = useMemo(() => {
    if (!setName) return undefined
    try {
      const list = (allSets?.data ?? []) as any[]
      const found = list.find((s: any) =>
        typeof s?.name === 'string' && s.name.toLowerCase() === setName.toLowerCase()
      )
      if (found) return {
        name: String(found.name || setName),
        code: String(found.code || '').toUpperCase(),
        icon: String(found.icon_svg_uri || ''),
        released_at: String(found.released_at || '')
      }
    } catch {}
    return undefined
  }, [setName])

  // CardStats values from DB fields (fallbacks handled)
  const toTen = (n: any) => {
    const v = Number(n)
    if (!isFinite(v) || isNaN(v)) return 0
    if (v <= 10) return Math.max(0, Math.min(10, v))
    if (v <= 100) return Math.max(0, Math.min(10, v / 10))
    return 10
  }
  const priceToTen = (p: any) => {
    const v = Number(p)
    if (!isFinite(v) || v <= 0) return 0
    const denom = Math.log(100 + 1)
    return Math.max(0, Math.min(10, (Math.log(v + 1) / denom) * 10))
  }
  const statsPower = toTen((card as any).card_power)
  const statsPopularity = toTen((card as any).popularity)
  const statsSalt = toTen((card as any).salt)
  const statsDifficulty = toTen((card as any).versatility)
  const statsCost = priceToTen((card as any).price)

  const isLegendary = /\bLegendary\b/i.test(typeLine || '')
  const colors = useMemo(() => identityColors(card), [card])

  const hasPT = power && toughness
  const hasLoyalty = !!loyalty
  const oracleLines = oracleText ? oracleText.split('\n') : []

  // Title color: gold for Legendary, otherwise neutral
  const titleClass = isLegendary ? 'text-[#DAA21C]' : 'text-neutral-100'

  return (
    <div
      key={index}
      className={`relative aspect-[63/88] w-full max-w-sm mx-auto shadow-2xl border-4 bg-neutral-800 overflow-visible rounded-[1rem] ${cardBorderClass(
        card,
        colors
      )}`}
      style={{
        ...cardBorderStyle(card, colors),
        boxShadow:
          'inset 0 0 0 2px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.6)'
      }}
    >
      {/* Inner frame with adjusted grid for 40% text area max */}
      <div
        className='
          absolute inset-0 rounded-[1rem] overflow-visible
          grid h-full
          grid-rows-[auto_1fr_auto_minmax(0,30%)_auto]
        '
        style={{
          gridTemplateRows: 'auto 1fr auto minmax(0, 30%) auto'
        }}
      >
        {/* Top bar */}
        <div className='flex items-start justify-between gap-2 px-3 pt-2 pb-1 relative'>
          {interactive && !revealedSections.has('name') ? (
            <input
              type="text"
              placeholder="Enter card name..."
              className="font-serif font-bold text-[clamp(0.85rem,2.2vw,1rem)] bg-transparent border-b border-gray-600 text-gray-300 focus:text-white focus:border-yellow-400 outline-none transition-colors flex-1 mr-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    onNameGuess(value);
                  }
                }
              }}
            />
          ) : (
            <h3
              className={`font-serif font-bold leading-tight truncate text-[clamp(0.85rem,2.2vw,1rem)] ${titleClass}`}
            >
              {name}
            </h3>
          )}
          {manaCost ? (
            <div className='shrink-0 translate-y-[2px] relative'>
              {interactive && !revealedSections.has('manaCost') ? (
                <div 
                  className="px-3 py-1 bg-black/60 rounded cursor-pointer hover:bg-black/50 transition-colors"
                  onClick={() => onRevealSection('manaCost')}
                >
                  <EyeOff className="w-4 h-4 text-gray-400" />
                </div>
              ) : (
                <ManaText text={manaCost} size={16} gap={2} inline />
              )}
            </div>
          ) : null}
        </div>

        {/* Art window (takes remaining space after text) */}
        <div className='px-3 min-h-0 relative overflow-hidden'>
          <div className='relative w-full h-full rounded-md overflow-hidden border border-neutral-700/70 bg-neutral-100'>
            <div className='absolute inset-0 overflow-hidden'>
              {artSrc ? (
                <img
                  src={artSrc}
                  alt={name}
                  className='w-full h-full object-cover object-left-top'
                  loading='lazy'
                  decoding='async'
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div className='w-full h-full grid place-items-center text-neutral-100 text-sm'>
                  No art available
                </div>
              )}
            </div>

            {/* Hidden overlay for image - always visible in interactive mode */}
            {interactive && !revealedSections.has('image') && (
              <HiddenOverlay section="image" onClick={() => onRevealSection('image')} />
            )}

            {/* DFC / Transform toggle (top-right). Clicking does NOT open outer modal */}
            {hasFaces && revealedSections.has('image') && (
              <div className='absolute top-2 right-2'>
                <TransformButton
                  up={faceIdx === 0}
                  onClick={() => setFaceIdx(v => (v === 0 ? 1 : 0))}
                />
              </div>
            )}
          </div>
          {/* Optional vertical stats chips on right side (outside art overflow clip) */}
          {showChips && chips ? (
            <div className='absolute right-1 top-1 sm:top-2 md:top-2 z-[2] pointer-events-none'>
              <StatsChips direction='vertical' className='pointer-events-auto items-end'
                staplePercent={chips.staplePercent}
                decks={chips.decks}
                top8={chips.top8}
              />
            </div>
          ) : null}
        </div>

        {/* Type line + Set (icon at right with tooltip) */}
        <div className='mt-1 px-3 relative'>
          <div className='rounded-sm border border-neutral-700/70 bg-neutral-900/70 px-2 py-1 flex items-center justify-between gap-2'>
            {interactive && !revealedSections.has('typeLine') && (
              <HiddenOverlay section="typeLine" onClick={() => onRevealSection('typeLine')} small />
            )}
            <p className='text-[12px] sm:text-[13px] text-neutral-200 tracking-wide truncate'>
              {interactive && !revealedSections.has('typeLine') ? '???' : typeLine}
            </p>
            {setInfo?.icon && (!interactive || revealedSections.has('typeLine')) ? (
              <Tooltip
                placement='top-right'
                content={(
                  <div>
                    <div className='text-[12px] font-semibold leading-snug'>{setInfo.name}</div>
                    <div className='mt-0.5 text-[11px] text-neutral-300 leading-snug'>
                      {setInfo.released_at ? new Date(setInfo.released_at).toLocaleDateString() : ''}
                      {setInfo.code ? (
                        <span className='ml-2 inline-flex items-center rounded px-1.5 py-[1px] text-[10px] font-bold tracking-wide uppercase bg-neutral-800 text-neutral-200 ring-1 ring-neutral-700'>
                          {setInfo.code}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              >
                <img
                  src={setInfo.icon}
                  alt=""
                  aria-hidden='true'
                  width={16}
                  height={16}
                  loading='lazy'
                  decoding='async'
                  className='opacity-90'
                  style={{ filter: 'invert(1) brightness(1.15) contrast(1.05)' }}
                />
              </Tooltip>
            ) : null}
          </div>
        </div>

        {/* Rules + Flavor (constrained to 40% max height) */}
        <div className='relative mt-2 px-3 pb-2 overflow-hidden'>
          <div className='relative rounded-md border border-neutral-700/70 bg-[#f7f2e7] text-neutral-900 px-3 py-2 h-full flex flex-col'>
            {interactive && !revealedSections.has('oracleText') && (
              <HiddenOverlay section="oracleText" onClick={() => onRevealSection('oracleText')} />
            )}
            <div className='flex-1 overflow-y-auto scroll-thin pr-1'>
              <div className='space-y-1.5 text-[11px] sm:text-[12px] leading-[1.35]'>
                {oracleLines.length && (!interactive || revealedSections.has('oracleText')) ? (
                  oracleLines.map((line, i) => (
                    <p key={i}>
                      <InlineMana text={line} />
                    </p>
                  ))
                ) : (
                  <p className='text-neutral-500 italic'>
                    {interactive && !revealedSections.has('oracleText') ? '???' : '—'}
                  </p>
                )}
              </div>

              {flavorText && (!interactive || revealedSections.has('oracleText')) ? (
                <>
                  <div className='my-1.5 border-t border-neutral-300/70' />
                  <p className='text-[11px] sm:text-[12px] italic text-neutral-700 leading-[1.35]'>
                    {flavorText}
                  </p>
                </>
              ) : null}
            </div>

            {/* Power/Toughness or Loyalty indicator - positioned at bottom right of text box */}
            {(hasPT || hasLoyalty) && (!interactive || revealedSections.has('stats')) && (
              <div className='absolute -bottom-[1px] -right-[1px]'>
                <div className='rounded-tl-md rounded-br-md bg-neutral-900 text-neutral-100 border-t border-l border-neutral-700 px-2.5 py-1 shadow-md'>
                  <span className='text-sm sm:text-[15px] font-bold tracking-wide'>
                    {hasPT ? `${power}/${toughness}` : loyalty}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (artist only; set moved to type line) */}
        {artist && (!interactive || revealedSections.has('artist')) && (
          <div className='px-3 pb-2 pt-1 flex items-center justify-between text-[11px] text-neutral-500'>
            <div className='truncate'>Illus. {artist}</div>
            <div className='truncate'><span>&nbsp;</span></div>
          </div>
        )}
      </div>
    </div>
  )
}