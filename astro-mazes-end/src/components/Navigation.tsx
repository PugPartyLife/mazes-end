import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo'

interface NavItem {
  name: string;
  href: string;
  external?: boolean;  // For external links
  disabled?: boolean;  // For disabled nav items
}

export default function Navigation(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: NavItem[] = [
    { name: 'Commanders', href: '/commanders' },
    { name: 'Decks', href: '/decks' },
    { name: 'Cards and Combos', href: '/cards' },
    { name: 'Tournaments', href: '/tournaments' },
  ];

    const navItemsMobile: NavItem[] = [
    { name: 'Home', href: '/' },
    { name: 'Commanders', href: '/commanders' },
    { name: 'Decks', href: '/decks' },
    { name: 'Cards and Combos', href: '/cards' },
    { name: 'Tournaments', href: '/tournaments' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-gray-900/90 backdrop-blur-md shadow-lg border-b border-white/10' : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Keep items centered; add brand at left for identity */}
        <div className="flex justify-center items-center h-16 relative">
          {/* Brand */}
          <a
            href="/"
            className={`hidden lg:flex items-center gap-2 absolute left-0 top-1/2 -translate-y-1/2 font-serif font-bold tracking-wide text-me-yellow ${scrolled ? 'opacity-100 drop-shadow-[0_0_6px_rgba(218,162,28,0.35)]' : 'opacity-90'}`}
            aria-label="The Maze's End Home"
          >
            <Logo size={22} />
            The Maze's End
          </a>
          {/* Desktop Navigation - removed ml-10 to center properly */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-8">
              {navItems.map((item: NavItem) => (
                <a
                  key={item.name}
                  href={item.disabled ? '#' : item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    item.disabled 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : scrolled 
                        ? 'text-gray-200 hover:text-gray-300' 
                        : 'text-gray-100 hover:text-gray-300'
                  }`}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile menu button - positioned absolutely to stay on the right */}
          <div className="lg:hidden absolute right-4">
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
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800 shadow-lg">
            {navItemsMobile.map((item: NavItem) => (
              <a
                key={item.name}
                href={item.disabled ? '#' : item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors duration-200 ${
                  item.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-100 hover:text-gray-300 hover:bg-gray-700'
                }`}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  } else {
                    setIsOpen(false);
                  }
                }}
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
