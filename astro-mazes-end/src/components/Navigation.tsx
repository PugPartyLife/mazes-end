import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

interface NavItem {
  name: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
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
    { name: 'The Format', href: '/the-format' },
    { name: 'Commanders', href: '/commanders' },
    { name: 'Decks', href: '/decks' },
    { name: 'Meta Stats', href: '/stats' },
    { name: 'Coaching', href: '/coaching' },
    { name: 'Feedback', href: '/feedback' },
  ];

  const navItemsMobile: NavItem[] = [
    { name: 'Home', href: '/' },
    { name: 'The Format', href: '/the-format' },
    { name: 'Commanders', href: '/commanders' },
    { name: 'Decks', href: '/decks' },
    { name: 'Meta Stats', href: '/stats' },
    { name: 'Coaching', href: '/coaching' },
    { name: 'Feedback', href: '/feedback' },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-black/95 backdrop-blur-md shadow-lg border-b border-yellow-400/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-24 relative">
          {/* Brand */}
          <a
            href="/"
            className="flex items-center gap-3 absolute left-0 top-1/2 -translate-y-1/2 font-cinzel font-bold tracking-wide transition-all duration-300 text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]"
            aria-label="Learn cEDH Home"
          >
            <Logo size={150} />
            {/* <span className="text-xl">Learn cEDH</span> */}
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-1">
              {navItems.map((item: NavItem) => (
                <a
                  key={item.name}
                  href={item.disabled ? '#' : item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-200 group ${
                    item.disabled 
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                  onClick={item.disabled ? (e) => e.preventDefault() : undefined}
                >
                  <span className="relative z-10">{item.name}</span>
                  {!item.disabled && (
                    <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/10 rounded transition-all duration-200" />
                  )}
                  {!item.disabled && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-yellow-400 group-hover:w-3/4 transition-all duration-200" />
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Donate Button */}
          <a
            href="/donate"
            className="hidden lg:inline-flex absolute right-0 top-1/2 -translate-y-1/2 px-6 py-2 bg-transparent border-2 border-yellow-400 text-white font-semibold rounded transition-all duration-200 hover:border-yellow-300 hover:text-yellow-300 hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]"
          >
            Donate
          </a>

          {/* Mobile menu button */}
          <div className="lg:hidden absolute right-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md transition-colors duration-200 text-yellow-400 hover:bg-yellow-400/10"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 backdrop-blur-md shadow-lg border-b border-yellow-400/20">
            {navItemsMobile.map((item: NavItem) => (
              <a
                key={item.name}
                href={item.disabled ? '#' : item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`block px-3 py-2 text-base font-medium rounded-md transition-all duration-200 ${
                  item.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-400/10'
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