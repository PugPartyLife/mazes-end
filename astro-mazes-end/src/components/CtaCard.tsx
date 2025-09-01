import CtaButton from './CtaButton.tsx'

export default function CtaCard (props: {
  title: string
  description: string
  buttonText: string
  buttonHref: string
  arrowRight?: boolean
  arrowLeft?: boolean
}): React.JSX.Element {
  return (
    <div className='bg-gray-700 p-8 rounded-lg border border-gray-600'>
      <h3 className='text-2xl font-bold text-white mb-4'>{props.title}</h3>
      <p className='text-gray-300 mb-6'>{props.description}</p>
      <CtaButton buttonText={props.buttonText} buttonHref={props.buttonHref} />
    </div>
  )
}