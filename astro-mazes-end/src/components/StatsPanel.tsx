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
  ResponsiveContainer
} from 'recharts';
import { BarChart3, Calendar, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';

const TestChart = () => {
  const testData = [
    { name: 'Mon', value: 10 },
    { name: 'Tue', value: 25 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 30 },
    { name: 'Fri', value: 20 }
  ];

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white mb-4">Test Chart</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={testData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

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

  console.log('Chart data:', chartData);

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
            //domain={['dataMin', 'dataMax']}
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
                <span style={{ color: colors[name] || '#fff' }}>{value}</span>,
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
              <span style={{ color: colors[name] || '#fff' }}>
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

  console.log('Scatter data:', scatterData);

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

// Summary stat component
const SummaryCard = ({ 
  title, 
  value, 
  color 
}: {
  title: string;
  value: number;
  color: string;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
};

// Main Stats Panel Component
export default function StatsPanel() {
  const [selectedRange, setSelectedRange] = useState('30');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentData, setTournamentData] = useState<TournamentResult[]>([]);
  const [totals, setTotals] = useState({ wins: 0, draws: 0, losses: 0 });
  const [chartType, setChartType] = useState<'bar' | 'scatter' | 'percentage'>('bar');
  const [sortBy, setSortBy] = useState<'date' | 'wins' | 'draws' | 'losses'>('date');

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

  // GraphQL query for tournament results
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

  // Fetch tournament data
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
            query: getTournamentResultsQuery(days) 
          })
        });
        
        const { data } = await response.json();
        
        if (data?.tournamentResults) {
          // Filter out invalid entries and ensure all fields have default values
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

          console.log('Fetched tournament results:', validResults);
          
          // Calculate totals
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
      } catch (error) {
        console.error('Failed to fetch tournament results:', error);
        setTournamentData([]);
        setTotals({ wins: 0, draws: 0, losses: 0 });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRange]);

  const currentRange = timeRanges.find(r => r.id === selectedRange);
  const currentSort = sortOptions.find(s => s.id === sortBy);
  const totalGames = totals.wins + totals.draws + totals.losses;
  const winRate = totalGames > 0 ? ((totals.wins / totalGames) * 100).toFixed(1) : '0';

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* <TestChart /> */}

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Tournament <span className="text-yellow-400 font-serif">Results</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track your wins, draws, and losses across tournaments
          </p>
        </div>

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
      </div>
    </section>
  );
}