import MtgCard from './MtgCard';
import { mapGraphQLCardToUi } from '../server/cardRowToUi';
import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ChevronDown, Play, SkipForward, Eye, EyeOff } from 'lucide-react';

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
            colorIdentity
            colors
            imageUris {
              normal
            }
          }
        }
      }
    }
  }
`;

// Card display component
const CardDisplay = ({ 
  card, 
  revealed, 
  onReveal,
  index,
  total 
}: { 
  card: ComboData['cards'][0];
  revealed: boolean;
  onReveal: () => void;
  index: number;
  total: number;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-400">
            Card {index + 1} of {total}
          </h4>
          {!revealed && (
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
            <div>
              {card.cardData && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <MtgCard card={mapGraphQLCardToUi(card.cardData)} /> 
                  </div>
                  {/* <p className="text-sm text-gray-400">{card.cardData.typeLine}</p>
                  {card.cardData.oracleText && (
                    <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                      {card.cardData.oracleText}
                    </p>
                  )} */}
                </>
              )}
            </div>
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
  const [quizState, setQuizState] = useState<QuizState>({
    combo: null,
    revealedCards: new Set([0]), // First card always revealed
    showSteps: false,
    showAnswer: false,
    loading: false
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
        setQuizState({
          combo: data.randomCombos.combos[0],
          revealedCards: new Set([0]),
          showSteps: false,
          showAnswer: false,
          loading: false
        });
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

  const { combo, revealedCards, showSteps, showAnswer, loading } = quizState;
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
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Total Mana Required</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-yellow-400">{totalMana}</span>
                    <span className="text-gray-400">mana</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Color Identity</h4>
                  <div className="flex gap-2">
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
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {combo.produces.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Produces</h4>
                  <ul className="space-y-2">
                    {combo.produces.map((prod, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-yellow-400 mr-2">•</span>
                        <span className="text-gray-300">{prod}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                  index={idx}
                  total={combo.cards.length}
                />
              ))}
            </div>

            {/* Action Buttons */}
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
    </section>
  );
}