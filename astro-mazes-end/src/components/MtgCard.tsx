import React from 'react'
import ManaText from '../components/ManaText'
import CardStats from '../components/CardStats'

type MtgCardProps = {
  card: any
  index?: number | string
}

/** Safely pull face-aware fields (works for DFC/MDFC and single-faced) */
function faceField<T = any> (card: any, key: string, fallback: T = '' as T): T {
  if (card?.[key] != null) return card[key] as T
  if (Array.isArray(card?.card_faces) && card.card_faces[0]?.[key] != null) {
    return card.card_faces[0][key] as T
  }
  return fallback
}

/** First available art image */
function getArt (card: any): string | undefined {
  return (
    card?.image_uris?.art_crop ||
    card?.image_uris?.normal ||
    card?.image_uris?.large ||
    card?.card_faces?.[0]?.image_uris?.art_crop ||
    card?.card_faces?.[0]?.image_uris?.normal ||
    card?.card_faces?.[0]?.image_uris?.large
  )
}

function cardBorderClass(card: any): string {
  const colors: string[] = card?.colors || []
  if (colors.length === 0) return 'border-[#CAC5C0]' // colorless / artifacts

  if (colors.length === 1) {
    switch (colors[0]) {
      case 'W': return 'border-[#F8F6D8]'
      case 'U': return 'border-[#C1D7E9]'
      case 'B': return 'border-[#CAC5C0]'
      case 'R': return 'border-[#E49977]'
      case 'G': return 'border-[#A3C095]'
      default:  return 'border-[#CAC5C0]'
    }
  }

  // Multicolor → let style() paint the gradient
  return 'border-transparent'
}

function cardBorderStyle(card: any): React.CSSProperties {
  const colors: string[] = card?.colors || []
  const isLegendary = /\bLegendary\b/i.test(card?.type_line || '')

  if (colors.length <= 1) return {}

  const HEX: Record<string, string> = {
    W: '#F8F6D8',
    U: '#C1D7E9',
    B: '#CAC5C0',
    R: '#E49977',
    G: '#A3C095',
  }
  const BASE = '#CAC5C0'
  const GOLD = '#DAA21C'

  let stops = colors.map(c => HEX[c] ?? BASE)
  if (isLegendary) stops = [GOLD, ...stops, GOLD]

  const step = 100 / (stops.length - 1)
  const parts = stops.map((s, i) => `${s} ${Math.round(i * step)}%`).join(', ')

  return {
    borderImage: `linear-gradient(90deg, ${parts}) 1`,
    borderStyle: 'solid',
  }
}

/** Inline renderer that injects <ManaText> for tokens like {2}, {W}, {U/B}, etc. */
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

