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

type DifficultyLevel = 'staples' | 'playable' | 'unrestricted';

interface QuizState {
  card: CardQuizData | null;
  revealedSections: Set<string>;
  showAnswer: boolean;
  loading: boolean;
  mode: 'quiz' | 'browse';
  difficulty: DifficultyLevel;
  score: number;
  showScoreAnimation: boolean;
  lastCardScore: number;
}

type RevealSection = 'image' | 'manaCost' | 'typeLine' | 'oracleText' | 'stats' | 'rarity' | 'artist';

// GraphQL query for random cards with difficulty parameter
const getRandomCardsQuery = (count: number = 1, days: number = 60, minPlays: number = 100) => `
  query GetRandomCards {
    randomCards(count: ${count}, excludeBasicLands: true, days: ${days}, minPlays: ${minPlays}) {
      cardName
      cardFaces
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
        png
        small
        face0ArtCrop
        face0BorderCrop
        face0Large
        face0Normal
        face0Png
        face0Small
        face1ArtCrop
        face1BorderCrop
        face1Large
        face1Normal
        face1Png
        face1Small
      }
    }
  }
`;

// Difficulty settings
const DIFFICULTY_SETTINGS: Record<DifficultyLevel, { minPlays: number; label: string; color: string }> = {
  staples: { minPlays: 200, label: 'Staples', color: 'text-green-400' },
  playable: { minPlays: 50, label: 'Playable', color: 'text-yellow-400' },
  unrestricted: { minPlays: 1, label: 'Unrestricted', color: 'text-red-400' },
};

