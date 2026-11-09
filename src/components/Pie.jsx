import batidor from '../assets/batidor.webp'

export default function Pie() {
  return (
    <footer className="pie">
      <img src={batidor} alt="" width="46" height="85" loading="lazy" />
      <span>Hecho a mano, con mucho cariño. Cada código sirve una sola vez.</span>
    </footer>
  )
}
