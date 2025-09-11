import MtgCard from './MtgCard';
import { mapGraphQLCardToUi } from '../server/cardRowToUi';
import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ChevronDown, Play, SkipForward, Eye, EyeOff, Brain, Layers, X } from 'lucide-react';
import ManaText from './ManaText';
import type { ColorId } from '../types/magic';

// Types
interface ComboData {
  id: string;
  cardNames: string[];
  colorIdentity: string;
  produces: string[];
  prerequisites: string[];
  steps: string[];
  cards: Array<{
    name: string;
    combosCount: number;
    cardData?: {
      cardName: string;
      manaCost: string;
      typeLine: string;
      oracleText: string;
      priceUsd: number;
      imageUris?: {
        artCrop: string;
        normal: string;
      };
    };
  }>;
}

interface QuizState {
  combo: ComboData | null;
  revealedCards: Set<number>;
  showSteps: boolean;
  showAnswer: boolean;
  loading: boolean;
  mode: 'quiz' | 'browse';
  selectedCard: ComboData['cards'][0] | null;
}

// GraphQL query for random combos
const getRandomCombosQuery = (maxCards: number, count: number = 1) => `
  query GetRandomCombos {
    randomCombos(maxCards: ${maxCards}, count: ${count}) {
      combos {
        id
        cardNames
        colorIdentity
        produces
        prerequisites
        steps
        cards {
          name
          combosCount
          cardData {
            cardName
            manaCost
            typeLine
            oracleText
            power
            toughness
            rarity
            layout
            priceUsd
            setCode
            setName
            artist
            colorIdentity
            colors
            imageUris {
              artCrop
              normal
            }
          }
        }
      }
    }
  }
`;

