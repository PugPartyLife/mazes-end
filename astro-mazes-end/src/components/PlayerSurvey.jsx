import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Home } from 'lucide-react';

const PlayerSurvey = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [playerType, setPlayerType] = useState(null);
  const [selectedColors, setSelectedColors] = useState([]);

  // Magic color data
  const magicColors = [
    { id: 'W', name: 'White', symbol: 'W', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-400', textColor: 'text-gray-800' },
    { id: 'U', name: 'Blue', symbol: 'U', bgColor: 'bg-blue-500', borderColor: 'border-blue-600', textColor: 'text-white' },
    { id: 'B', name: 'Black', symbol: 'B', bgColor: 'bg-gray-900', borderColor: 'border-gray-700', textColor: 'text-white' },
    { id: 'R', name: 'Red', symbol: 'R', bgColor: 'bg-red-500', borderColor: 'border-red-600', textColor: 'text-white' },
    { id: 'G', name: 'Green', symbol: 'G', bgColor: 'bg-green-500', borderColor: 'border-green-600', textColor: 'text-white' }
  ];

  // Color combination names
  const getColorCombinationName = (colors) => {
    const sortedColors = colors.sort();
    const colorStr = sortedColors.join('');
    
    const combinations = {
      // Single colors
      'W': 'Mono-White',
      'U': 'Mono-Blue', 
      'B': 'Mono-Black',
      'R': 'Mono-Red',
      'G': 'Mono-Green',
      
      // Two-color guilds
      'UW': 'Azorius (White/Blue)',
      'BU': 'Dimir (Blue/Black)',
      'BR': 'Rakdos (Black/Red)',
      'GR': 'Gruul (Red/Green)',
      'GW': 'Selesnya (Green/White)',
      'BW': 'Orzhov (White/Black)',
      'RU': 'Izzet (Blue/Red)',
      'BG': 'Golgari (Black/Green)',
      'RW': 'Boros (Red/White)',
      'GU': 'Simic (Green/Blue)',
      
      // Three-color shards
      'GUW': 'Bant (Green/White/Blue)',
      'BRW': 'Mardu (Red/White/Black)',
      'BUW': 'Esper (White/Blue/Black)',
      'BGR': 'Jund (Black/Red/Green)',
      'GRU': 'Temur (Green/Blue/Red)',
      
      // Three-color wedges
      'BGW': 'Abzan (White/Black/Green)',
      'BRU': 'Grixis (Blue/Black/Red)',
      'GRW': 'Naya (Red/Green/White)',
      'BGU': 'Sultai (Black/Green/Blue)',
      'RUW': 'Jeskai (Blue/Red/White)',
      
      // Four-color (unofficial names)
      'BRUW': 'Artifice (Non-Green)',
      'BGUW': 'Growth (Non-Red)',
      'BGRW': 'Aggression (Non-Blue)',
      'GRUW': 'Altruism (Non-Black)',
      'BGRU': 'Chaos (Non-White)',
      'BGRUW': 'WUBRG (All Colors)'
    };
    
    return combinations[colorStr] || `${colors.length}-Color Combination`;
  };

  const toggleColor = (colorId) => {
    setSelectedColors(prev => {
      if (prev.includes(colorId)) {
        return prev.filter(id => id !== colorId);
      } else {
        return [...prev, colorId];
      }
    });
    
    // Update answers when colors change
    setAnswers(prev => ({ 
      ...prev, 
      colors: selectedColors.includes(colorId) 
        ? selectedColors.filter(id => id !== colorId)
        : [...selectedColors, colorId]
    }));
  };

  // Updated survey focused on Magic fundamentals and pod dynamics
  const surveySteps = [
    {
      id: 'welcome',
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
        { id: 'new', text: 'New to Magic (0-1 years)', value: 'beginner' },
        { id: 'casual', text: 'Casual player (2-5 years)', value: 'intermediate' },
        { id: 'experienced', text: 'Experienced player (5+ years)', value: 'advanced' },
        { id: 'veteran', text: 'Veteran player who knows the game deeply', value: 'expert' }
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
        { id: 'casual', text: 'Casual EDH - Precons and upgraded decks (Power 4-6)', value: 'casual' },
        { id: 'focused', text: 'Focused EDH - Optimized but fair (Power 7-8)', value: 'focused' },
        { id: 'high_power', text: 'High Power - Fast combos, strong interaction (Power 9)', value: 'high_power' },
        { id: 'cedh', text: 'cEDH - Turn 1-4 wins, maximum optimization (Power 10)', value: 'cedh' },
        { id: 'unsure', text: 'Not sure - help me figure this out', value: 'unsure' }
      ]
    },
    {
      id: 'game_knowledge',
      type: 'question',
      question: 'How comfortable are you with Magic\'s rules and stack?',
      options: [
        { id: 'basic', text: 'Basic - I understand most cards but not complex interactions', value: 'basic' },
        { id: 'intermediate', text: 'Intermediate - I know priority and most timing rules', value: 'intermediate' },
        { id: 'advanced', text: 'Advanced - I understand the stack and complex interactions', value: 'advanced' },
        { id: 'judge', text: 'Expert - I could be a judge or rules advisor', value: 'expert' }
      ]
    },
    {
      id: 'playstyle_preference',
      type: 'question',
      question: 'What\'s most important to you in a Magic game?',
      options: [
        { id: 'social', text: 'Good sportsmanship and fun social interaction', value: 'social' },
        { id: 'improvement', text: 'Learning and improving my gameplay', value: 'improvement' },
        { id: 'competition', text: 'Competitive play and winning efficiently', value: 'competition' },
        { id: 'creativity', text: 'Creative deckbuilding and unique strategies', value: 'creativity' },
        { id: 'balance', text: 'Balanced games where anyone can win', value: 'balance' }
      ]
    },
    {
      id: 'goals',
      type: 'question',
      question: 'What would help you most right now?',
      options: [
        { id: 'deckbuilding', text: 'Learn to build decks that match my pod\'s power level', value: 'deckbuilding' },
        { id: 'rules', text: 'Better understanding of rules and stack interactions', value: 'rules' },
        { id: 'etiquette', text: 'Magic etiquette and being a better opponent', value: 'etiquette' },
        { id: 'meta', text: 'Understanding the current meta and strong strategies', value: 'meta' },
        { id: 'upgrades', text: 'Upgrading my existing decks efficiently', value: 'upgrades' }
      ]
    },
    {
      id: 'results',
      type: 'results'
    }
  ];

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const nextStep = () => {
    if (currentStep < surveySteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculatePlayerType = () => {
    const { experience, colors, power_level, game_knowledge, playstyle_preference, goals } = answers;
    
    // More nuanced player type calculation
    if (experience === 'beginner' && game_knowledge === 'basic') {
      return 'learning_foundation';
    } else if (power_level === 'cedh' && playstyle_preference === 'competition') {
      return 'competitive_optimizer';
    } else if (goals === 'deckbuilding' && (power_level === 'focused' || power_level === 'high_power')) {
      return 'pod_matcher';
    } else if (playstyle_preference === 'creativity' && colors === 'flexible') {
      return 'creative_brewer';
    } else if (goals === 'rules' || game_knowledge === 'advanced') {
      return 'rules_master';
    } else if (playstyle_preference === 'social' && goals === 'etiquette') {
      return 'social_player';
    } else {
      return 'balanced_player';
    }
  };

  const getPlayerTypeInfo = (type) => {
    const types = {
      learning_foundation: {
        title: 'The Foundation Builder',
        description: 'You\'re building your Magic fundamentals! Focus on understanding core concepts, basic interactions, and clean gameplay.',
        recommendations: [
          'Master the basic rules and turn structure',
          'Learn common Magic terminology and etiquette',
          'Start with focused, synergistic deck themes',
          'Practice good sportsmanship and communication'
        ],
        color: 'bg-green-600'
      },
      competitive_optimizer: {
        title: 'The Competitive Optimizer',
        description: 'You want maximum power and efficiency. You\'re ready for high-level competitive play and optimization.',
        recommendations: [
          'Study cEDH tier lists and optimal decklists',
          'Learn advanced stack interactions and timing',
          'Practice fast combo execution and protection',
          'Master tournament-level rules knowledge'
        ],
        color: 'bg-red-600'
      },
      pod_matcher: {
        title: 'The Pod Matcher',
        description: 'You understand that great Magic happens when decks are well-matched. You want to build for your specific playgroup.',
        recommendations: [
          'Learn to assess and match your pod\'s power level',
          'Understand deck power scaling and upgrade paths',
          'Practice pre-game power level discussions',
          'Build multiple decks for different power levels'
        ],
        color: 'bg-blue-600'
      },
      creative_brewer: {
        title: 'The Creative Brewer',
        description: 'You love exploring unique strategies and building innovative decks across different colors and themes.',
        recommendations: [
          'Explore lesser-known commanders and strategies',
          'Learn advanced deckbuilding theory and synergies',
          'Experiment with different color combinations',
          'Study card interactions for brewing inspiration'
        ],
        color: 'bg-purple-600'
      },
      rules_master: {
        title: 'The Rules Master',
        description: 'You want to deeply understand Magic\'s rules and complex interactions. Knowledge and precision drive you.',
        recommendations: [
          'Study comprehensive rules and judge materials',
          'Learn complex stack interactions and timing',
          'Practice explaining rules to other players',
          'Master priority, layers, and state-based actions'
        ],
        color: 'bg-indigo-600'
      },
      social_player: {
        title: 'The Social Player',
        description: 'You value the social aspect of Magic and want to be the kind of player everyone enjoys facing.',
        recommendations: [
          'Learn Magic etiquette and sportsmanship',
          'Practice clear communication and patience',
          'Focus on interactive, non-oppressive strategies',
          'Help newer players learn and improve'
        ],
        color: 'bg-orange-600'
      },
      balanced_player: {
        title: 'The Balanced Player',
        description: 'You want to improve across all aspects of Magic while maintaining fun, balanced games.',
        recommendations: [
          'Develop well-rounded Magic skills',
          'Learn to adapt your play to different pods',
          'Practice both competitive and casual mindsets',
          'Build decks across different power levels'
        ],
        color: 'bg-teal-600'
      }
    };
    return types[type] || types.balanced_player;
  };

  const completeResults = () => {
    const type = calculatePlayerType();
    setPlayerType(type);
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
          ></div>
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
        {currentStepData.type === 'question' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {currentStepData.question}
            </h2>
            <div className="space-y-3">
              {currentStepData.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAnswer(currentStepData.id, option.value)}
                  className={`w-full p-4 rounded-lg text-left transition-all duration-200 border ${
                    answers[currentStepData.id] === option.value
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

        {/* Color Picker Step */}
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
                      onClick={() => toggleColor(color.id)}
                      className={`
                        aspect-square rounded-full flex items-center justify-center text-2xl font-bold border-4 transition-all duration-200 transform hover:scale-105
                        ${selectedColors.includes(color.id) 
                          ? `${color.bgColor} ${color.borderColor} ${color.textColor} shadow-lg` 
                          : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                        }
                      `}
                      title={color.name}
                    >
                      {color.symbol}
                    </button>
                  ))}
                </div>
                
                {/* Selected colors display */}
                {selectedColors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-2">Selected:</p>
                    <div className="flex gap-1">
                      {selectedColors.map(colorId => {
                        const color = magicColors.find(c => c.id === colorId);
                        return (
                          <span 
                            key={colorId}
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color.bgColor} ${color.textColor}`}
                          >
                            {color.symbol}
                          </span>
                        );
                      })}
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
                    <div className="text-2xl font-bold text-white mb-2">
                      {getColorCombinationName(selectedColors)}
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
        {playerType && (
          <div className="text-center">
            <div className={`inline-block px-6 py-3 rounded-full text-white font-bold mb-6 ${getPlayerTypeInfo(playerType).color}`}>
              {getPlayerTypeInfo(playerType).title}
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {getPlayerTypeInfo(playerType).description}
            </p>
            <div className="mb-8">
              <h3 className="text-xl font-bold text-white mb-4">
                Recommended Focus Areas:
              </h3>
              <ul className="text-left text-gray-300 space-y-2 max-w-md mx-auto">
                {getPlayerTypeInfo(playerType).recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Back Home
              </button>
              <button
                onClick={() => {
                  setCurrentStep(0);
                  setAnswers({});
                  setPlayerType(null);
                }}
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
                : !answers[currentStepData.id]
            }
            className="flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
