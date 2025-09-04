// lib/graph/comboGraphClient.ts
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import path from 'path'

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

class ComboGraphClient extends EventEmitter {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>()
  private buffer = ''
  private isReady = false
  private startupPromise: Promise<void>

  constructor(private pythonScriptPath: string, private dataFilePath: string) {
    super()
    this.startupPromise = this.start()
  }

  private async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.resolve(this.pythonScriptPath)
      const dataPath = path.resolve(this.dataFilePath)

      console.log(`Starting combo graph server with data from ${dataPath}...`)
      
      this.process = spawn('python3', [scriptPath, dataPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.process.on('error', (error) => {
        console.error('Failed to start Python process:', error)
        reject(error)
      })

      this.process.stderr?.on('data', (data) => {
        console.log('[Python]', data.toString().trim())
        // Check if server is ready
        if (data.toString().includes('server started')) {
          this.isReady = true
          resolve()
        }
      })

      this.process.stdout?.on('data', (data) => {
        this.buffer += data.toString()
        const lines = this.buffer.split('\n')
        this.buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response: ComboGraphResponse = JSON.parse(line)
              const request = this.pendingRequests.get(response.id)
              if (request) {
                if (response.error) {
                  request.reject(new Error(response.error.message))
                } else {
                  request.resolve(response.result)
                }
                this.pendingRequests.delete(response.id)
              }
            } catch (error) {
              console.error('Failed to parse response:', error)
            }
          }
        }
      })

      this.process.on('close', (code) => {
        console.log(`Python process exited with code ${code}`)
        this.isReady = false
        // Reject all pending requests
        for (const [, request] of this.pendingRequests) {
          request.reject(new Error('Process closed'))
        }
        this.pendingRequests.clear()
      })

      // Set a timeout for startup
      setTimeout(() => {
        if (!this.isReady) {
          reject(new Error('Python process startup timeout'))
        }
      }, 10000)
    })
  }

  async ensureReady(): Promise<void> {
    await this.startupPromise
  }

  private async request<T>(method: string, params: Record<string, any> = {}): Promise<T> {
    await this.ensureReady()
    
    if (!this.process || !this.isReady) {
      throw new Error('Graph server not ready')
    }

    const id = ++this.requestId
    const request: ComboGraphRequest = { id, method, params }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout: ${method}`))
      }, 30000)

      // Clear timeout on resolution
      const originalResolve = resolve
      resolve = (value) => {
        clearTimeout(timeout)
        originalResolve(value)
      }

      this.process!.stdin?.write(JSON.stringify(request) + '\n')
    })
  }

  // Public API methods

  async getComboById(comboId: string): Promise<ComboData | null> {
    return this.request<ComboData | null>('getComboById', { comboId })
  }

  async getDistance1Combos(comboId: string): Promise<Distance1Result> {
    return this.request<Distance1Result>('getDistance1Combos', { comboId })
  }

  async getDistance2Combos(comboId: string): Promise<any> {
    return this.request('getDistance2Combos', { comboId })
  }

  async findComboChainsFromCombo(comboId: string, maxDepth = 3): Promise<any[]> {
    return this.request('findComboChainsFromCombo', { comboId, maxDepth })
  }

  async searchCombosByCard(cardName: string): Promise<ComboSearchResult> {
    return this.request<ComboSearchResult>('searchCombosByCard', { cardName })
  }

  async getCardImportance(cardName?: string): Promise<CardImportance | { top_cards: any[] }> {
    return this.request('getCardImportance', cardName ? { cardName } : {})
  }

  async findComboPackages(minSharedCards = 2): Promise<ComboPackage[]> {
    return this.request<ComboPackage[]>('findComboPackages', { minSharedCards })
  }

  async getGraphStatistics(): Promise<GraphStatistics> {
    return this.request<GraphStatistics>('getGraphStatistics')
  }

  async getCombosByColorIdentity(colorIdentity: string): Promise<any> {
    return this.request('getCombosByColorIdentity', { colorIdentity })
  }

  async getRelatedCombos(comboId: string, limit = 10): Promise<any> {
    return this.request('getRelatedCombos', { comboId, limit })
  }

  async getComboPackageById(comboIds: string[], minSharedCards = 2): Promise<ComboPackage> {
    return this.request<ComboPackage>('getComboPackageById', { comboIds, minSharedCards })
  }

  close(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }
}

// Singleton instance
let graphClientInstance: ComboGraphClient | null = null

export function getComboGraphClient(): ComboGraphClient {
  if (!graphClientInstance) {
    // These paths should be configured based on your project structure
    const pythonScriptPath = process.env.COMBO_GRAPH_SCRIPT_PATH || './python/combo_graph_server.py'
    const dataFilePath = process.env.COMBO_GRAPH_DATA_PATH || './data/commander_spellbook_data.json'
    
    graphClientInstance = new ComboGraphClient(pythonScriptPath, dataFilePath)
  }
  return graphClientInstance
}

// Cleanup on process exit
process.on('exit', () => {
  if (graphClientInstance) {
    graphClientInstance.close()
  }
})