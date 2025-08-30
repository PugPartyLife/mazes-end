import CTACard from "./CtaCard.tsx";

interface CTACardProp {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
}

const CTACardProps = [
  {
    title: "Learn the Basics",
    description:
      "Understanding cEDH fundamentals, from deck construction to winning strategies.",
    buttonText: "Start Learning",
    buttonHref: "/learn-the-basics",
  },
  {
    title: "Deck Building",
    description:
      "Step-by-step guides to building competitive cEDH decks that dominate the meta.",
    buttonText: "Build Your Deck",
    buttonHref: "/deck-building",
  },
  {
    title: "Advanced Strategies",
    description:
      "In-depth articles and videos on advanced tactics, combo execution, and game theory.",
    buttonText: "Explore Strategies",
    buttonHref: "/strategies",
  },
];

export default function FeatureSection() {
  return (
    <section className="py-20 bg-gray-800 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-8">
          Learn to <span className="text-me-yellow font-serif">MASTER</span> cEDH!
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-16">
        {CTACardProps.map((item: CTACardProp, index) => (
          <CTACard
            key={item.title} // Add key prop using title (unique identifier)
            title={item.title}
            description={item.description}
            buttonText={item.buttonText}
            buttonHref={item.buttonHref}
          />
        ))}
      </div>
    </section>
  )
}