// Card Modal Component
const CardModal = ({ 
  card, 
  onClose 
}: { 
  card: ComboData['cards'][0];
  onClose: () => void;
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative my-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-yellow-400 transition-colors p-2 z-10"
          aria-label="Close modal"
        >
          <X className="w-8 h-8" />
        </button>
        
        <div className="flex flex-col items-center gap-6">
          {/* Card at normal size - MtgCard already has max-w-sm */}
          {card.cardData && (
            <div className="w-full flex justify-center">
              <MtgCard card={mapGraphQLCardToUi(card.cardData)} />
            </div>
          )}
          
          {/* Card Info */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full">
            <h3 className="text-xl font-bold text-white mb-3">{card.cardData?.cardName}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Type</p>
                <p className="text-white">{card.cardData?.typeLine}</p>
              </div>
              
              {card.cardData?.manaCost && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Mana Cost</p>
                  <ManaText text={card.cardData.manaCost} size={20} gap={2} inline />
                </div>
              )}
              
              {card.cardData?.priceUsd && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Price</p>
                  <p className="text-white font-medium">${card.cardData.priceUsd.toFixed(2)}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-400 mb-1">Combo Usage</p>
                <p className="text-white">Appears in {card.combosCount} combos</p>
              </div>
            </div>
            
            {card.cardData?.oracleText && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Oracle Text</p>
                <p className="text-gray-300 whitespace-pre-wrap">{card.cardData.oracleText}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Card display component
const CardDisplay = ({ 
  card, 
  revealed, 
  onReveal,
  onCardClick,
  index,
  total,
  mode 
}: { 
  card: ComboData['cards'][0];
  revealed: boolean;
  onReveal: () => void;
  onCardClick: () => void;
  index: number;
  total: number;
  mode: 'quiz' | 'browse';
}) => {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-400">
            Card {index + 1} of {total}
          </h4>
          {!revealed && mode === 'quiz' && (
            <button
              onClick={onReveal}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Reveal
            </button>
          )}
        </div>
        
        {revealed ? (
          <div className="space-y-3">
            {card.cardData && (
              <div 
                className="cursor-pointer group"
                onClick={onCardClick}
              >
                <div className="flex items-center justify-center gap-2 mb-3 overflow-hidden">
                  <div className="w-full max-w-[280px] relative overflow-hidden transform transition-transform group-hover:scale-105">
                    <MtgCard card={mapGraphQLCardToUi(card.cardData)} /> 
                  </div>
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
              Appears in {card.combosCount} combos
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <EyeOff className="w-8 h-8 text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function ComboQuizComponent() {
  const [maxCards, setMaxCards] = useState(2);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    combo: null,
    revealedCards: new Set([0]), // First card always revealed
    showSteps: false,
    showAnswer: false,
    loading: false,
    mode: 'quiz', // Default to quiz mode
    selectedCard: null
  });

  const fetchNewCombo = async () => {
    setQuizState(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: getRandomCombosQuery(maxCards, 1) 
        })
      });
      
      const { data } = await response.json();
      
      if (data?.randomCombos?.combos?.[0]) {
        const combo = data.randomCombos.combos[0];
        const initialRevealedCards = quizState.mode === 'browse' 
          ? new Set(Array.from({ length: combo.cards.length }, (_, i) => i))
          : new Set([0]);
          
        setQuizState(prev => ({
          ...prev,
          combo: combo,
          revealedCards: initialRevealedCards,
          showSteps: prev.mode === 'browse', // Auto-show steps in browse mode
          showAnswer: prev.mode === 'browse', // Auto-show answer in browse mode
          loading: false,
          selectedCard: null
        }));
      }
    } catch (error) {
      console.error('Failed to fetch combo:', error);
      setQuizState(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchNewCombo();
  }, [maxCards]);

  const revealCard = (index: number) => {
    setQuizState(prev => ({
      ...prev,
      revealedCards: new Set([...prev.revealedCards, index])
    }));
  };

  const revealAllCards = () => {
    if (!quizState.combo) return;
    const allIndices = Array.from({ length: quizState.combo.cards.length }, (_, i) => i);
    setQuizState(prev => ({
      ...prev,
      revealedCards: new Set(allIndices)
    }));
  };

  const switchMode = (newMode: 'quiz' | 'browse') => {
    if (!quizState.combo) return;
    
    const newRevealedCards = newMode === 'browse'
      ? new Set(Array.from({ length: quizState.combo.cards.length }, (_, i) => i))
      : new Set([0]);
      
    setQuizState(prev => ({
      ...prev,
      mode: newMode,
      revealedCards: newRevealedCards,
      showSteps: newMode === 'browse', // Auto-show in browse mode
      showAnswer: newMode === 'browse' // Auto-show in browse mode
    }));
    setModeDropdownOpen(false);
  };

  const { combo, revealedCards, showSteps, showAnswer, loading, mode, selectedCard } = quizState;
  const totalMana = combo ? 
    combo.cards.reduce((sum, card) => {
      const match = card.cardData?.manaCost?.match(/\{(\d+)\}/);
      const genericMana = match ? parseInt(match[1]) : 0;
      const coloredMana = (card.cardData?.manaCost?.match(/\{[WUBRG]\}/g) || []).length;
      return sum + genericMana + coloredMana;
    }, 0) : 0;

  return (
    <section className="py-20 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Combo <span className="text-yellow-400 font-serif">Quiz</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Test your knowledge of Magic combo mechanics. Can you figure out how these cards work together?
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

          {/* Card Count Selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
            >
              <span>Max {maxCards} cards</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-40 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setMaxCards(num);
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg ${
                      maxCards === num ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    Max {num} cards
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchNewCombo}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            New Combo
          </button>
        </div>

        {/* Quiz Content */}
        {loading && !combo ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          </div>
        ) : combo ? (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Given Information */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Given Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-200 mb-2">Total Mana Required</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-yellow-400">{totalMana}</span>
                    <span className="text-gray-400">mana</span>
                    {combo.colorIdentity.split('').map((color, idx) => (
                      <span
                        key={idx}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md
                          ${color === 'W' ? 'bg-yellow-100 text-gray-800' : ''}
                          ${color === 'U' ? 'bg-blue-500 text-white' : ''}
                          ${color === 'B' ? 'bg-gray-800 text-white ring-1 ring-gray-600' : ''}
                          ${color === 'R' ? 'bg-red-500 text-white' : ''}
                          ${color === 'G' ? 'bg-green-500 text-white' : ''}
                        `}
                      >
                      <ManaText
                        text={`{${color as ColorId}}`}
                        size={48}
                        inline={true}
                      />
                      </span>
                    ))}
                  </div>
                </div>
              
                {combo.produces.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-200 mb-2">Produces:</h4>
                    <ul className="space-y-2">
                      {combo.produces.map((prod, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-yellow-400 mr-2">•</span>
                          <span className="text-gray-400">{prod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {combo.prerequisites.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Prerequisites</h4>
                  <ul className="space-y-2">
                    {combo.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-yellow-400 mr-2">•</span>
                        <span className="text-gray-300">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {combo.cards.map((card, idx) => (
                <CardDisplay
                  key={idx}
                  card={card}
                  revealed={revealedCards.has(idx)}
                  onReveal={() => revealCard(idx)}
                  onCardClick={() => setQuizState(prev => ({ ...prev, selectedCard: card }))}
                  index={idx}
                  total={combo.cards.length}
                  mode={mode}
                />
              ))}
            </div>

            {/* Action Buttons - Only show in quiz mode */}
            {mode === 'quiz' && (
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={revealAllCards}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Reveal All Cards
                </button>
                
                <button
                  onClick={() => setQuizState(prev => ({ ...prev, showSteps: !prev.showSteps }))}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {showSteps ? 'Hide' : 'Show'} Steps
                </button>
                
                <button
                  onClick={() => setQuizState(prev => ({ ...prev, showAnswer: !prev.showAnswer }))}
                  className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-medium flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  {showAnswer ? 'Hide' : 'Reveal'} Answer
                </button>
              </div>
            )}

            {/* Steps */}
            {showSteps && combo.steps.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Combo Steps</h3>
                <ol className="space-y-3">
                  {combo.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-yellow-400 font-bold mr-3">{idx + 1}.</span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Answer */}
            {showAnswer && (
              <div className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 rounded-lg border border-yellow-600/30 p-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4">What This Combo Produces</h3>
                <div className="space-y-2">
                  {combo.produces.map((result, idx) => (
                    <div key={idx} className="flex items-center">
                      <span className="text-yellow-400 mr-2">✨</span>
                      <span className="text-white font-medium">{result}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            No combo available. Try clicking "New Combo".
          </div>
        )}
      </div>
      
      {/* Card Modal */}
      {selectedCard && (
        <CardModal 
          card={selectedCard}
          onClose={() => setQuizState(prev => ({ ...prev, selectedCard: null }))}
        />
      )}
    </section>
  );
}