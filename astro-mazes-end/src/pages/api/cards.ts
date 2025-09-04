import type { APIRoute } from 'astro'
import { loadCardsWithStats } from '../../server/cards'

export const GET: APIRoute = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? 24)
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const q = url.searchParams.get('q') || undefined
  try {
    const rows = await loadCardsWithStats(limit, offset, q)
    return new Response(JSON.stringify({ rows }), {
      headers: { 'content-type': 'application/json' }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'error' }), { status: 500 })
  }
}

