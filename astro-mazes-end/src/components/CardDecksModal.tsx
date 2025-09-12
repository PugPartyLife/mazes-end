import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Users, Layers } from 'lucide-react';

interface DeckInfo {
  deckId: string;
  deckName: string;
  commanderName: string;
  tournamentName?: string;
  tournamentId?: string;
  playerName?: string;
  standing?: number;
  wins?: number;
  losses?: number;
  draws?: number;
  winRate?: number;
  date?: string;
  totalPlayers?: number;
}

interface CardDecksModalProps {
  cardName: string;
  isOpen: boolean;
  onClose: () => void;
  timeRange: number; // days parameter from parent
}

export default function CardDecksModal({ cardName, isOpen, onClose, timeRange }: CardDecksModalProps) {
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !cardName) return;

    const fetchDecks = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetCardUsage($days: Int!) {
                cardUsage(days: $days) {
                  cardName
                  timesPlayed
                  decks {
                    deckId
                    deckName
                    commanderName
                  }
                }
              }
            `,
            variables: { days: timeRange }
          })
        });

        const { data } = await response.json();
        const cardData = data?.cardUsage?.find((c: any) => c.cardName === cardName);
        
        if (cardData) {
          setDecks(cardData.decks || []);
          setTotalCount(cardData.timesPlayed || 0);
        }
      } catch (error) {
        console.error('Failed to fetch decks for card:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDecks();
  }, [isOpen, cardName, timeRange]);

  if (!isOpen) return null;

  const getOrdinal = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  };

  const parseCommanderFromDeckName = (deckName: string, commanderName: string) => {
    // Extract tournament name and player from deckName format: "Tournament Name - Player Name"
    const parts = deckName.split(' - ');
    const tournamentName = parts[0] || 'Unknown Tournament';
    const playerName = parts[1] || 'Unknown Player';
    
    return { tournamentName, playerName };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-gray-800 rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-xl border border-gray-700">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Decks containing {cardName}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {totalCount} total uses in {decks.length} decks
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
          <div className="overflow-y-auto max-h-[calc(85vh-5rem)] p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                Loading deck information...
              </div>
            ) : decks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {decks.map((deck, index) => {
                  const { tournamentName, playerName } = parseCommanderFromDeckName(deck.deckName, deck.commanderName);
                  const deckUrl = `https://topdeck.gg/decks/${deck.deckId}`;
                  
                  return (
                    <a
                      key={deck.deckId}
                      href={deckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-900 rounded-lg border border-gray-700 p-4 hover:border-yellow-400 transition-colors"
                    >
                      {/* Commander Name */}
                      <div className="mb-3">
                        <h4 className="text-lg font-semibold text-white truncate">
                          {deck.commanderName}
                        </h4>
                      </div>

                      {/* Tournament Info */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                          <Trophy className="w-4 h-4" />
                          <span className="truncate">{tournamentName}</span>
                        </div>
                      </div>

                      {/* Player */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-gray-700 text-gray-200 grid place-items-center text-xs font-bold">
                          {playerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-300 truncate">
                          {playerName}
                        </span>
                      </div>

                      {/* Stats if available */}
                      {deck.standing && (
                        <div className="flex items-center gap-3 text-sm">
                          {deck.standing <= 3 && (
                            <div className="flex items-center gap-1">
                              <Trophy 
                                className={`w-4 h-4 ${
                                  deck.standing === 1 ? 'text-amber-400' : 
                                  deck.standing === 2 ? 'text-gray-300' : 
                                  'text-orange-400'
                                }`} 
                              />
                              <span className="text-gray-300">
                                {getOrdinal(deck.standing)}
                              </span>
                            </div>
                          )}
                          {deck.wins !== undefined && (
                            <span className="text-gray-400">
                              {deck.wins}W-{deck.losses || 0}L{deck.draws ? `-${deck.draws}D` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* View on TopDeck button */}
                      <div className="mt-3 text-xs text-yellow-400 hover:text-yellow-300">
                        View on TopDeck.gg →
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                No decks found containing this card
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}