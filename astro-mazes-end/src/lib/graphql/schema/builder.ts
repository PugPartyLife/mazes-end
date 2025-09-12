import SchemaBuilder from '@pothos/core'
import DataloaderPlugin from '@pothos/plugin-dataloader'
import type { 
  ComboData, 
  ComboPackage, 
  Distance1Result, 
  GraphStatistics, 
  ComboSearchResult, 
  TournamentResult, 
  RandomCombosResult 
} from '../../graph/comboGraphClient'
import type { 
  TopCommander, 
  TopCardForCommander, 
  CommanderRecommendation,
  Tournament,
  Player,
  Deck,
  Card,
  DeckCard,
  PlayerHistory,
  DatabaseSummary,
  ParsedImageUris,
  CardUsageData,
  DeckReference,
  CardFrequencyChange,
  CardUsageWithDetails
} from '../../../types'

export const builder = new SchemaBuilder<{
  Dataloader: true;
  Objects: {
    TopCommander: TopCommander
    TopCardForCommander: TopCardForCommander
    CommanderRecommendation: CommanderRecommendation
    Tournament: Tournament
    TournamentResult: TournamentResult
    Player: Player
    Deck: Deck
    Card: Card
    DeckCard: DeckCard
    PlayerHistory: PlayerHistory
    DatabaseSummary: DatabaseSummary
    ImageUris: ParsedImageUris
    CardWithStats: any
    DeckBoxData: any
    DeckMetaData: any
    Combo: ComboData
    ComboCard: any
    Distance1ComboResult: Distance1Result
    ComboSearchResult: ComboSearchResult
    CardImportanceResult: any
    ComboPackage: ComboPackage
    ComboGraphStats: GraphStatistics
    Distance1Combo: any
    ComboSummary: any
    RandomCombosResult: RandomCombosResult
    ComboConnection: any
    CardVersatility: any
    ColorCount: any
    CardUsage: CardUsageData
    DeckInfo: DeckReference
    CardFrequencyChange: CardFrequencyChange
    CardUsageWithDetails: CardUsageWithDetails
  }
}>({
  plugins: [DataloaderPlugin],
})