import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import CtaButton from '../components/CtaButton.tsx';

interface Stat {
  number: string;
  label: string;
}

interface DatabaseSummary {
  totalTournaments: number;
  totalPlayers: number;
  totalDecks: number;
  totalCards: number;
  totalDeckCards: number;
  latestTournament: string;
  databasePath: string;
}

interface Guide {
  id: number;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  readingTime?: number;
  coverImage?: {
    url: string;
    alternativeText?: string;
  };
}

const STEPS = ['1. Learn', '2. Study', '3. Practice', '4. Win'] as const;

// GraphQL query for database summary
const SUMMARY_QUERY = `
  query GetDatabaseSummary {
    summary {
      totalTournaments
      totalPlayers
      totalDecks
      totalCards
      totalDeckCards
      latestTournament
      databasePath
    }
  }
`;

export default function Banner() {
  const [step, setStep] = useState<number>(0);
  const [stats, setStats] = useState<Stat[]>([
    { number: '...', label: 'Tournaments' },
    { number: '...', label: 'Players' },
    { number: '...', label: 'Decks' },
    { number: '...', label: 'Cards' },
  ]);
  const [loading, setLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [latestGuide, setLatestGuide] = useState<Guide | null>(null);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: SUMMARY_QUERY,
          }),
        });

        const { data } = await response.json();
        
        if (data?.summary) {
          const summary: DatabaseSummary = data.summary;
          
          // Format numbers with commas for display
          const formatNumber = (num: number): string => {
            return num.toLocaleString();
          };

          setStats([
            { number: formatNumber(summary.totalTournaments), label: 'Tournaments' },
            { number: formatNumber(summary.totalPlayers), label: 'Players' },
            { number: formatNumber(summary.totalDecks), label: 'Decks' },
            { number: formatNumber(summary.totalCards), label: 'Cards' },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch database summary:', error);
        // Keep loading state or show fallback stats
        setStats([
          { number: 'N/A', label: 'Tournaments' },
          { number: 'N/A', label: 'Players' },
          { number: 'N/A', label: 'Decks' },
          { number: 'N/A', label: 'Cards' },
        ]);
      } finally {
        setLoading(false);
      }
    };

const fetchLatestGuide = async () => {
  try {
    const response = await fetch('http://localhost:1337/api/guides?sort[0]=createdAt:desc&pagination[limit]=1&populate=*');
    const result = await response.json();
    
    if (result.data && result.data.length > 0) {
      const guide = result.data[0];
      setLatestGuide({
        id: guide.id,
        title: guide.title,
        slug: guide.slug,
        description: guide.description,
        category: guide.category,
        readingTime: guide.readingTime,
        coverImage: guide.coverImage ? {
          url: guide.coverImage.url,
          alternativeText: guide.coverImage.alternativeText
        } : undefined
      });
    }
  } catch (error) {
    console.error('Failed to fetch latest guide:', error);
  }
};

    fetchSummary();
    fetchLatestGuide();
  }, []);

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      {/* Background with the Learn cEDH image */}
      <div className="absolute inset-0">
        {/* Base dark overlay */}
        <div className="absolute inset-0 bg-black/60 z-10" />
        
        {/* Background image */}
        <img 
          src="https://images.squarespace-cdn.com/content/v1/66d4c645ed0ce01b2a43afcb/f7fbba87-36db-4fe4-83bf-783c07c65973/Homepage+Banner%400.5x.jpg"
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-50' : 'opacity-50'}`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-pattern opacity-30 z-20" />
      </div>

      {/* Content */}
      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8 animate-fadeIn">
          {/* Two Column CTA Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 max-w-4xl mx-auto pt-40 md:pt-48">
            {/* Start Learning Column */}
            <div className="group">
              <a href="#path-to-victory" className="block pb-10">
                <h2 className="font-cinzel text-4xl md:text-5xl lg:text-6xl gradient-text font-bold mb-6 group-hover:scale-105 transition-transform duration-300">
                  Start Learning
                </h2>
                <div className="transition-transform duration-500 group-hover:translate-y-10">
                  <div className="flex justify-center mb-6">
                    <img 
                      src="https://images.squarespace-cdn.com/content/66d4c645ed0ce01b2a43afcb/ab859074-ca9d-4e39-a00c-c4a4a4ca7091/down-arrow-icon-480x512-4enkcnra.png?content-type=image%2Fpng" 
                      alt="Down Arrow Icon" 
                      className="w-32 h-32 md:w-32 md:h-32 filter brightness-0 invert"
                    />
                  </div>
                  <p className="text-gray-400 text-lg md:text-xl">Begin your journey with guides and tutorials</p>
                </div>
              </a>
            </div>

            {/* Discover Decks Column */}
<div className="group">
  <a href="/decks" className="block mb-8">
    <h2 className="font-cinzel text-4xl md:text-5xl lg:text-6xl gradient-text font-bold group-hover:scale-105 transition-transform duration-300">
      Discover Decks
    </h2>
  </a>
  
  {/* Latest Guide Panel */}
  {latestGuide && (
    <div>
      <h3 className="text-yellow-400 font-semibold mb-3 text-sm">Latest Guide</h3>
      <article className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors max-w-[70%] mx-auto">
        {latestGuide.coverImage?.url && (
          <img 
            src={latestGuide.coverImage.url.startsWith('http') 
              ? latestGuide.coverImage.url 
              : `http://localhost:1337${latestGuide.coverImage.url}`
            } 
            alt={latestGuide.coverImage.alternativeText || latestGuide.title}
            className="w-full h-40 object-cover"
          />
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            {latestGuide.category && (
              <span className="bg-gray-800 px-2 py-0.5 rounded text-xs">
                {latestGuide.category}
              </span>
            )}
            {latestGuide.readingTime && (
              <span className="text-xs">{latestGuide.readingTime} min read</span>
            )}
          </div>
          
          <h2 className="text-lg font-bold text-white mb-2">
            <a href={`/guides/${latestGuide.slug}`} className="hover:text-yellow-400 transition-colors">
              {latestGuide.title}
            </a>
          </h2>
          
          {latestGuide.description && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">{latestGuide.description}</p>
          )}
          
          <a 
            href={`/guides/${latestGuide.slug}`} 
            className="inline-block text-yellow-400 text-sm hover:underline"
          >
            Read guide →
          </a>
        </div>
      </article>
    </div>
  )}
  
  {/* Moved subtext below guide panel */}
  <p className="text-gray-400 text-lg md:text-xl mt-6 mb-4">Explore winning strategies and decklists</p>
</div>
          </div>

          {/* Stats 
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-20 max-w-4xl mx-auto">
            {stats.map((stat: Stat, index: number) => (
              <div 
                key={index} 
                className="text-center group cursor-pointer"
              >
                <div className="relative">
                  <div className={`text-4xl md:text-5xl font-bold gradient-text transition-all duration-300 group-hover:scale-110 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {stat.number}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="text-gray-400 text-sm md:text-base mt-2 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div> */}
        </div>
      </div>
    </section>
  );
}