export default function MtgCard ({ card, index }: MtgCardProps): React.JSX.Element {
  const name = faceField<string>(card, 'name', card?.name || '')
  const manaCost = faceField<string>(card, 'mana_cost', '')
  const typeLine = faceField<string>(card, 'type_line', '')
  const oracleText = faceField<string>(card, 'oracle_text', '')
  const flavorText = faceField<string>(card, 'flavor_text', '')
  const artist = faceField<string>(card, 'artist', '')
  const power = faceField<string>(card, 'power', '')
  const toughness = faceField<string>(card, 'toughness', '')
  const loyalty = faceField<string>(card, 'loyalty', '')
  const artSrc = getArt(card)

  const hasPT = power && toughness
  const hasLoyalty = !!loyalty

  const oracleLines = oracleText ? oracleText.split('\n') : []

  return (
    <div
      key={index}
      className={`relative aspect-[63/88] w-full max-w-sm mx-auto shadow-2xl border-4 bg-neutral-800 overflow-hidden ${cardBorderClass(card)}`}
      style={{
        ...cardBorderStyle(card),
        /* keep a little breathing room on tiny screens by reducing interior padding */
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.6)',
      }}
    >
      {/* Inner frame as a grid: 
          rows = [topbar, ART (flexible), type, rules/flavor, footer] */}
      <div
        className="
          absolute inset-0 rounded-[1rem] overflow-hidden
          grid h-full
          /* art shrinks first, everything else natural height */
          grid-rows-[auto_minmax(4.5rem,1fr)_auto_auto_auto]
          sm:grid-rows-[auto_minmax(6rem,1fr)_auto_auto_auto]
          md:grid-rows-[auto_minmax(7rem,1fr)_auto_auto_auto]
        "
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2 px-3 pt-2 pb-1">
          <h3 className="font-serif font-bold leading-tight truncate text-[clamp(0.95rem,2.6vw,1.125rem)] text-neutral-100">
            {name}
          </h3>
          {manaCost ? (
            <div className="shrink-0 translate-y-[2px]">
              <ManaText text={manaCost} size={16} gap={2} inline />
            </div>
          ) : null}
        </div>

        {/* Art window (row 2: flexible height) */}
        <div className="px-3 min-h-0">
          <div className="relative w-full h-full min-h-[3.75rem] sm:min-h-[5rem] rounded-md overflow-hidden border border-neutral-700/70 bg-neutral-100">
            {/* Make the image fill the available flexible height */}
            <div className="absolute inset-0">
              {artSrc ? (
                <img
                  src={artSrc}
                  alt={name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-neutral-100 text-sm">
                  No art available
                </div>
              )}
            </div>

            {/* Stats overlay; scale down on small screens so it never crowds text */}
            <div className="absolute top-2 left-2 bg-black/50 rounded-4xl p-1 origin-top-left scale-[.72] sm:scale-90 md:scale-100">
              <CardStats
                size={88}
                values={{
                  power: Math.floor(Math.random() * 10) + 1,
                  cost: Math.floor(Math.random() * 10) + 1,
                  popularity: Math.floor(Math.random() * 10) + 1,
                  difficulty: Math.floor(Math.random() * 10) + 1,
                  salt: Math.floor(Math.random() * 10) + 1
                }}
                max={10}
                rings={4}
                padding={10}
                showLabels={false}
              />
            </div>
          </div>
        </div>

        {/* Type line */}
        <div className="mt-1 px-3">
          <div className="rounded-sm border border-neutral-700/70 bg-neutral-900/70 px-2 py-1">
            <p className="text-[12px] sm:text-[13px] text-neutral-200 tracking-wide">
              {typeLine}
            </p>
          </div>
        </div>

        {/* Rules + Flavor (allow this to grow naturally; art will shrink first) */}
        <div className="relative mt-2 px-3 pb-2">
          <div className="relative rounded-md border border-neutral-700/70 bg-[#f7f2e7] text-neutral-900 px-3 py-2 min-h-[84px] sm:min-h-[100px]">
            <div className="space-y-1.5 text-[12px] sm:text-[13px] leading-5">
              {oracleLines.length ? (
                oracleLines.map((line, i) => (
                  <p key={i}>
                    <InlineMana text={line} />
                  </p>
                ))
              ) : (
                <p className="text-neutral-500 italic">—</p>
              )}
            </div>

            {flavorText ? (
              <>
                <div className="my-2 border-t border-neutral-300/70" />
                <p className="text-[12px] sm:text-[13px] italic text-neutral-700 leading-5">
                  {flavorText}
                </p>
              </>
            ) : null}

            {(hasPT || hasLoyalty) && (
              <div className="absolute -bottom-2 -right-2">
                <div className="rounded-md bg-neutral-900 text-neutral-100 border border-neutral-700 px-2 py-1 shadow">
                  <span className="text-xs sm:text-sm font-semibold tracking-wide">
                    {hasPT ? `${power}/${toughness}` : `Loyalty ${loyalty}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer (sticks at bottom because grid fills the full height) */}
        {(artist || card?.set_name) && (
          <div className="px-3 pb-2 pt-1 flex items-center justify-between text-[11px] text-neutral-500">
            <div className="truncate">
              {artist ? <span>Illus. {artist}</span> : <span>&nbsp;</span>}
            </div>
            <div className="truncate">
              {card?.set_name ? <span>{card.set_name}</span> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
