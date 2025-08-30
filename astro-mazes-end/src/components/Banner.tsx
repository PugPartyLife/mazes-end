import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import CtaButton from '../components/CtaButton.tsx';

interface Stat {
  number: string;
  label: string;
}

export default function Banner() {
  const [currentWord, setCurrentWord] = useState<number>(0);
  const words: string[] = ['1. Learn', '2. Study', '3. Practice', '4. Win'];

  useEffect(() => {
    const element = document.getElementById('strikethrough-word');

    const strikethroughInterval = setInterval(() => {
      if (element) {
        element.classList.add('line-through');
        setTimeout(() => {
          element.classList.remove('line-through');
        }, 200);
      }
    }, 1800);

    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2000);
    
    return function() {
      clearInterval(interval);
      clearInterval(strikethroughInterval);
    }
  }, []);

  const stats: Stat[] = [
    { number: '42', label: 'Commanders' },
    { number: '42', label: 'Cards' },
    { number: '42', label: 'Decks' },
    { number: '42', label: 'Tournaments' },
  ];

  return (
    <section className="relative h-[75vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900">
        {/* Background image across entire banner */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{
//            backgroundImage: 'url("https://cards.scryfall.io/large/front/4/0/401f7042-24fd-42a0-ae7c-e6b7de1aa446.jpg?1562906764")',
//            backgroundImage: 'url("/mazesend.jpg")',
            backgroundImage: 'url("/Maze_s_End_5000x.webp")',
            backgroundPosition: 'center 37%'
          }}
        ></div>
        
        {/* Simple pattern background instead of problematic SVG */}
        <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0)',
            backgroundSize: '50px 50px'
            }}></div>
        </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-6">
              {/* Main Heading */}
              <h1 className="font-serif font-bold text-4xl md:text-6xl text-me-yellow leading-tight">
                  THE MAZE'S END
                <br />
                <div className="relative">
                    <span id="strikethrough-word" className=" font-handwritten text-4xl md:text-5xl bg-gradient-to-r text-white">
                    {words[currentWord]}
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
            {stats.map((stat: Stat, index: number) => (
                <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.number}</div>
                <div className="text-gray-200 text-xs md:text-sm">{stat.label}</div>
                </div>
            ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-white/70" />
        </div>
    </section>
    );
}