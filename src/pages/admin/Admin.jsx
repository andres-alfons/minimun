import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import logo from '../../assets/logo.webp'
import '../../styles/admin.css'
import Resumen from './Resumen.jsx'
import Clientes from './Clientes.jsx'
import Premios from './Premios.jsx'
import Codigos from './Codigos.jsx'
import Ajustes from './Ajustes.jsx'

export default function Admin() {
  const [sesion, setSesion] = useState(undefined) // undefined = cargando
  const [esAdmin, setEsAdmin] = useState(null)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) { setEsAdmin(null); return }
    supabase.rpc('es_admin').then(({ data }) => setEsAdmin(!!data))
  }, [sesion])

  useEffect(() => {
    if (!esAdmin) return
    const cargar = () =>
      supabase.from('premios').select('id', { count: 'exact', head: true }).eq('entregado', false)
        .then(({ count }) => setPendientes(count ?? 0))
    cargar()
    const t = setInterval(cargar, 30000)
    return () => clearInterval(t)
  }, [esAdmin])

  if (sesion === undefined) return <div className="ad" />
  if (!sesion) return <Login />
  if (esAdmin === null) return <div className="ad" />
  if (!esAdmin) return <SinPermiso correo={sesion.user.email} />

  return (
    <div className="ad">
      <header className="ad-top">
        <div className="in">
          <img src={logo} alt="" />
          <div><b>minimum</b><small>Panel</small></div>
          <button className="salir" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
        <nav className="ad-tabs" aria-label="Secciones">
          <NavLink to="/admin" end>Resumen</NavLink>
          <NavLink to="/admin/clientes">Clientes</NavLink>
          <NavLink to="/admin/premios">Premios{pendientes > 0 && <span className="num">{pendientes}</span>}</NavLink>
          <NavLink to="/admin/codigos">Códigos QR</NavLink>
          <NavLink to="/admin/ajustes">Ajustes</NavLink>
        </nav>
      </header>
      <main className="ad-main">
        <Routes>
          <Route index element={<Resumen />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<Clientes />} />
          <Route path="premios" element={<Premios alCambiar={setPendientes} />} />
          <Route path="codigos" element={<Codigos />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function Login() {
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  async function entrar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError(''); setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: f.get('correo').toString().trim(), password: f.get('clave').toString(),
    })
    setCargando(false)
    if (error) setError('Correo o contraseña incorrectos.')
  }
  return (
    <div className="ad">
      <div className="login">
        <form onSubmit={entrar}>
          <img src={logo} alt="" />
          <h1>Panel de minimum</h1>
          <p>Entra con tu correo y contraseña.</p>
          <label>Correo<input id="correo" name="correo" type="email" autoComplete="email" required /></label>
          <label>Contraseña<input id="clave" name="clave" type="password" autoComplete="current-password" required /></label>
          {error && <div className="aviso error" role="alert">{error}</div>}
          <button className="boton" type="submit" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  )
}

function SinPermiso({ correo }) {
  return (
    <div className="ad">
      <div className="login">
        <form onSubmit={(e) => { e.preventDefault(); supabase.auth.signOut() }}>
          <img src={logo} alt="" />
          <h1>Sin acceso al panel</h1>
          <p>La cuenta {correo} no está registrada como administradora. Agrégala en Supabase con el paso final del archivo esquema.sql.</p>
          <button className="boton" type="submit">Salir</button>
        </form>
      </div>
    </div>
  )
}
