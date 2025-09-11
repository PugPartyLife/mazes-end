import React, { useState, useEffect } from 'react';
import {
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, ChevronDown, X } from 'lucide-react';

// Types for card data
interface CardUsageData {
  cardName: string;
  timesPlayed: number;
  decks: Array<{
    deckId: string;
    deckName: string;
    commanderName: string;
  }>;
}

interface CardBin {
  range: string;
  minValue: number;
  maxValue: number;
  count: number;
  cards: CardUsageData[];
}

interface TimeRange {
  id: string;
  label: string;
  days: number;
}

// Card list modal component
const CardListModal = ({ 
  bin, 
  onClose 
}: { 
  bin: CardBin | null; 
  onClose: () => void;
}) => {
  if (!bin) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-xl border border-gray-700">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Cards Played {bin.range} Times
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {bin.count} cards in this range
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(80vh-5rem)]">
            <table className="w-full">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Card Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Times Played
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Decks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {bin.cards
                  .sort((a, b) => b.timesPlayed - a.timesPlayed)
                  .map((card, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {card.cardName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {card.timesPlayed}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <details className="cursor-pointer">
                          <summary className="hover:text-yellow-400 transition-colors">
                            {card.decks.length} deck{card.decks.length !== 1 ? 's' : ''}
                          </summary>
                          <div className="mt-2 space-y-1 pl-4">
                            {card.decks.map((deck, deckIndex) => (
                              <div key={deckIndex} className="text-xs">
                                {deck.deckName} ({deck.commanderName})
                              </div>
                            ))}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Card Stats Panel Component
export default function CardStatsPanel() {
  const [selectedRange, setSelectedRange] = useState('30');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<CardUsageData[]>([]);
  const [histogramData, setHistogramData] = useState<CardBin[]>([]);
  const [selectedBin, setSelectedBin] = useState<CardBin | null>(null);
  const [binCount, setBinCount] = useState(20); // Number of bins for histogram

  // Available time ranges
  const timeRanges: TimeRange[] = [
    { id: '7', label: 'Last 7 days', days: 7 },
    { id: '30', label: 'Last 30 days', days: 30 },
    { id: '90', label: 'Last 3 months', days: 90 },
    { id: '365', label: 'Last year', days: 365 },
    { id: 'all', label: 'All time', days: -1 }
  ];

  // GraphQL query for card usage
  const getCardUsageQuery = (days: number) => `
    query GetCardUsage {
      cardUsage(days: ${days}) {
        cardName
        timesPlayed
        decks {
          deckId
          deckName
          commanderName
        }
      }
    }
  `;

  // Create histogram bins using power-law distribution
  const createHistogramBins = (data: CardUsageData[], numberOfBins: number): CardBin[] => {
    if (data.length === 0) return [];

    const maxCount = Math.max(...data.map(card => card.timesPlayed));
    const minCount = Math.min(...data.map(card => card.timesPlayed));
    
    // Use logarithmic scale for power-law distribution
    const logMin = Math.log(minCount || 1);
    const logMax = Math.log(maxCount);
    const logRange = logMax - logMin;
    
    const bins: CardBin[] = [];
    
    for (let i = 0; i < numberOfBins; i++) {
      // Calculate bin boundaries on log scale
      const logStart = logMin + (logRange * i / numberOfBins);
      const logEnd = logMin + (logRange * (i + 1) / numberOfBins);
      
      // Convert back to linear scale
      let minValue = Math.floor(Math.exp(logStart));
      let maxValue = i === numberOfBins - 1 ? maxCount : Math.floor(Math.exp(logEnd));
      
      // Ensure no overlap
      if (i > 0 && bins.length > 0) {
        minValue = Math.max(minValue, bins[bins.length - 1].maxValue + 1);
      }
      
      const cardsInBin = data.filter(card => 
        card.timesPlayed >= minValue && card.timesPlayed <= maxValue
      );

      if (cardsInBin.length > 0) {
        bins.push({
          range: minValue === maxValue ? `${minValue}` : `${minValue}-${maxValue}`,
          minValue,
          maxValue,
          count: cardsInBin.length,
          cards: cardsInBin
        });
      }
    }

    return bins;
  };

  // Fetch card data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const range = timeRanges.find(r => r.id === selectedRange);
        const days = range?.days || 30;
        
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: getCardUsageQuery(days) 
          })
        });
        
        const { data } = await response.json();
        
        if (data?.cardUsage) {
          setCardData(data.cardUsage);
          const bins = createHistogramBins(data.cardUsage, binCount);
          setHistogramData(bins);
        }
      } catch (error) {
        console.error('Failed to fetch card usage data:', error);
        setCardData([]);
        setHistogramData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRange, binCount]);

  const currentRange = timeRanges.find(r => r.id === selectedRange);
  const totalUniqueCards = cardData.length;
  const totalPlayCount = cardData.reduce((sum, card) => sum + card.timesPlayed, 0);

  if (loading) {
    return (
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[600px] flex items-center justify-center text-gray-400">
            Loading card statistics...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Card <span className="text-yellow-400 font-serif">Statistics</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Analyze which cards appear most frequently across your decks
          </p>
        </div>

        {/* Controls Row */}
        <div className="flex justify-between items-center mb-6">
          {/* Bin Count Selector */}
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Bins:</span>
            <select
              value={binCount}
              onChange={(e) => setBinCount(Number(e.target.value))}
              className="px-3 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 focus:border-yellow-400 focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{currentRange?.label}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                {timeRanges.map((range) => (
                  <button
                    key={range.id}
                    onClick={() => {
                      setSelectedRange(range.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                      selectedRange === range.id ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Unique Cards</h3>
            <p className="text-2xl font-bold text-white">{totalUniqueCards}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Card Slots Used</h3>
            <p className="text-2xl font-bold text-yellow-400">{totalPlayCount}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Uses Per Card</h3>
            <p className="text-2xl font-bold text-green-500">
              {totalUniqueCards > 0 ? (totalPlayCount / totalUniqueCards).toFixed(1) : '0'}
            </p>
          </div>
        </div>

        {/* Histogram Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">
              Card Usage Power-Law Distribution
            </h3>
            <span className="text-sm text-gray-400 ml-auto">
              Click a bar to see cards in that range
            </span>
          </div>
          
          {histogramData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                    data={histogramData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                    dataKey="range"
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    label={{ value: 'Times Played', position: 'insideBottom', offset: -40, fill: '#9ca3af' }}
                    />
                    <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af' }}
                    label={{ value: 'Number of Cards', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                    />
                    <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '0.375rem'
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(value: any) => [`${value} cards`, 'Count']}
                    cursor={{ fill: 'rgba(251, 191, 36, 0.1)' }}
                    />
                    <Bar 
                    dataKey="count" 
                    fill="#fbbf24" 
                    cursor="pointer"
                    onClick={(data: any) => {
                        // data is the actual data point
                        setSelectedBin(data);
                    }}
                    >
                    {histogramData.map((entry, index) => (
                        <Cell 
                        key={`cell-${index}`} 
                        fill="#fbbf24"
                        className="hover:opacity-80 transition-opacity"
                        />
                    ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-400">
              No card data available for this time period
            </div>
          )}
        </div>

        {/* Most Played Cards */}
        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Top 10 Most Played Cards
          </h3>
          <div className="space-y-2">
            {cardData
              .sort((a, b) => b.timesPlayed - a.timesPlayed)
              .slice(0, 10)
              .map((card, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <span className="text-white">{card.cardName}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-yellow-400">{card.timesPlayed} times</span>
                    <span className="text-sm text-gray-400">in {card.decks.length} decks</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Card List Modal */}
      <CardListModal 
        bin={selectedBin} 
        onClose={() => setSelectedBin(null)} 
      />
    </section>
  );
}