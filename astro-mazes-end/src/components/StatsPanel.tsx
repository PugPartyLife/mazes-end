import React, { useState, useEffect } from 'react';
import {
  ScatterChart,
  Scatter,
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
import { BarChart3, Calendar, ChevronDown, TrendingUp, TrendingDown, Layers, X } from 'lucide-react';

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

// Types for tournament data
interface TournamentResult {
  date: string;
  tournamentName: string;
  wins: number;
  draws: number;
  losses: number;
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

// Summary stat component
const SummaryCard = ({ 
  title, 
  value, 
  color 
}: {
  title: string;
  value: number | string;
  color: string;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
};

// Dumb component for displaying tournament results
const TournamentResultsChart = ({ 
  data,
  loading = false,
  sortBy = 'date'
}: {
  data: TournamentResult[];
  loading?: boolean;
  sortBy?: 'date' | 'wins' | 'draws' | 'losses';
}) => {
  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Loading tournament data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No tournament data available for this time period
      </div>
    );
  }

  // Transform and sort data for bar chart
  const chartData = data
    .filter(tournament => {
      // Validate date exists and is parseable
      if (!tournament.date) return false;
      const date = new Date(tournament.date);
      return !isNaN(date.getTime());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'wins':
          return b.wins - a.wins;
        case 'draws':
          return b.draws - a.draws;
        case 'losses':
          return b.losses - a.losses;
        case 'date':
        default:
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    })
    .map(tournament => ({
      name: new Date(tournament.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      fullDate: tournament.date,
      tournamentName: tournament.tournamentName,
      Wins: tournament.wins || 0,
      Draws: tournament.draws || 0,
      Losses: tournament.losses || 0
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No valid tournament data to display
      </div>
    );
  }

  try {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="tournamentName"
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            allowDataOverflow={true}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af' }}
            label={{ value: 'Games', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '0.375rem'
            }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value: any, name: string) => {
              const colors: Record<string, string> = {
                Wins: '#10b981',
                Draws: '#fbbf24', 
                Losses: '#f87171'
              };
              return [
                <span key={name} style={{ color: colors[name] || '#fff' }}>{value}</span>,
                name
              ];
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                const item = payload[0].payload;
                return `${item.tournamentName} (${item.name})`;
              }
              return label;
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar dataKey="Wins" fill="#10b981" />
          <Bar dataKey="Draws" fill="#fbbf24" />
          <Bar dataKey="Losses" fill="#f87171" />
        </BarChart>
      </ResponsiveContainer>
    );
  } catch (error) {
    console.error('Chart rendering error:', error);
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Error rendering chart. Please check the console for details.
      </div>
    );
  }
};

// Stacked percentage chart component
const TournamentPercentageChart = ({ 
  data,
  loading = false,
  sortBy = 'date'
}: {
  data: TournamentResult[];
  loading?: boolean;
  sortBy?: 'date' | 'wins' | 'draws' | 'losses';
}) => {
  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Loading tournament data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No tournament data available for this time period
      </div>
    );
  }

  // First calculate percentages
  const dataWithPercentages = data
    .filter(tournament => {
      if (!tournament.date) return false;
      const date = new Date(tournament.date);
      return !isNaN(date.getTime());
    })
    .map(tournament => {
      const total = tournament.wins + tournament.draws + tournament.losses;
      if (total === 0) return null;
      
      return {
        ...tournament,
        winPercentage: (tournament.wins / total) * 100,
        drawPercentage: (tournament.draws / total) * 100,
        lossPercentage: (tournament.losses / total) * 100,
        total
      };
    })
    .filter(item => item !== null);

  // Then sort based on percentages if sorting by wins/draws/losses
  const sortedData = dataWithPercentages.sort((a, b) => {
    if (!a || !b) return 0;
    switch (sortBy) {
      case 'wins':
        return b.winPercentage - a.winPercentage;
      case 'draws':
        return b.drawPercentage - a.drawPercentage;
      case 'losses':
        return b.lossPercentage - a.lossPercentage;
      case 'date':
      default:
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
  });

  // Finally transform for chart display
  const percentageData = sortedData.map(tournament => {
    if (!tournament) return null;
    
    return {
      name: new Date(tournament.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      fullDate: tournament.date,
      tournamentName: tournament.tournamentName,
      Wins: tournament.winPercentage.toFixed(1),
      Draws: tournament.drawPercentage.toFixed(1),
      Losses: tournament.lossPercentage.toFixed(1),
      totalGames: tournament.total,
      rawWins: tournament.wins,
      rawDraws: tournament.draws,
      rawLosses: tournament.losses
    };
  }).filter(item => item !== null);

  if (percentageData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No valid tournament data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart 
        data={percentageData} 
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="tournamentName"
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          angle={-45}
          textAnchor="end"
        />
        <YAxis 
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af' }}
          label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '0.375rem'
          }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(value: any, name: string, props: any) => {
            const colors: Record<string, string> = {
              Wins: '#10b981',
              Draws: '#fbbf24', 
              Losses: '#f87171'
            };
            const rawValue = props.payload[`raw${name}`];
            return [
              <span key={name} style={{ color: colors[name] || '#fff' }}>
                {value}% ({rawValue})
              </span>,
              name
            ];
          }}
          labelFormatter={(label, payload) => {
            if (payload && payload[0]) {
              const item = payload[0].payload;
              return (
                <div>
                  <div>{item.tournamentName}</div>
                  <div className="text-xs text-gray-400">{item.name} • {item.totalGames} total games</div>
                </div>
              );
            }
            return label;
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="square"
        />
        <Bar dataKey="Wins" stackId="a" fill="#10b981" />
        <Bar dataKey="Draws" stackId="a" fill="#fbbf24" />
        <Bar dataKey="Losses" stackId="a" fill="#f87171" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Scatter plot component for tournament results
const TournamentScatterPlot = ({ 
  data,
  loading = false
}: {
  data: TournamentResult[];
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        Loading tournament data...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-gray-400">
        No tournament data available for this time period
      </div>
    );
  }

  // Transform data for scatter plot
  const scatterData = data
    .filter(tournament => {
      if (!tournament.date) return false;
      const date = new Date(tournament.date);
      return !isNaN(date.getTime());
    })
    .flatMap(tournament => {
      const dateTimestamp = new Date(tournament.date).getTime();
      return [
        { 
          x: dateTimestamp, 
          y: tournament.wins, 
          type: 'Wins',
          tournamentName: tournament.tournamentName,
          date: tournament.date
        },
        { 
          x: dateTimestamp, 
          y: tournament.draws, 
          type: 'Draws',
          tournamentName: tournament.tournamentName,
          date: tournament.date
        },
        { 
          x: dateTimestamp, 
          y: tournament.losses, 
          type: 'Losses',
          tournamentName: tournament.tournamentName,
          date: tournament.date
        }
      ];
    });

  // Group by type for separate scatter series
  const winsData = scatterData.filter(d => d.type === 'Wins');
  const drawsData = scatterData.filter(d => d.type === 'Draws');
  const lossesData = scatterData.filter(d => d.type === 'Losses');

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          type="number"
          dataKey="x"
          domain={['dataMin', 'dataMax']}
          stroke="#9ca3af"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          tickFormatter={(unixTime) => {
            return new Date(unixTime).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            });
          }}
        />
        <YAxis 
          type="number"
          stroke="#9ca3af"
          dataKey="y"
          tick={{ fill: '#9ca3af' }}
          label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '0.375rem'
          }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(value: any, name: string) => [value, name]}
          labelFormatter={(value) => {
            const item = scatterData.find(d => d.x === value);
            if (item) {
              const date = new Date(item.date).toLocaleDateString();
              return `${item.tournamentName} (${date})`;
            }
            return '';
          }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Scatter name="Wins" data={winsData} fill="#10b981" />
        <Scatter name="Draws" data={drawsData} fill="#fbbf24" />
        <Scatter name="Losses" data={lossesData} fill="#f87171" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

// Main Stats Panel Component with tabs
export default function StatsPanel() {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'cards'>('tournaments');
  const [selectedRange, setSelectedRange] = useState('30');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentData, setTournamentData] = useState<TournamentResult[]>([]);
  const [totals, setTotals] = useState({ wins: 0, draws: 0, losses: 0 });
  const [chartType, setChartType] = useState<'bar' | 'scatter' | 'percentage'>('bar');
  const [sortBy, setSortBy] = useState<'date' | 'wins' | 'draws' | 'losses'>('date');

  // Card stats state
  const [cardData, setCardData] = useState<CardUsageData[]>([]);
  const [histogramData, setHistogramData] = useState<CardBin[]>([]);
  const [selectedBin, setSelectedBin] = useState<CardBin | null>(null);
  const [binCount, setBinCount] = useState(10);

  // Available time ranges
  const timeRanges: TimeRange[] = [
    { id: '7', label: 'Last 7 days', days: 7 },
    { id: '30', label: 'Last 30 days', days: 30 },
    { id: '90', label: 'Last 3 months', days: 90 },
    { id: '365', label: 'Last year', days: 365 },
    { id: 'all', label: 'All time', days: -1 }
  ];

  // Sort options
  const sortOptions = [
    { id: 'date', label: 'Date', icon: Calendar },
    { id: 'wins', label: 'Wins', color: 'text-green-500' },
    { id: 'draws', label: 'Draws', color: 'text-amber-400' },
    { id: 'losses', label: 'Losses', color: 'text-red-400' }
  ];

  // GraphQL queries
  const getTournamentResultsQuery = (days: number) => `
    query GetTournamentResults {
      tournamentResults(days: ${days}) {
        date
        tournamentName
        wins
        draws
        losses
      }
    }
  `;

  // TODO: This query needs to be implemented in your GraphQL schema
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

  // Create histogram bins
  const createHistogramBins = (data: CardUsageData[], numberOfBins: number): CardBin[] => {
    if (data.length === 0) return [];

    const maxCount = Math.max(...data.map(card => card.timesPlayed));
    const minCount = Math.min(...data.map(card => card.timesPlayed));
    
    // Use logarithmic binning for power-law distributed data
    const useLogBins = maxCount / minCount > 10; // Use log bins if range is large
    
    console.log('Histogram binning:', { minCount, maxCount, ratio: maxCount/minCount, useLogBins });
    
    const bins: CardBin[] = [];
    
    if (useLogBins && minCount > 0) {
      // Logarithmic bins
      const logMin = Math.log10(minCount);
      const logMax = Math.log10(maxCount);
      const logStep = (logMax - logMin) / numberOfBins;
      
      for (let i = 0; i < numberOfBins; i++) {
        const logLower = logMin + (i * logStep);
        const logUpper = logMin + ((i + 1) * logStep);
        const minValue = Math.floor(Math.pow(10, logLower));
        const maxValue = i === numberOfBins - 1 ? maxCount : Math.floor(Math.pow(10, logUpper));
        
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
    } else {
      // Linear bins (original implementation)
      const binSize = Math.ceil((maxCount - minCount + 1) / numberOfBins);
      
      for (let i = 0; i < numberOfBins; i++) {
        const minValue = minCount + (i * binSize);
        const maxValue = i === numberOfBins - 1 ? maxCount : minCount + ((i + 1) * binSize) - 1;
        
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
    }

    console.log('Created bins:', bins);
    return bins;
  };

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const range = timeRanges.find(r => r.id === selectedRange);
        const days = range?.days || 30;
        
        if (activeTab === 'tournaments') {
          const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              query: getTournamentResultsQuery(days) 
            })
          });
          
          const { data } = await response.json();
          
          if (data?.tournamentResults) {
            const validResults = data.tournamentResults
              .filter((t: TournamentResult) => t.date)
              .map((t: TournamentResult) => ({
                date: t.date,
                tournamentName: t.tournamentName || 'Unknown Tournament',
                wins: t.wins || 0,
                draws: t.draws || 0,
                losses: t.losses || 0
              }));
            
            setTournamentData(validResults);
            
            const totals = validResults.reduce(
              (acc: any, tournament: TournamentResult) => ({
                wins: acc.wins + tournament.wins,
                draws: acc.draws + tournament.draws,
                losses: acc.losses + tournament.losses
              }),
              { wins: 0, draws: 0, losses: 0 }
            );
            setTotals(totals);
          }
        } else if (activeTab === 'cards') {
          // TODO: Uncomment this when cardUsage query is implemented
          
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
          
          
          // Mock data for demonstration
          //console.log('Card usage query not yet implemented in GraphQL schema');
          //setCardData([]);
          //setHistogramData([]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        if (activeTab === 'tournaments') {
          setTournamentData([]);
          setTotals({ wins: 0, draws: 0, losses: 0 });
        } else {
          setCardData([]);
          setHistogramData([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRange, activeTab, binCount]);

  const currentRange = timeRanges.find(r => r.id === selectedRange);
  const currentSort = sortOptions.find(s => s.id === sortBy);
  const totalGames = totals.wins + totals.draws + totals.losses;
  const winRate = totalGames > 0 ? ((totals.wins / totalGames) * 100).toFixed(1) : '0';

  const totalUniqueCards = cardData.length;
  const totalPlayCount = cardData.reduce((sum, card) => sum + card.timesPlayed, 0);

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Performance <span className="text-yellow-400 font-serif">Statistics</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track your tournament results and card usage patterns
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`px-6 py-2 rounded-md flex items-center gap-2 transition-all ${
                activeTab === 'tournaments'
                  ? 'bg-yellow-400 text-gray-900 font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tournament Results
            </button>
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-6 py-2 rounded-md flex items-center gap-2 transition-all ${
                activeTab === 'cards'
                  ? 'bg-yellow-400 text-gray-900 font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              Card Statistics
            </button>
          </div>
        </div>

        {/* Tournament Tab Content */}
        {activeTab === 'tournaments' && (
          <>
            {/* Controls Row */}
            <div className="flex justify-between items-center mb-6">
              {/* Chart Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${
                    chartType === 'bar' 
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Bar Chart
                </button>
                <button
                  onClick={() => setChartType('scatter')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${
                    chartType === 'scatter' 
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="6" cy="18" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="18" cy="6" r="2"/>
                  </svg>
                  Scatter Plot
                </button>
                <button
                  onClick={() => setChartType('percentage')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 border ml-4 ${
                    chartType === 'percentage' 
                      ? 'bg-yellow-400 text-gray-900 border-yellow-400' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 10h10M7 14h10" />
                  </svg>
                  Percentage
                </button>
              </div>

              {/* Right side controls */}
              <div className="flex gap-2">
                {/* Sort Selector - Only show for bar and percentage charts */}
                {chartType !== 'scatter' && (
                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
                    >
                      <TrendingDown className="w-4 h-4" />
                      <span>Sort: {currentSort?.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {sortDropdownOpen && (
                      <div className="absolute top-full mt-2 right-0 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                        {sortOptions.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id as 'date' | 'wins' | 'draws' | 'losses');
                              setSortDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                              sortBy === option.id ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            {option.icon ? (
                              <option.icon className="w-4 h-4" />
                            ) : (
                              <span className={`w-4 h-4 rounded-full inline-block ${option.color}`} style={{
                                backgroundColor: option.color === 'text-green-500' ? '#10b981' : 
                                               option.color === 'text-amber-400' ? '#fbbf24' : 
                                               option.color === 'text-red-400' ? '#f87171' : 'transparent'
                              }} />
                            )}
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Time Range Selector */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
                  >
                    <Calendar className="w-4 h-4" />
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
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard title="Total Wins" value={totals.wins} color="text-green-500" />
              <SummaryCard title="Total Draws" value={totals.draws} color="text-amber-400" />
              <SummaryCard title="Total Losses" value={totals.losses} color="text-red-400" />
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Win Rate</h3>
                <p className="text-2xl font-bold text-white">{winRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{totalGames} total games</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">
                  Results by Tournament {chartType === 'scatter' ? '(Timeline View)' : chartType === 'percentage' ? '(Normalized View)' : ''}
                  {sortBy !== 'date' && chartType !== 'scatter' ? ` - Sorted by ${currentSort?.label}` : ''}
                </h3>
              </div>
              
              {chartType === 'bar' ? (
                <TournamentResultsChart 
                  data={tournamentData}
                  loading={loading}
                  sortBy={sortBy}
                />
              ) : chartType === 'scatter' ? (
                <TournamentScatterPlot 
                  data={tournamentData}
                  loading={loading}
                />
              ) : (
                <TournamentPercentageChart 
                  data={tournamentData}
                  loading={loading}
                  sortBy={sortBy}
                />
              )}
            </div>
          </>
        )}

        {/* Cards Tab Content */}
        {activeTab === 'cards' && (() => {
          // Calculate statistics inside the cards tab
          let mean = 0;
          let median = 0;
          let stdDev = 0;
          let percentile90 = 0;
          let giniCoefficient = 0;
          let topCardShare = 0;
          
          if (cardData.length > 0) {
            const values = cardData.map(card => card.timesPlayed).sort((a, b) => a - b);
            
            // Mean
            mean = totalPlayCount / totalUniqueCards;
            
            // Median
            const mid = Math.floor(values.length / 2);
            median = values.length % 2 === 0
              ? (values[mid - 1] + values[mid]) / 2
              : values[mid];
            
            // Standard Deviation
            const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
            stdDev = Math.sqrt(variance);
            
            // 90th percentile
            const p90Index = Math.floor(values.length * 0.9);
            percentile90 = values[p90Index];
            
            // Top 10% share (useful for power law distributions)
            const top10PercentCount = Math.ceil(values.length * 0.1);
            const top10PercentSum = values.slice(-top10PercentCount).reduce((sum, val) => sum + val, 0);
            topCardShare = (top10PercentSum / totalPlayCount) * 100;
            
            // Gini coefficient (inequality measure)
            let sumOfDifferences = 0;
            for (let i = 0; i < values.length; i++) {
              for (let j = 0; j < values.length; j++) {
                sumOfDifferences += Math.abs(values[i] - values[j]);
              }
            }
            giniCoefficient = sumOfDifferences / (2 * values.length * totalPlayCount);
          }

          return (
            <>
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

              {/* Summary Stats - Two Rows */}
              <div className="space-y-4 mb-8">
                {/* First Row - Basic Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Top Card Cutoff</h3>
                    <p className="text-2xl font-bold text-white">{totalUniqueCards}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Total Appearances</h3>
                    <p className="text-2xl font-bold text-yellow-400">{totalPlayCount}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Mean</h3>
                    <p className="text-2xl font-bold text-green-500">{mean.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Median</h3>
                    <p className="text-2xl font-bold text-blue-500">{median.toFixed(1)}</p>
                  </div>
                </div>
                
                {/* Second Row - Distribution Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Std Dev</h3>
                    <p className="text-2xl font-bold text-purple-500">{stdDev.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">90th Percentile</h3>
                    <p className="text-2xl font-bold text-orange-500">{percentile90}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Top 10% Share</h3>
                    <p className="text-2xl font-bold text-red-500">{topCardShare.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Gini Coefficient</h3>
                    <p className="text-2xl font-bold text-cyan-500">{giniCoefficient.toFixed(3)}</p>
                  </div>
                </div>
              </div>

              {/* Distribution Note */}
              {mean > median * 1.5 && (
                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-8">
                  <p className="text-yellow-400 text-sm">
                    <strong>Power Law Distribution Detected:</strong> Your card usage follows a heavy-tailed distribution where a few cards dominate. 
                    The top 10% of cards account for {topCardShare.toFixed(0)}% of all usage. Switched to logarithmic scale visualization for better insight.
                  </p>
                </div>
              )}

              {/* Loading indicator */}
              {loading && (
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-8">
                  <p className="text-blue-400 text-sm">
                    Loading card usage data...
                  </p>
                </div>
              )}

              {/* Histogram Chart */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Card Usage Distribution
                  </h3>
                  <span className="text-sm text-gray-400 ml-auto">
                    Click a bar to see cards in that range
                  </span>
                </div>
                
                {loading ? (
                  <div className="h-[400px] flex items-center justify-center text-gray-400">
                    Loading card statistics...
                  </div>
                ) : histogramData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart 
                      data={histogramData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="range"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        label={{ value: 'Times Played', position: 'insideBottom', offset: -10, fill: '#9ca3af' }}
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
                      >
                        {histogramData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill="#fbbf24"
                            className="hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedBin(entry)}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-gray-400">
                    No card data available for this time period.
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
                        <span className="text-yellow-400">{card.timesPlayed} times</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Card List Modal */}
      <CardListModal 
        bin={selectedBin} 
        onClose={() => setSelectedBin(null)} 
      />
    </section>
  );
}