export default function CardQuizComponent() {
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [difficultyDropdownOpen, setDifficultyDropdownOpen] = useState(false);
  const [quizState, setQuizState] = useState<QuizState>({
    card: null,
    revealedSections: new Set([]), // Start with nothing revealed in quiz mode
    showAnswer: false,
    loading: false,
    mode: 'quiz',
    difficulty: 'staples',
    score: 0,
    showScoreAnimation: false,
    lastCardScore: 0,
  });

  const fetchNewCard = async () => {
    setQuizState(prev => ({ 
      ...prev, 
      loading: true,
      showAnswer: false, // Reset showAnswer when fetching new card
    }));
    
    let foundCardWithOracleText = false;
    const minPlays = DIFFICULTY_SETTINGS[quizState.difficulty].minPlays;

    while (!foundCardWithOracleText) {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: getRandomCardsQuery(1, 60, minPlays) 
          })
        });
        
        const { data } = await response.json();

        console.log(data);
        
        if (data?.randomCards?.[0]) {
          const card = data.randomCards[0];
          
          // Check if the card has oracleText
          if (card.oracleText) {
            foundCardWithOracleText = true;
            
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
          // If no oracleText, the loop will continue
        }
      } catch (error) {
        console.error('Failed to fetch card:', error);
        setQuizState(prev => ({ ...prev, loading: false }));
        break; // Exit the loop on error to avoid infinite loop
      }
    }
  };

  const handleNameGuess = (guess: string) => {
    if (!quizState.card) return;
    
    // Simple case-insensitive string comparison
    if (guess.toLowerCase() === quizState.card.card.cardName.toLowerCase()) {
      // Calculate points earned for this card
      const hintsUsed = Array.from(quizState.revealedSections).filter(s => s !== 'image' && s !== 'name').length;
      const pointsEarned = Math.max(0, 20 - (hintsUsed * 3));
      
      // Correct guess! Reveal everything
      setQuizState(prev => ({
        ...prev,
        revealedSections: new Set(['image', 'manaCost', 'typeLine', 'oracleText', 'stats', 'rarity', 'artist', 'price', 'name']),
        score: prev.score + pointsEarned,
        showScoreAnimation: true,
        showAnswer: true, // Also show the answer panel
        lastCardScore: pointsEarned,
      }));
      
      // Hide score animation after 1 second
      setTimeout(() => {
        setQuizState(prev => ({ ...prev, showScoreAnimation: false }));
      }, 1000);
    }
  };

  const revealSection = (section: RevealSection | string) => {
    // Define point deductions for each section
        const pointDeductions: Record<string, number> = {
            'manaCost': 2,
            'typeLine': 2,
            'oracleText': 3,
            'stats': 1,
            'rarity': 1,
            // 'image', 'price', 'artist' no deduction
        };

        // Apply penalty for revealing hints in quiz mode
        if (quizState.mode === 'quiz' && pointDeductions[section]) {
            const deduction = pointDeductions[section];
            setQuizState(prev => ({
            ...prev,
            revealedSections: new Set([...prev.revealedSections, section]),
            score: Math.max(0, prev.score - deduction) // Deduct points, minimum 0
            }));
        } else {
            setQuizState(prev => ({
            ...prev,
            revealedSections: new Set([...prev.revealedSections, section])
            }));
        }
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

  const switchDifficulty = (newDifficulty: DifficultyLevel) => {
    setQuizState(prev => ({
      ...prev,
      difficulty: newDifficulty,
    }));
    setDifficultyDropdownOpen(false);
    // Fetch a new card with the new difficulty
    fetchNewCard();
  };

  useEffect(() => {
    fetchNewCard();
  }, []);

  const { card, revealedSections, showAnswer, loading, mode, difficulty, score, showScoreAnimation, lastCardScore } = quizState;

  return (
    <section className="py-20 bg-gray-900 min-h-screen relative">
      {/* Score Animation */}
      {showScoreAnimation && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-6xl font-bold text-yellow-400 animate-ping">
            +{lastCardScore}
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Card <span className="text-yellow-400 font-serif">Quiz</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Can you identify the Magic card from its artwork and hints?
          </p>
          {mode === 'quiz' && (
            <div className="mt-4 text-2xl font-bold text-yellow-400">
              Score: {score}
            </div>
          )}
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

          {/* Difficulty Selector - Only show in quiz mode */}
          {mode === 'quiz' && (
            <div className="relative">
              <button
                onClick={() => setDifficultyDropdownOpen(!difficultyDropdownOpen)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center gap-2 border border-gray-700"
              >
                <span className={DIFFICULTY_SETTINGS[difficulty].color}>
                  {DIFFICULTY_SETTINGS[difficulty].label}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${difficultyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {difficultyDropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                  <button
                    onClick={() => switchDifficulty('staples')}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 rounded-t-lg ${
                      difficulty === 'staples' ? 'bg-gray-700 text-green-400' : 'text-gray-300'
                    }`}
                  >
                    Staples
                  </button>
                  <button
                    onClick={() => switchDifficulty('playable')}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 ${
                      difficulty === 'playable' ? 'bg-gray-700 text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    Playable
                  </button>
                  <button
                    onClick={() => switchDifficulty('unrestricted')}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 rounded-b-lg ${
                      difficulty === 'unrestricted' ? 'bg-gray-700 text-red-400' : 'text-gray-300'
                    }`}
                  >
                    Unrestricted
                  </button>
                </div>
              )}
            </div>
          )}

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
                {mode === 'quiz' && (
                  <span className="ml-4 text-base font-normal">
                    <span className="text-gray-400">Potential: </span>
                    <span className={`font-bold ${
                      Math.max(0, 20 - (Array.from(revealedSections).filter(s => s !== 'image' && s !== 'name').length * 3)) >= 20 ? 'text-green-400' : 
                      Math.max(0, 20 - (Array.from(revealedSections).filter(s => s !== 'image' && s !== 'name').length * 3)) > 0 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {Math.max(0, 20 - (Array.from(revealedSections).filter(s => s !== 'image' && s !== 'name').length * 3))}/20
                    </span>
                  </span>
                )}
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
                        onNameGuess={handleNameGuess}
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
                          className={`px-3 py-2 rounded text-sm flex flex-col items-center justify-center gap-1 transition-colors ${
                            revealedSections.has('manaCost') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Mana Cost
                          </div>
                          <span className="text-xs text-red-400">-2 pts</span>
                        </button>
                        <button
                          onClick={() => revealSection('typeLine')}
                          disabled={revealedSections.has('typeLine')}
                          className={`px-3 py-2 rounded text-sm flex flex-col items-center justify-center gap-1 transition-colors ${
                            revealedSections.has('typeLine') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Type
                          </div>
                          <span className="text-xs text-red-400">-2 pts</span>
                        </button>
                        <button
                          onClick={() => revealSection('oracleText')}
                          disabled={revealedSections.has('oracleText')}
                          className={`px-3 py-2 rounded text-sm flex flex-col items-center justify-center gap-1 transition-colors ${
                            revealedSections.has('oracleText') 
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Oracle Text
                          </div>
                          <span className="text-xs text-red-400">-3 pts</span>
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
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400">-1 pts</span>
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            </div>
                          </div>
                        </button>
                      ) : (
                        revealedSections.has('rarity') && (
                          card.card.rarity && card.card.setName && (
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
                        ))
                      )}

                      {/* Price */}
                      {!revealedSections.has('price') && mode === 'quiz' ? (
                        <button
                          onClick={() => revealSection('price')}
                          className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Price</span>
                            <div className="flex items-center gap-2">
                              <EyeOff className="w-4 h-4 text-gray-500" />
                            </div>
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
                              : new Set([...prev.revealedSections, 'name']),
                            lastCardScore: 0 // No points for revealing answer
                          }));
                        }}
                        className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        {showAnswer ? 'Hide' : 'Reveal'} Answer
                      </button>
                      
                      {/* Next Card Button - shows when answer is revealed */}
                      {showAnswer && (
                        <button
                          onClick={fetchNewCard}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Next Card
                        </button>
                      )}
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
                  
                  {/* Points Earned */}
                  {mode === 'quiz' && (
                    <div className="text-lg">
                      <span className="text-gray-400">Points earned: </span>
                      <span className={`font-bold ${lastCardScore >= 20 ? 'text-green-400' : lastCardScore > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {lastCardScore}/20
                      </span>
                    </div>
                  )}
                  
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