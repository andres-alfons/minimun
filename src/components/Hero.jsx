import logo from '../assets/logo.webp'
import { formatoCodigo, ordinal } from '../lib/config.js'

export default function Hero({ codigo, meta = 5, eyebrow = 'Gracias por tu compra' }) {
  return (
    <section className="hero" aria-label="Tu postre">
      <img className="sello-logo" src={logo} alt="Logo de minimum" width="68" height="68" />
      <div className="txt">
        <span className="eyebrow">{eyebrow}</span>
        <h1>
          Junta {meta} y el {ordinal(meta + 1)} va <em>por la casa</em>
        </h1>
        {codigo && (
          <span className="codigo">
            Código del QR <code>{formatoCodigo(codigo)}</code>
          </span>
        )}
      </div>
    </section>
  )
}

