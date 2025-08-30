import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function CtaButton (props: {
  buttonText: string
  buttonHref: string
  arrowRight?: boolean
  arrowLeft?: boolean
}): React.JSX.Element {
  return (
      <button
      onClick={() => window.location.href = props.buttonHref}
      className="cursor-pointer border-2 border-white/30 hover:border-me-yellow text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-all duration-300 backdrop-blur-sm flex items-center gap-2"
      >
        {props.buttonText}
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" display='{props.arrowRight}' />
      </button>
  )
}