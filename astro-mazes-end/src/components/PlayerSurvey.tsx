import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Home } from 'lucide-react';
import { magicColors, getColorCombinationName } from '../data/magicColors';
import { cedhCommanders } from '../data/cedhCommanders';
import { casualCommanders } from '../data/casualCommanders';
import ManaText from './ManaText'; // Import your ManaText component
import type { ColorId } from '../types/magic';

interface SurveyOption {
  value: string;
  text: string;
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
  color: string;
}

interface Answers {
  experience?: string;
  colors?: ColorId[];
  power_level?: string;
  playstyle?: string;
}

const PlayerSurvey: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [playerType, setPlayerType] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<ColorId[]>([]);

  // Simplified survey structure
  const surveySteps: SurveyStep[] = [
    {
      type: 'intro',
      title: 'Welcome to Your Magic Journey!',
      subtitle: 'Let\'s find your ideal playstyle and power level',
      description: 'Whether you\'re new to Magic or looking to optimize your pod experience, this survey will help you understand where you fit and how to build decks that match your group\'s power level.'
    },
    {
      id: 'experience',
      type: 'question',
      question: 'What\'s your Magic: The Gathering experience level?',
      options: [
        { value: 'beginner', text: 'New to Magic (0-1 years)' },
        { value: 'intermediate', text: 'Casual player (2-5 years)' },
        { value: 'advanced', text: 'Experienced player (5+ years)' },
        { value: 'expert', text: 'Veteran player who knows the game deeply' }
      ]
    },
    {
      id: 'colors',
      type: 'color_picker',
      question: 'Which Magic colors do you enjoy playing?',
      subtitle: 'Select any combination of colors - we\'ll show you what it\'s called!'
    },
    {
      id: 'power_level',
      type: 'question',
      question: 'What power level matches your current pod or goals?',
      options: [
        { value: 'casual', text: 'Casual EDH - Precons and upgraded decks (Power 4-6)' },
        { value: 'focused', text: 'Focused EDH - Optimized but fair (Power 7-8)' },
        { value: 'high_power', text: 'High Power - Fast combos, strong interaction (Power 9)' },
        { value: 'cedh', text: 'cEDH - Turn 1-4 wins, maximum optimization (Power 10)' }
      ]
    },
    {
      id: 'playstyle',
      type: 'question',
      question: 'What\'s most important to you in a Magic game?',
      options: [
        { value: 'social', text: 'Good sportsmanship and fun social interaction' },
        { value: 'improvement', text: 'Learning and improving my gameplay' },
        { value: 'competition', text: 'Competitive play and winning efficiently' },
        { value: 'creativity', text: 'Creative deckbuilding and unique strategies' }
      ]
    },
    {
      type: 'results'
    }
  ];

  // Simplified player types
  const playerTypes: Record<string, PlayerType> = {
    learning_foundation: {
      title: 'The Foundation Builder',
      description: 'You\'re building your Magic fundamentals! Focus on understanding core concepts and clean gameplay.',
      color: 'bg-green-600'
    },
    competitive_optimizer: {
      title: 'The Competitive Optimizer',
      description: 'You want maximum power and efficiency. You\'re ready for high-level competitive play.',
      color: 'bg-red-600'
    },
    creative_brewer: {
      title: 'The Creative Brewer',
      description: 'You love exploring unique strategies and building innovative decks.',
      color: 'bg-purple-600'
    },
    social_player: {
      title: 'The Social Player',
      description: 'You value the social aspect of Magic and want balanced, interactive games.',
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
    const isCompetitive = answers.power_level === 'cedh' || answers.power_level === 'high_power';
    const commanders = isCompetitive ? cedhCommanders : casualCommanders;
    
    return commanders[colorStr] || [];
  };

  const calculatePlayerType = (): string => {
    const { experience, power_level, playstyle } = answers;
    
    if (experience === 'beginner') return 'learning_foundation';
    if (power_level === 'cedh' && playstyle === 'competition') return 'competitive_optimizer';
    if (playstyle === 'creativity') return 'creative_brewer';
    return 'social_player';
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
            <h1 className="text-4xl font-bold text-white mb-4">
              {currentStepData.title}
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              {currentStepData.subtitle}
            </p>
            <p className="text-gray-400 mb-8 leading-relaxed">
              {currentStepData.description}
            </p>
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
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
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
                  {option.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Picker Step - UPDATED TO USE MANATEXT */}
        {currentStepData.type === 'color_picker' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              {currentStepData.question}
            </h2>
            <p className="text-gray-400 text-center mb-8">
              {currentStepData.subtitle}
            </p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Color Selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Select Colors:</h3>
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
                <h3 className="text-lg font-semibold text-white mb-4">Color Identity:</h3>
                
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
                    
                    {selectedColors.length === 2 && (
                      <p className="text-gray-300 text-sm">
                        Two-color combinations are called "Guilds" in Magic lore, each with distinct strategies and philosophies.
                      </p>
                    )}
                    
                    {selectedColors.length === 3 && (
                      <p className="text-gray-300 text-sm">
                        Three-color combinations include the "Shards" of Alara and the "Wedges" of Tarkir, representing complex strategic approaches.
                      </p>
                    )}
                    
                    {selectedColors.length === 4 && (
                      <p className="text-gray-300 text-sm">
                        Four-color combinations are rare but powerful, representing the absence of one color's philosophy.
                      </p>
                    )}
                    
                    {selectedColors.length === 5 && (
                      <p className="text-gray-300 text-sm">
                        Five-color (WUBRG) represents ultimate flexibility and access to all of Magic's strategies and effects.
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
            <h2 className="text-2xl font-bold text-white mb-6">
              Ready to discover your Magic player type?
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

            {/* Commander Recommendations */}
            {selectedColors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
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