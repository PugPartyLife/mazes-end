import React, { useState } from 'react';
import { BarChart3, Layers, TrendingUp } from 'lucide-react';
import TournamentStatsPanel from './TournamentStatsPanel';
import CardStatsPanel from './CardStatsPanel';
import CardTrendsPanel from './CardTrendsPanel';

// Main Dashboard Stats Panel Component
export default function StatsPanel() {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'cards' | 'trends'>('tournaments');

  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Performance <span className="text-yellow-400 font-serif">Statistics</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Track your tournament results, card usage patterns, and trending cards
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
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-6 py-2 rounded-md flex items-center gap-2 transition-all ${
                activeTab === 'trends'
                  ? 'bg-yellow-400 text-gray-900 font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Card Trends
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tournaments' ? (
          <TournamentStatsPanel />
        ) : activeTab === 'cards' ? (
          <CardStatsPanel />
        ) : (
          <CardTrendsPanel />
        )}
      </div>
    </section>
  );
}