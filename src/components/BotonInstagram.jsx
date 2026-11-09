import { IG_URL } from '../lib/config.js'

export default function BotonInstagram() {
  return (
    <a className="ig-flot" href={IG_URL} target="_blank" rel="noopener noreferrer" aria-label="Ir al Instagram de minimum">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </a>
  )
}
