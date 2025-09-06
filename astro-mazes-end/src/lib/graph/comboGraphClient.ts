// lib/graph/comboGraphClient.ts
import { EventEmitter } from 'events'

interface ComboGraphRequest {
  id: number
  method: string
  params: Record<string, any>
}

interface ComboGraphResponse {
  id: number
  result?: any
  error?: {
    code: number
    message: string
  }
}

export interface ComboData {
  id: string
  card_names: string[]
  produces: string[]
  prerequisites: string[]
  steps: string[]
  color_identity: string
  cards: Array<{
    name: string
    combos_count: number
  }>
}

export interface Distance1Result {
  total: number
  combos: Array<{
    id: string
    shared_cards: string[]
    shared_cards_count: number
    color_identity: string
    produces: string[]
  }>
}

export interface ComboSearchResult {
  card_name: string
  total_combos: number
  combos: Array<{
    id: string
    color_identity: string
    produces: string[]
    card_names: string[]
  }>
}

export interface CardImportance {
  combos_count: number
  degree_centrality: number
  betweenness_centrality: number
  eigenvector_centrality: number
  combo_ids: string[]
}

export interface ComboPackage {
  combo_ids: string[]
  combo_count: number
  total_unique_cards: number
  core_cards: string[]
  all_cards: string[]
}

export interface GraphStatistics {
  total_combos: number
  total_cards: number
  total_edges: number
  graph_density: number
  avg_cards_per_combo: number
  avg_combos_per_card: number
  most_connected_combos: Array<[string, number]>
  most_versatile_cards: Array<[string, number]>
  color_distribution: Record<string, number>
  largest_connected_component: number | string
}

export interface TournamentResult {
  date: string;
  tournament_name: string;
  tournament_id: string;
  wins: number;
  draws: number;
  losses: number;
}

class ComboGraphClient extends EventEmitter {
  private baseUrl: string
  private isReady: boolean = false

  constructor(host: string = 'localhost', port: number = 8080) {
    super()
    this.baseUrl = `http://${host}:${port}`
    this.checkHealth()
  }

  private async checkHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      if (response.ok) {
        const data = await response.json()
        console.log(`Combo server healthy: ${data.combos_loaded} combos loaded`)
        this.isReady = true
      }
    } catch (error) {
      console.error('Failed to connect to combo server:', error)
      // Retry after 5 seconds
      setTimeout(() => this.checkHealth(), 5000)
    }
  }

  async ensureReady(): Promise<void> {
    if (!this.isReady) {
      // Wait for server to be ready
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.isReady) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    await this.ensureReady()
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response.json()
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error)
      throw error
    }
  }

  // Public API methods

  async getComboById(comboId: string): Promise<ComboData | null> {
    try {
      return await this.request<ComboData>(`/api/combo/${encodeURIComponent(comboId)}`)
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  async getDistance1Combos(comboId: string): Promise<Distance1Result> {
    return this.request<Distance1Result>(`/api/combo/${encodeURIComponent(comboId)}/distance1`)
  }

  async getDistance2Combos(comboId: string): Promise<any> {
    // Not implemented in the server yet
    throw new Error('getDistance2Combos not implemented')
  }

  async findComboChainsFromCombo(comboId: string, maxDepth = 3): Promise<any[]> {
    // Not implemented in the server yet
    throw new Error('findComboChainsFromCombo not implemented')
  }

  async searchCombosByCard(cardName: string): Promise<ComboSearchResult> {
    return this.request<ComboSearchResult>(`/api/combos/card/${encodeURIComponent(cardName)}`)
  }

  async getCardImportance(cardName?: string): Promise<CardImportance | { top_cards: any[] }> {
    // Not implemented in the server yet
    throw new Error('getCardImportance not implemented')
  }

  async findComboPackages(minSharedCards = 2): Promise<ComboPackage[]> {
    return this.request<ComboPackage[]>(`/api/combos/packages?min_shared_cards=${minSharedCards}`)
  }

  async getGraphStatistics(): Promise<GraphStatistics> {
    return this.request<GraphStatistics>('/api/combos/statistics')
  }

  async getCombosByColorIdentity(colorIdentity: string): Promise<any> {
    // Not implemented in the server yet
    throw new Error('getCombosByColorIdentity not implemented')
  }

  async getRelatedCombos(comboId: string, limit = 10): Promise<any> {
    // Not implemented in the server yet
    throw new Error('getRelatedCombos not implemented')
  }

  async getComboPackageById(comboIds: string[], minSharedCards = 2): Promise<ComboPackage> {
    return this.request<ComboPackage>('/api/combos/package', {
      method: 'POST',
      body: JSON.stringify({
        combo_ids: comboIds,
        min_shared_cards: minSharedCards
      })
    })
  }

  close(): void {
    // Nothing to close for HTTP client
  }
}

// Singleton instance
let graphClientInstance: ComboGraphClient | null = null

export function getComboGraphClient(): ComboGraphClient {
  if (!graphClientInstance) {
    const host = process.env.COMBO_GRAPH_HOST || 'localhost'
    const port = parseInt(process.env.COMBO_GRAPH_PORT || '8080', 10)
    
    graphClientInstance = new ComboGraphClient(host, port)
  }
  return graphClientInstance
}

// No cleanup needed for HTTP client
process.on('exit', () => {
  if (graphClientInstance) {
    graphClientInstance.close()
  }
})