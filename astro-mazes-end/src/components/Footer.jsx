import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();
  
  const footerSections = [
    {
      title: 'Team',
      links: [
        { name: 'PugParty', href: '#' },
        { name: 'ThreadPool', href: '#' },
      ],
    },
    {
      title: 'Get Competitive',
      links: [
        { name: 'EDHtop16', href: 'https://edhtop16.com/' },
        { name: 'PlayNice', href: 'https://playnicemtg.com/' },
        { name: 'TopDeck.gg', href: 'https://topdeck.gg/' },
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

  const socialLinks = [
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Mail, href: '#', label: 'Email' },
  ];

  return (
    <footer className="bg-me-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent mb-4">
                <span className="text-me-yellow font-serif">THE MAZE'S END</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Wanting to get into cEDH but not sure where to start?
                Looking for the next event near you or major?
                Wanting to develop a competitive mentality or overcome play anxiety?
                Look no further! The Maze's End is your new hub to discover what you find interesting in cEDH!
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors duration-200"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            {footerSections.map((section, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a
                        href={link.href}
                        className="text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        {link.name}
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
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Stay Updated</h3>
              <p className="text-gray-400">Get the latest updates and be the first to try out new functionality.</p>
            </div>
            <div className="flex w-full md:w-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md focus:outline-none focus:border-gray-500 transition-colors duration-200 text-white placeholder-gray-400"
              />
              <button className="cursor-pointer px-6 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-r-md transition-all duration-200 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between text-gray-400 text-sm">
            <p>&copy; {currentYear} ThreadParty Development. All rights reserved.</p>
	    <p className="text-sm">Data provided by:&nbsp;<a className="hover:bg-gray-500 text-white" href="https://topdeck.gg" target="_blank">TopDeck.gg</a></p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors duration-200">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition-colors duration-200">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
