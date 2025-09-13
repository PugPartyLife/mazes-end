import InteractiveMtgCard from './InteractiveMtgCard';
import { mapGraphQLCardToUi } from '../server/cardRowToUi';
import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ChevronDown, Eye, EyeOff, Brain, Layers, X, HelpCircle } from 'lucide-react';
import ManaText from './ManaText';

// Types
interface CardQuizData {
  card: {
    cardName: string;
    manaCost: string;
    typeLine: string;
    oracleText: string;
    power?: string;
    toughness?: string;
    priceUsd: number;
    colorIdentity: string[];
    rarity: string;
    setName: string;
    artist: string;
    imageUris?: {
      artCrop: string;
      normal: string;
    };
  };
}

interface QuizState {
  card: CardQuizData | null;
  revealedSections: Set<string>;
  showAnswer: boolean;
  loading: boolean;
  mode: 'quiz' | 'browse';
}

type RevealSection = 'image' | 'manaCost' | 'typeLine' | 'oracleText' | 'stats' | 'rarity' | 'artist';

// GraphQL query for random cards
const getRandomCardsQuery = (count: number = 1) => `
  query GetRandomCards {
    randomCards(count: ${count}, excludeBasicLands: true) {
      cardName
      manaCost
      typeLine
      oracleText
      power
      toughness
      priceUsd
      colorIdentity
      rarity
      setName
      artist
      imageUris {
        artCrop
        normal
      }
    }
  }
`;

