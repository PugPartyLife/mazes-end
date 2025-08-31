import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import CtaButton from '../components/CtaButton.tsx';

interface Stat {
  number: string;
  label: string;
}

const WORDS = ['1. Learn', '2. Study', '3. Practice', '4. Win'] as const;
const STATS: Stat[] = [
  { number: '1091', label: 'Commanders' },
  { number: '9786', label: 'Unique Cards' },
  { number: '11135', label: 'Decks' },
  { number: '162', label: 'Tournaments' },
];

export default function Banner() {
  const [currentWord, setCurrentWord] = useState<number>(0);
  const strikethroughRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = strikethroughRef.current;

    const startStrikethrough = () => {
      if (element) element.classList.add('animate-strikethrough');
    };

    const endStrikethroughAndChangeWord = () => {
      if (element) element.classList.remove('animate-strikethrough');
      setCurrentWord((prev) => (prev + 1) % WORDS.length);
    };

    const syncedInterval = setInterval(() => {
      startStrikethrough();
      setTimeout(endStrikethroughAndChangeWord, 500);
    }, 2000);

    return () => clearInterval(syncedInterval);
  }, []);

  return (
    <section className="relative h-[75vh] flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900">
        {/* Background image */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
            backgroundImage: 'url("/Maze_s_End_5000x.webp")',
            backgroundPosition: 'center 37%'
          }}
        />
        
        {/* Dot pattern using Tailwind */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_25px_25px,rgba(255,255,255,0.1)_2px,transparent_0)] bg-[length:50px_50px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-6">
          {/* Main Heading */}
          <h1 className="font-serif font-bold text-4xl md:text-6xl text-me-yellow leading-tight">
            THE MAZE'S END
            <br />
            <div className="relative">
              <span 
                ref={strikethroughRef}
                className="relative inline-block font-handwritten text-4xl md:text-5xl bg-gradient-to-r text-white
                          before:content-[''] before:absolute before:top-1/2 before:left-0 before:h-0.5 
                          before:w-full before:bg-current before:scale-x-0 before:origin-left 
                          before:transition-transform before:duration-500 before:ease-out"
              >
                {WORDS[currentWord]}
              </span>
            </div>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-gray-100 max-w-2xl mx-auto leading-relaxed">
            You are not lost. All Gates lead to the Maze's End...
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4">
            <CtaButton buttonText="Get Started!" buttonHref="/tour" arrowRight={true} />
            <CtaButton buttonText="Learn cEDH" buttonHref="/learn-the-basics" arrowRight={true} />
            <CtaButton buttonText="Cards and Combos" buttonHref="/cards-combos" arrowRight={true} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 max-w-2xl mx-auto">
            {STATS.map((stat: Stat, index: number) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.number}</div>
                <div className="text-gray-200 text-xs md:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/70" />
      </div>
    </section>
  );
}