import { useMemo } from 'react'

// Tela naranja difuminada con chispas suaves.
export default function Fondo() {
  const chispas = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${(Math.random() * 5).toFixed(2)}s`,
        animationDuration: `${(4 + Math.random() * 4).toFixed(2)}s`,
        key: i,
      })),
    []
  )
  return (
    <div className="telon" aria-hidden="true">
      <div className="foto" />
      <div className="tinte" />
      <div className="chispas">
        {chispas.map(({ key, ...style }) => <i key={key} style={style} />)}
      </div>
    </div>
  )
}
