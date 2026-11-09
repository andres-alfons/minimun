import logo from '../assets/logo.webp'

export default function Marca() {
  return (
    <header className="marca">
      <img src={logo} alt="" width="46" height="46" />
      <div className="t">
        <b>minimum</b>
        <span>Club de postres</span>
      </div>
    </header>
  )
}
