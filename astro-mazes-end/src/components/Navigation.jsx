import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navigation() {
const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '#' },
    { name: 'Commanders', href: '#commanders' },
    { name: 'Cards and Combos', href: '#cards-combos' },
    { name: 'Tournaments', href: '#tournaments' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-gray-900/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Changed to justify-center to center the navigation */}
        <div className="flex justify-center items-center h-16">
          {/* Desktop Navigation - removed ml-10 to center properly */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-gray-300 ${
                    scrolled ? 'text-gray-100' : 'text-white hover:text-gray-300'
                  }`}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile menu button - positioned absolutely to stay on the right */}
          <div className="md:hidden absolute right-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-md ${scrolled ? 'text-gray-100' : 'text-white'}`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 shadow-lg">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-gray-100 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};