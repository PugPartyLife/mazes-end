import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';

interface CardFrequencyChange {
  cardName: string;
  month: string;
  previousMonth: string;
  currentFrequency: number;
  previousFrequency: number;
  percentageChange: number;
  absoluteChange: number;
  significanceScore: number;
  card?: {
    imageUris?: {
      small?: string;
      normal?: string;
    };
    manaCost?: string;
    typeLine?: string;
  };
}

export default function CardTrendsPanel() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [trendingUp, setTrendingUp] = useState<CardFrequencyChange[]>([]);
  const [trendingDown, setTrendingDown] = useState<CardFrequencyChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [minChangePercent] = useState(20);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [showAllUp, setShowAllUp] = useState(false);
  const [showAllDown, setShowAllDown] = useState(false);

  // Fetch available months
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query {
                availableMonthsForFrequency
              }
            `
          })
        });
        const { data } = await response.json();
        if (data?.availableMonthsForFrequency) {
          setAvailableMonths(data.availableMonthsForFrequency);
          // Set the most recent month with previous month data
          if (data.availableMonthsForFrequency.length > 1) {
            setSelectedMonth(data.availableMonthsForFrequency[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch months:', error);
      }
    };
    fetchMonths();
  }, []);

  // Fetch trending cards when month changes
  useEffect(() => {
    if (!selectedMonth) return;

    const fetchTrends = async () => {
      setLoading(true);
      try {
        // Fetch cards trending up
        const upResponse = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetTrendingCards($month: String!) {
                trendingCardsForMonth(month: $month, direction: "up", limit: 50) {
                  cardName
                  month
                  previousMonth
                  currentFrequency
                  previousFrequency
                  percentageChange
                  absoluteChange
                  significanceScore
                  card {
                    imageUris {
                      small
                      normal
                    }
                    manaCost
                    typeLine
                  }
                }
              }
            `,
            variables: { month: selectedMonth }
          })
        });

        // Fetch cards trending down
        const downResponse = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetTrendingCards($month: String!) {
                trendingCardsForMonth(month: $month, direction: "down", limit: 50) {
                  cardName
                  month
                  previousMonth
                  currentFrequency
                  previousFrequency
                  percentageChange
                  absoluteChange
                  significanceScore
                  card {
                    imageUris {
                      small
                      normal
                    }
                    manaCost
                    typeLine
                  }
                }
              }
            `,
            variables: { month: selectedMonth }
          })
        });

        const upData = await upResponse.json();
        const downData = await downResponse.json();

        setTrendingUp(upData.data?.trendingCardsForMonth || []);
        setTrendingDown(downData.data?.trendingCardsForMonth || []);
      } catch (error) {
        console.error('Failed to fetch trending cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [selectedMonth]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const renderCardRow = (change: CardFrequencyChange, index: number) => {
    const isPositive = change.percentageChange > 0;
    const icon = isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const bgColorClass = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

    return (
      <div key={index} className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
        {/* Card Image */}
        <div className="w-16 h-20 flex-shrink-0">
          {change.card?.imageUris?.small ? (
            <img 
              src={change.card.imageUris.small} 
              alt={change.cardName}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
              <span className="text-gray-500 text-xs">No Image</span>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="flex-grow">
          <h4 className="font-semibold text-white">{change.cardName}</h4>
          <p className="text-sm text-gray-400">
            {change.card?.typeLine || 'Unknown Type'}
          </p>
        </div>

        {/* Frequency Info */}
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {change.previousFrequency} → {change.currentFrequency} decks
          </div>
          <div className={`flex items-center gap-1 justify-end ${colorClass}`}>
            {icon}
            <span className="font-semibold">
              {change.percentageChange > 0 ? '+' : ''}{change.percentageChange.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Significance Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${bgColorClass} ${colorClass}`}>
          {Math.abs(change.absoluteChange)} decks
        </div>
      </div>
    );
  };

  if (loading && availableMonths.length === 0) {
    return (
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex items-center justify-center text-gray-400">
            Loading card trends data...
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
            Monthly Card <span className="text-yellow-400 font-serif">Trends</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track significant changes in card popularity month-over-month
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-8">
          {/* Month Selector */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-2">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-gray-300 focus:outline-none"
            >
              {availableMonths.slice(0, -1).map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </div>

          {/* Display Limit Selector */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-2">
            <span className="text-sm text-gray-400">Show:</span>
            <select
              value={displayLimit}
              onChange={(e) => {
                setDisplayLimit(Number(e.target.value));
                setShowAllUp(false);
                setShowAllDown(false);
              }}
              className="bg-transparent text-gray-300 focus:outline-none"
            >
              <option value={5}>5 cards</option>
              <option value={10}>10 cards</option>
              <option value={15}>15 cards</option>
              <option value={20}>20 cards</option>
              <option value={25}>25 cards</option>
            </select>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p>
              Showing cards with at least {minChangePercent}% change in usage frequency 
              and included in at least 10 decks for the selected month.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">
            Loading trends for {formatMonth(selectedMonth)}...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trending Up */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-green-500" />
                <h3 className="text-xl font-semibold text-white">Rising in Popularity</h3>
                <span className="text-sm text-gray-400">({trendingUp.length} cards)</span>
              </div>
              <div className="space-y-3">
                {trendingUp.length > 0 ? (
                  <>
                    {(showAllUp ? trendingUp : trendingUp.slice(0, displayLimit)).map((change, index) => renderCardRow(change, index))}
                    {trendingUp.length > displayLimit && (
                      <button
                        onClick={() => setShowAllUp(!showAllUp)}
                        className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {showAllUp ? 'Show Less' : `Show ${trendingUp.length - displayLimit} More`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No cards with significant increases this month
                  </div>
                )}
              </div>
            </div>

            {/* Trending Down */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-6 h-6 text-red-500" />
                <h3 className="text-xl font-semibold text-white">Declining in Popularity</h3>
                <span className="text-sm text-gray-400">({trendingDown.length} cards)</span>
              </div>
              <div className="space-y-3">
                {trendingDown.length > 0 ? (
                  <>
                    {(showAllDown ? trendingDown : trendingDown.slice(0, displayLimit)).map((change, index) => renderCardRow(change, index))}
                    {trendingDown.length > displayLimit && (
                      <button
                        onClick={() => setShowAllDown(!showAllDown)}
                        className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {showAllDown ? 'Show Less' : `Show ${trendingDown.length - displayLimit} More`}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No cards with significant decreases this month
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}