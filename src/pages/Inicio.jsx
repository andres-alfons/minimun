import Fondo from '../components/Fondo.jsx'
import Marca from '../components/Marca.jsx'
import Hero from '../components/Hero.jsx'
import Pie from '../components/Pie.jsx'
import BotonInstagram from '../components/BotonInstagram.jsx'
import '../styles/cliente.css'

// Página que ve quien entra a la web sin escanear un QR.
export default function Inicio() {
  return (
    <div className="cl">
      <Fondo />
      <main className="app">
        <Marca />
        <Hero eyebrow="Club de postres" />
        <section className="panel paso">
          <h2>¿Cómo funciona?</h2>
          <ol className="pasos">
            <li><span>1</span>Cada postre trae un código QR debajo.</li>
            <li><span>2</span>Escanéalo con la cámara de tu celular y escribe tu número.</li>
            <li><span>3</span>Al completar tu tarjeta, el siguiente postre es gratis.</li>
          </ol>
        </section>
        <Pie />
      </main>
      <BotonInstagram />
    </div>
  )
}
