import React from 'react';
import { Github, Twitter, Linkedin, Mail, ExternalLink } from 'lucide-react';

interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
  disabled?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
  external?: boolean;
  disabled?: boolean;
}

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const footerSections: FooterSection[] = [
    {
      title: 'Team',
      links: [
        { name: 'FreedomWaffle', href: 'https://freedomwaffle.com/', external: true },
        { name: 'PugParty', href: 'https://ctc-dev.io', external: true },
        { name: 'ThreadPool', href: 'https://threadpooldev.io', external: true },
        { name: 'Revert Creations', href: 'https://revertcreations.com', external: true },
      ],
    },
    {
      title: 'Get Competitive',
      links: [
        { name: 'EDHtop16', href: 'https://edhtop16.com/', external: true },
        { name: 'PlayNice', href: 'https://playnicemtg.com/', external: true },
        { name: 'TopDeck.gg', href: 'https://topdeck.gg/', external: true },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Help', href: '#' },
        { name: 'Find a Coach', href: '#' },
      ],
    },
  ];

  const socialLinks: SocialLink[] = [
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  return (
    <footer className="bg-black text-gray-300 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h3 className="font-cinzel text-3xl text-yellow-400 mb-2">Learn cEDH</h3>
                <div className="w-20 h-0.5 bg-gradient-to-r from-yellow-400 to-transparent"></div>
              </div>
              <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                Wanting to get into cEDH but not sure where to start?
                Wanting to develop a competitive mentality or overcome play anxiety?
                Looking for meta statistics and decklists to stay ahead of the curve or crush the next tournament?
                Look no further! Learn cEDH is your new hub to discover what you find interesting in cEDH!
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social: SocialLink, index: number) => (
                  <a
                    key={index}
                    href={social.disabled ? '#' : social.href}
                    target={social.external ? '_blank' : undefined}
                    rel={social.external ? 'noopener noreferrer' : undefined}
                    aria-label={social.label}
                    className={`w-10 h-10 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center transition-all duration-200 group ${
                      social.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-yellow-400/10 hover:border-yellow-400'
                    }`}
                    onClick={social.disabled ? (e) => e.preventDefault() : undefined}
                  >
                    <social.icon className="w-5 h-5 group-hover:text-yellow-400 transition-colors duration-200" />
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            {footerSections.map((section: FooterSection, index: number) => (
              <div key={index}>
                <h3 className="text-lg font-semibold mb-4 text-yellow-400">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link: FooterLink, linkIndex: number) => (
                    <li key={linkIndex}>
                      <a
                        href={link.disabled ? '#' : link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className={`inline-flex items-center gap-1 transition-all duration-200 group ${
                          link.disabled 
                            ? 'text-gray-600 cursor-not-allowed' 
                            : 'text-gray-400 hover:text-yellow-400'
                        }`}
                        onClick={link.disabled ? (e) => e.preventDefault() : undefined}
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-200">
                          {link.name}
                        </span>
                        {link.external && !link.disabled && (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold mb-2 text-yellow-400">Stay Updated</h3>
              <p className="text-gray-400">Get the latest updates and be the first to try out new functionality.</p>
            </div>
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 bg-gray-900 border border-gray-700 rounded-l-md focus:outline-none focus:border-yellow-400 transition-colors duration-200 text-white placeholder-gray-500"
              />
              <button className="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-r-md transition-all duration-200 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm gap-4">
            <p>&copy; {currentYear} WaffleParty Development. All rights reserved.</p>
            <p>
              Data provided by:{' '}
              <a 
                className="text-yellow-400 hover:text-yellow-300 transition-colors duration-200" 
                href="https://topdeck.gg" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                TopDeck.gg
              </a>
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="hover:text-yellow-400 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors duration-200">
                Terms of Service
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors duration-200">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}