export default function CardQuizComponent() {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    card: null,
    revealedSections: new Set([]), // Start with nothing revealed in quiz mode
    showAnswer: false,
    loading: false,
    mode: 'quiz',
  });

  const fetchNewCard = async () => {
    setQuizState(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: getRandomCardsQuery(1) 
        })
      });
      
      const { data } = await response.json();
      
      if (data?.randomCards?.[0]) {
        const card = data.randomCards[0];
        const initialRevealedSections = quizState.mode === 'browse' 
          ? new Set<string>(['image', 'manaCost', 'typeLine', 'oracleText', 'stats', 'rarity', 'artist', 'price', 'name'])
          : new Set<string>([]);
          
        setQuizState(prev => ({
          ...prev,
          card: { card },
          revealedSections: initialRevealedSections,
          showAnswer: prev.mode === 'browse',
          loading: false,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch card:', error);
      setQuizState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchNewCard();
  }, []);

  const revealSection = (section: RevealSection | string) => {
    setQuizState(prev => ({
      ...prev,
      revealedSections: new Set([...prev.revealedSections, section])
    }));
  };

  const revealAllHints = () => {
    setQuizState(prev => ({
      ...prev,
      revealedSections: new Set(['image', 'manaCost', 'typeLine', 'oracleText', 'stats', 'rarity', 'artist', 'price', 'name'])
    }));
  };

  const switchMode = (newMode: 'quiz' | 'browse') => {
    const newRevealedSections = newMode === 'browse'
      ? new Set<string>(['image', 'manaCost', 'typeLine', 'oracleText', 'stats', 'rarity', 'artist', 'price', 'name'])
      : new Set<string>([]);
      
    setQuizState(prev => ({
      ...prev,
      mode: newMode,
      revealedSections: newRevealedSections,
      showAnswer: newMode === 'browse'
    }));
    setModeDropdownOpen(false);
  };

  const { card, revealedSections, showAnswer, loading, mode } = quizState;

  return (
    <section className="py-20 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Card <span className="text-yellow-400 font-serif">Quiz</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Can you identify the Magic card from its artwork and hints?
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 mb-8">
          {/* Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
            >
              {mode === 'quiz' ? (
                <>
                  <Brain className="w-4 h-4" />
                  <span>Quiz Mode</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Browse Mode</span>
                </>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${modeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {modeDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                <button
                  onClick={() => switchMode('quiz')}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-700 rounded-t-lg flex items-center gap-2 ${
                    mode === 'quiz' ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Quiz Mode
                </button>
                <button
                  onClick={() => switchMode('browse')}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-700 rounded-b-lg flex items-center gap-2 ${
                    mode === 'browse' ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Browse Mode
                </button>
              </div>
            )}
          </div>

          <button
            onClick={fetchNewCard}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            New Card
          </button>
        </div>

        {/* Quiz Content */}
        {loading && !card ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : card ? (
          <div className="space-y-6">
            {/* Main Card Panel */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-6 text-center">
                <HelpCircle className="inline w-5 h-5 mr-2" />
                Guess the Card
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Interactive Card */}
                <div className="flex justify-center">
                  {card.card.imageUris ? (
                    <div className="w-full max-w-sm">
                      <InteractiveMtgCard 
                        card={mapGraphQLCardToUi(card.card)} 
                        interactive={mode === 'quiz'}
                        revealedSections={revealedSections}
                        onRevealSection={revealSection}
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-96 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">No image available</span>
                    </div>
                  )}
                </div>

                {/* Right Column - Hints and Controls */}
                <div className="space-y-4">
                  {/* Quick reveal buttons in quiz mode */}
                  {mode === 'quiz' && (
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Quick Reveals</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => revealSection('image')}
                          disabled={revealedSections.has('image')}
                          className={`px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors ${
                            revealedSections.has('image') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Art
                        </button>
                        <button
                          onClick={() => revealSection('manaCost')}
                          disabled={revealedSections.has('manaCost')}
                          className={`px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors ${
                            revealedSections.has('manaCost') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Mana Cost
                        </button>
                        <button
                          onClick={() => revealSection('typeLine')}
                          disabled={revealedSections.has('typeLine')}
                          className={`px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors ${
                            revealedSections.has('typeLine') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Type
                        </button>
                        <button
                          onClick={() => revealSection('oracleText')}
                          disabled={revealedSections.has('oracleText')}
                          className={`px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors ${
                            revealedSections.has('oracleText') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Oracle Text
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Additional hints that aren't on the card */}
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Additional Hints</h4>
                    <div className="space-y-3">
                      {/* Rarity */}
                      {!revealedSections.has('rarity') && mode === 'quiz' ? (
                        <button
                          onClick={() => revealSection('rarity')}
                          className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Rarity & Set</span>
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          </div>
                        </button>
                      ) : (
                        revealedSections.has('rarity') && (
                          <div className="p-3 bg-gray-700 rounded">
                            <p className="text-xs text-gray-400 mb-1">Rarity & Set</p>
                            <p>
                              <span className={`font-medium ${
                                card.card.rarity === 'mythic' ? 'text-orange-500' :
                                card.card.rarity === 'rare' ? 'text-yellow-500' :
                                card.card.rarity === 'uncommon' ? 'text-gray-400' :
                                'text-gray-500'
                              }`}>
                                {card.card.rarity.charAt(0).toUpperCase() + card.card.rarity.slice(1)}
                              </span>
                              <span className="text-gray-400"> • {card.card.setName}</span>
                            </p>
                          </div>
                        )
                      )}

                      {/* Price */}
                      {!revealedSections.has('price') && mode === 'quiz' ? (
                        <button
                          onClick={() => revealSection('price')}
                          className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Price</span>
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          </div>
                        </button>
                      ) : (
                        revealedSections.has('price') && (
                          <div className="p-3 bg-gray-700 rounded">
                            <p className="text-xs text-gray-400 mb-1">Price</p>
                            <p className="text-white font-medium">
                              ${card.card.priceUsd ? card.card.priceUsd.toFixed(2) : '—'}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {mode === 'quiz' && (
                    <div className="space-y-2">
                      <button
                        onClick={revealAllHints}
                        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center justify-center gap-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Reveal All Hints
                      </button>
                      
                      <button
                        onClick={() => {
                          setQuizState(prev => ({ 
                            ...prev, 
                            showAnswer: !prev.showAnswer,
                            revealedSections: prev.showAnswer 
                              ? prev.revealedSections 
                              : new Set([...prev.revealedSections, 'name'])
                          }));
                        }}
                        className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        {showAnswer ? 'Hide' : 'Reveal'} Answer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Answer */}
            {showAnswer && (
              <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 rounded-lg border border-yellow-600/30 p-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">The Card Is...</h3>
                <div className="space-y-3">
                  <div className="text-2xl font-bold text-white">{card.card.cardName}</div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-400">Color Identity: </span>
                      <span className="text-white">
                        {card.card.colorIdentity.length > 0 ? (
                          <div className="inline-flex gap-1">
                            {card.card.colorIdentity.map((color, idx) => (
                              <ManaText
                                key={idx}
                                text={`{${color}}`}
                                size={16}
                                inline={true}
                              />
                            ))}
                          </div>
                        ) : (
                          'Colorless'
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Artist: </span>
                      <span className="text-white">{card.card.artist}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            No card available. Try clicking "New Card".
          </div>
        )}
      </div>
    </section>
  );
}