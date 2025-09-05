import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Home } from 'lucide-react';
import { magicColors, getColorCombinationName } from '../data/magicColors';
import { cedhCommanders } from '../data/cedhCommanders';
import { casualCommanders } from '../data/casualCommanders';
import ManaText from './ManaText';
import type { ColorId } from '../types/magic';

interface SurveyOption {
  value: string;
  text: string;
  description?: string;
}

interface SurveyStep {
  id?: string;
  type: 'intro' | 'question' | 'color_picker' | 'results';
  title?: string;
  subtitle?: string;
  description?: string;
  question?: string;
  options?: SurveyOption[];
}

interface PlayerType {
  title: string;
  description: string;
  recommendations: string[];
  color: string;
}

interface Answers {
  experience?: string;
  colors?: ColorId[];
  power_level?: string;
  playstyle?: string;
  pod_preference?: string;
  win_con?: string;
}

const PlayerSurvey: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [playerType, setPlayerType] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<ColorId[]>([]);

  // EDH-focused survey structure
  const surveySteps: SurveyStep[] = [
    {
      type: 'intro',
      title: 'Find Your EDH Power Level',
      subtitle: 'Navigate the Commander format with confidence',
      description: 'This survey helps you understand Wizards\' official Commander power levels (1-4) and identify whether you\'re ready for cEDH. We\'ll help you communicate your deck\'s power level and find the right pod for your playstyle.'
    },
    {
      id: 'experience',
      type: 'question',
      question: 'How long have you been playing Commander/EDH?',
      options: [
        { value: 'new', text: 'Just starting (< 6 months)' },
        { value: 'learning', text: 'Still learning (6 months - 2 years)' },
        { value: 'experienced', text: 'Experienced (2-5 years)' },
        { value: 'veteran', text: 'Veteran (5+ years)' }
      ]
    },
    {
      id: 'colors',
      type: 'color_picker',
      question: 'What color identity do you prefer in Commander?',
      subtitle: 'Select your favorite color combination for EDH decks'
    },
    {
      id: 'power_level',
      type: 'question',
      question: 'Which power level best describes your current decks or goals?',
      options: [
        { 
          value: 'level_1', 
          text: 'Bracket 1: Jank/Theme',
          description: 'Chair tribal, ladies looking left, minimal interaction or win conditions'
        },
        { 
          value: 'level_2', 
          text: 'Bracket 2: Precon',
          description: 'Unmodified preconstructed decks, clear but slower strategies'
        },
        { 
          value: 'level_3', 
          text: 'Bracket 3: Mid Power',
          description: 'Focused strategy, upgraded mana base, good interaction'
        },
        { 
          value: 'level_4', 
          text: 'Bracket 4: High Power',
          description: 'Optimized (not cEDH), fast mana, efficient combos'
        },
        { 
          value: 'cedh', 
          text: 'cEDH: Competitive EDH',
          description: 'Tournament level, turn 1-4 wins possible, no restrictions'
        }
      ]
    },
    {
      id: 'pod_preference',
      type: 'question',
      question: 'What kind of Commander games do you prefer?',
      options: [
        { value: 'long_games', text: 'Long games (10+ turns) with big splashy plays' },
        { value: 'medium_games', text: 'Medium games (7-10 turns) with good pacing' },
        { value: 'fast_games', text: 'Fast games (4-7 turns) with efficient plays' },
        { value: 'any_games', text: 'Any length - I adapt to the table' }
      ]
    },
    {
      id: 'win_con',
      type: 'question',
      question: 'How do you prefer to win in Commander?',
      options: [
        { value: 'combat', text: 'Combat damage with creatures' },
        { value: 'combo', text: 'Infinite combos or deterministic wins' },
        { value: 'value', text: 'Out-value opponents over time' },
        { value: 'stax', text: 'Resource denial and control' },
        { value: 'alternative', text: 'Alternative win conditions (Lab Man, Approach, etc.)' }
      ]
    },
    {
      id: 'playstyle',
      type: 'question',
      question: 'What\'s most important to you in a Commander game?',
      options: [
        { value: 'social', text: 'Rule 0 conversation and social fun' },
        { value: 'expression', text: 'Self-expression through unique decks' },
        { value: 'optimization', text: 'Optimizing within power level constraints' },
        { value: 'winning', text: 'Playing to win at the agreed power level' }
      ]
    },
    {
      type: 'results'
    }
  ];

  // EDH-specific player types
  const playerTypes: Record<string, PlayerType> = {
    casual_explorer: {
      title: 'The Casual Explorer',
      description: 'You\'re perfect for Bracket 1-2 pods. You enjoy the social aspect of Commander and prefer fun, thematic decks where everyone gets to do their thing.',
      recommendations: [
        'Try theme decks like "chairs tribal" or "ladies looking left" for Bracket 1',
        'Start with precons for consistent Bracket 2 gameplay',
        'Focus on having fun interactions over optimal plays',
        'Communicate in Rule 0 that you prefer casual, lower-power games'
      ],
      color: 'bg-green-600'
    },
    focused_builder: {
      title: 'The Focused Builder',
      description: 'You thrive at Bracket 3. You want your deck to have a clear strategy and good execution without being oppressive. This is the most common power level at LGS.',
      recommendations: [
        'Upgrade precons with clear win conditions and better interaction',
        'Include 8-10 pieces of targeted removal and 2-3 board wipes',
        'Aim for consistent turn 8-10 wins when uninterrupted',
        'Balance your curve with proper ramp, draw, and threats'
      ],
      color: 'bg-blue-600'
    },
    optimized_player: {
      title: 'The Optimized Player',
      description: 'You\'re ready for Bracket 4. You enjoy highly tuned decks with fast mana, tutors, and efficient win conditions that aren\'t quite cEDH.',
      recommendations: [
        'Include fast mana rocks (Mana Crypt, Moxes, Rituals)',
        'Run efficient tutors and compact win conditions',
        'Build with a faster clock - threatening wins by turn 5-8',
        'Consider fringe cEDH strategies at lower optimization'
      ],
      color: 'bg-purple-600'
    },
    competitive_spike: {
      title: 'The Competitive Spike',
      description: 'You\'re built for cEDH. You want maximum efficiency, the best cards regardless of price, and games decided by tight technical play and metagame knowledge.',
      recommendations: [
        'Study the cEDH metagame and staple cards',
        'Include all relevant fast mana and free counterspells',
        'Build redundant, compact win conditions (2-3 cards max)',
        'Join the cEDH Discord and find local tournaments',
        'Practice mulliganing aggressively for fast starts'
      ],
      color: 'bg-red-600'
    },
    social_architect: {
      title: 'The Social Architect',
      description: 'You excel at reading the table and building decks that match any power level. You prioritize good games over winning and help others have fun.',
      recommendations: [
        'Build multiple decks at different power levels',
        'Master Rule 0 conversations to set expectations',
        'Include cards that create interesting board states',
        'Focus on interactive games rather than linear strategies'
      ],
      color: 'bg-orange-600'
    }
  };

  // Helper function to convert ColorId to mana symbol format
  const colorIdToManaSymbol = (colorId: ColorId): string => {
    const symbolMap: Record<ColorId, string> = {
      'W': '{W}',
      'U': '{U}',
      'B': '{B}',
      'R': '{R}',
      'G': '{G}'
    };
    return symbolMap[colorId] || `{${colorId}}`;
  };

  // Helper functions
  const toggleColor = (colorId: ColorId): void => {
    setSelectedColors(prev => 
      prev.includes(colorId) 
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    );
  };

  const getCommanderRecommendations = () => {
    if (!selectedColors.length) return [];
    
    const colorStr = selectedColors.sort().join('');
    const isCEDH = answers.power_level === 'cedh';
    const commanders = isCEDH ? cedhCommanders : casualCommanders;
    
    return commanders[colorStr] || [];
  };

  const getPowerLevelDetails = (powerLevel: string | undefined) => {
    const details: Record<string, any> = {
      level_1: {
        name: 'Bracket 1',
        turnClock: 'Turn 15+',
        budget: '$25-100',
        description: 'Theme decks, jank, minimal interaction. Fun over function.'
      },
      level_2: {
        name: 'Bracket 2',
        turnClock: 'Turn 10-15',
        budget: '$100-250',
        description: 'Precon level. Clear strategy but slower execution.'
      },
      level_3: {
        name: 'Bracket 3',
        turnClock: 'Turn 8-10',
        budget: '$250-800',
        description: 'Upgraded precons. Good interaction and focused gameplan.'
      },
      level_4: {
        name: 'Bracket 4',
        turnClock: 'Turn 5-8',
        budget: '$800-2000',
        description: 'High power. Fast mana, tutors, efficient combos.'
      },
      cedh: {
        name: 'cEDH',
        turnClock: 'Turn 1-4',
        budget: '$2000+',
        description: 'Competitive. Maximum optimization, no holds barred.'
      }
    };
    return details[powerLevel || ''] || null;
  };

  const calculatePlayerType = (): string => {
    const { experience, power_level, playstyle, pod_preference } = answers;
    
    // cEDH player
    if (power_level === 'cedh') return 'competitive_spike';
    
    // New players or jank/theme players
    if (experience === 'new' || power_level === 'level_1') return 'casual_explorer';
    
    // Social focus
    if (playstyle === 'social' || playstyle === 'expression') {
      if (pod_preference === 'long_games') return 'casual_explorer';
      return 'social_architect';
    }
    
    // Optimization focus
    if (playstyle === 'optimization' || playstyle === 'winning') {
      if (power_level === 'level_4') return 'optimized_player';
      if (power_level === 'level_3') return 'focused_builder';
    }
    
    // Default based on power level
    if (power_level === 'level_4') return 'optimized_player';
    if (power_level === 'level_3') return 'focused_builder';
    if (power_level === 'level_2') return 'casual_explorer';
    
    return 'social_architect';
  };

  const handleAnswer = (questionId: string, answer: string): void => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextStep = (): void => {
    if (currentStep === 2 && selectedColors.length > 0) {
      setAnswers(prev => ({ ...prev, colors: selectedColors }));
    }
    if (currentStep < surveySteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = (): void => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const completeResults = (): void => {
    setPlayerType(calculatePlayerType());
  };

  const resetSurvey = (): void => {
    setCurrentStep(0);
    setAnswers({});
    setPlayerType(null);
    setSelectedColors([]);
  };

  const currentStepData = surveySteps[currentStep];
  const progress = ((currentStep + 1) / surveySteps.length) * 100;

  return (
    <div className="max-w-2xl w-full mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-gray-400 to-gray-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-gray-400 text-sm mt-2 text-center">
          Step {currentStep + 1} of {surveySteps.length}
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        {/* Intro Step */}
        {currentStepData.type === 'intro' && (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-me-yellow mb-4">
              {currentStepData.title}
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              {currentStepData.subtitle}
            </p>
            <p className="text-gray-400 mb-8 leading-relaxed">
              {currentStepData.description}
            </p>
            
            {/* Power Level Quick Reference */}
            <div className="bg-gray-700 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
              <h3 className="text-me-yellow font-semibold mb-3">Commander Brackets:</h3>
              <div className="space-y-2 text-left">
                <div className="flex items-center gap-3">
                  <span className="bg-green-700 text-white px-2 py-1 rounded text-xs font-bold">1</span>
                  <span className="text-gray-300 text-sm">Jank/Theme - All fun, minimal function.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-700 text-white px-2 py-1 rounded text-xs font-bold">2</span>
                  <span className="text-gray-300 text-sm">Precon - Unmodified preconstructed decks.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-700 text-white px-2 py-1 rounded text-xs font-bold">3</span>
                  <span className="text-gray-300 text-sm">Casual - Fun and function, minimal cEDH staples.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-orange-700 text-white px-2 py-1 rounded text-xs font-bold">4</span>
                  <span className="text-gray-300 text-sm">High Power - cEDH staples, but is slow or lacks consistency.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">C</span>
                  <span className="text-gray-300 text-sm">cEDH - Fun = Function.</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={nextStep}
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              Let's Start!
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Question Step */}
        {currentStepData.type === 'question' && currentStepData.options && (
          <div>
            <h2 className="text-2xl font-bold text-me-yellow mb-6 text-center">
              {currentStepData.question}
            </h2>
            <div className="space-y-3">
              {currentStepData.options.map((option: SurveyOption) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(currentStepData.id!, option.value)}
                  className={`w-full p-4 rounded-lg text-left transition-all duration-200 border ${
                    answers[currentStepData.id! as keyof Answers] === option.value
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{option.text}</div>
                  {option.description && (
                    <div className="text-sm mt-1 opacity-90">{option.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Picker Step */}
        {currentStepData.type === 'color_picker' && (
          <div>
            <h2 className="text-2xl font-bold text-me-yellow mb-2 text-center">
              {currentStepData.question}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {currentStepData.subtitle}
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Color Selection */}
              <div>
                <h3 className="text-lg font-semibold text-me-yellow mb-4">Select Colors:</h3>
                <div className="grid grid-cols-5 gap-3">
                  {magicColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => toggleColor(color.id as ColorId)}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center border-4 transition-all duration-200 transform hover:scale-105 p-2
                        ${selectedColors.includes(color.id as ColorId) 
                          ? 'bg-gray-600 border-gray-400 shadow-lg' 
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        }
                      `}
                      title={color.name}
                    >
                      <ManaText 
                        text={colorIdToManaSymbol(color.id as ColorId)} 
                        size={32} 
                        inline={true}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Selected colors display */}
                {selectedColors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Selected:</p>
                    <div className="flex gap-1 items-center">
                      <ManaText 
                        text={selectedColors.map(colorIdToManaSymbol).join('')} 
                        size={24} 
                        gap={2}
                        inline={true}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Color Combination Info */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-me-yellow mb-4">Color Identity:</h3>

                {selectedColors.length === 0 && (
                  <p className="text-gray-400 italic">Select colors to see the combination name</p>
                )}
                
                {selectedColors.length > 0 && (
                  <div>
                    <div className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      <ManaText 
                        text={selectedColors.map(colorIdToManaSymbol).join('')} 
                        size={28} 
                        gap={2}
                        inline={true}
                      />
                      <span>{getColorCombinationName(selectedColors)}</span>
                    </div>
                    
                    {selectedColors.length === 1 && (
                      <p className="text-gray-300 text-sm">
                        Mono-color decks offer consistency and powerful devotion strategies. Great for new players!
                      </p>
                    )}
                    
                    {selectedColors.length === 2 && (
                      <p className="text-gray-300 text-sm">
                        Two-color "Guild" decks balance consistency with versatility. Most precons use this combination.
                      </p>
                    )}
                    
                    {selectedColors.length === 3 && (
                      <p className="text-gray-300 text-sm">
                        Three-color decks offer diverse strategies. Popular in both casual and competitive metas.
                      </p>
                    )}
                    
                    {selectedColors.length === 4 && (
                      <p className="text-gray-300 text-sm">
                        Four-color decks require excellent mana bases but offer incredible flexibility.
                      </p>
                    )}
                    
                    {selectedColors.length === 5 && (
                      <p className="text-gray-300 text-sm">
                        WUBRG commanders access every card in Magic. Requires premium mana base for consistency.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Step */}
        {currentStepData.type === 'results' && !playerType && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-me-yellow mb-6">
              Ready to discover your EDH player type?
            </h2>
            <button
              onClick={completeResults}
              className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              Show My Results
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Player Type Results */}
        {playerType && playerTypes[playerType] && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-full text-white font-bold mb-6 ${playerTypes[playerType].color}`}>
              {playerTypes[playerType].title}
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {playerTypes[playerType].description}
            </p>

            {/* Power Level Details */}
            {answers.power_level && getPowerLevelDetails(answers.power_level) && (
              <div className="bg-gray-700 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-me-yellow mb-4">Your Power Level</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">Level</p>
                    <p className="text-white font-bold text-lg">{getPowerLevelDetails(answers.power_level).name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Win Turn</p>
                    <p className="text-white font-bold text-lg">{getPowerLevelDetails(answers.power_level).turnClock}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Typical Budget</p>
                    <p className="text-white font-bold text-lg">{getPowerLevelDetails(answers.power_level).budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Description</p>
                    <p className="text-white text-sm">{getPowerLevelDetails(answers.power_level).description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-me-yellow mb-4">Recommendations</h3>
              <ul className="space-y-3 text-left">
                {playerTypes[playerType].recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-gray-400 mt-1">•</span>
                    <span className="text-gray-300">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commander Recommendations */}
            {selectedColors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-me-yellow mb-4 flex items-center justify-center gap-2">
                  Recommended Commanders for
                  <ManaText
                    text={selectedColors.map(colorIdToManaSymbol).join('')}
                    size={20}
                    gap={1}
                    inline={true}
                  />
                  {getColorCombinationName(selectedColors)}
                </h3>
                <div className="grid gap-4 max-w-4xl mx-auto">
                  {getCommanderRecommendations().map((commander, index: number) => (
                    <div key={index} className="bg-gray-700 rounded-lg p-4 text-left">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-bold text-white">{commander.name}</h4>
                        <span className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-sm">
                          {commander.archetype}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm">{commander.description}</p>
                    </div>
                  ))}
                  {getCommanderRecommendations().length === 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 italic">
                        No specific recommendations for this color combination yet. Try exploring popular commanders on EDHRec!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Back Home
              </button>
              <button
                onClick={resetSurvey}
                className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Retake Survey
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {(currentStepData.type === 'question' || currentStepData.type === 'color_picker') && (
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={nextStep}
            disabled={
              currentStepData.type === 'color_picker' 
                ? selectedColors.length === 0
                : !answers[currentStepData.id! as keyof Answers]
            }
            className="flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-yellow-400 border border-transparent disabled:hover:border-transparent"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerSurvey;