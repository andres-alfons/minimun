import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { enlaceWhatsApp, limpiarCelular, ordinal } from '../lib/config.js'
import { lanzarConfeti } from '../components/confeti.js'
import Fondo from '../components/Fondo.jsx'
import Marca from '../components/Marca.jsx'
import Hero from '../components/Hero.jsx'
import Pie from '../components/Pie.jsx'
import BotonInstagram from '../components/BotonInstagram.jsx'
import logo from '../assets/logo.webp'
import '../styles/cliente.css'

const ERRORES = {
  codigo_invalido: 'Este código no existe. Revisa que hayas escaneado el QR completo.',
  codigo_usado: 'Este código ya se usó.',
  celular_invalido: 'El celular debe tener 10 dígitos.',
  falta_nombre: 'Escribe tu nombre para continuar.',
  red: 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.',
}

export default function Canje() {
  const { codigo: crudo } = useParams()
  const codigo = (crudo || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

  // paso: cargando | celular | confirmar | registro | progreso | premio | usado | invalido
  const [paso, setPaso] = useState('cargando')
  const [meta, setMeta] = useState(5)
  const [celular, setCelular] = useState('')
  const [cliente, setCliente] = useState(null) // { nombre, compras }
  const [resultado, setResultado] = useState(null) // respuesta de canjear_codigo
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vivo = true
    supabase.rpc('estado_codigo', { p_codigo: codigo }).then(({ data, error }) => {
      if (!vivo) return
      if (error) { setError(ERRORES.red); setPaso('celular'); return }
      setMeta(data.meta)
      setPaso(!data.existe ? 'invalido' : data.usado ? 'usado' : 'celular')
    })
    return () => { vivo = false }
  }, [codigo])

  async function enviarCelular(e) {
    e.preventDefault()
    const cel = limpiarCelular(celular)
    if (cel.length !== 10) return setError(ERRORES.celular_invalido)
    setError(''); setEnviando(true)
    const { data, error } = await supabase.rpc('buscar_cliente', { p_codigo: codigo, p_celular: cel })
    setEnviando(false)
    if (error) return setError(ERRORES.red)
    if (data.error === 'codigo_invalido') return setPaso('usado')
    setCelular(cel)
    if (data.encontrado) { setCliente(data); setPaso('confirmar') }
    else setPaso('registro')
  }

  async function canjear(nombre = null) {
    setError(''); setEnviando(true)
    const { data, error } = await supabase.rpc('canjear_codigo', {
      p_codigo: codigo, p_celular: celular, p_nombre: nombre,
    })
    setEnviando(false)
    if (error) return setError(ERRORES.red)
    if (data.error === 'codigo_usado') return setPaso('usado')
    if (data.error) return setError(ERRORES[data.error] || ERRORES.red)
    setResultado(data)
    setPaso(data.premio ? 'premio' : 'progreso')
  }

  function enviarNombre(e) {
    e.preventDefault()
    const nombre = new FormData(e.currentTarget).get('nombre')?.toString().trim() || ''
    if (nombre.length < 2) return setError(ERRORES.falta_nombre)
    canjear(nombre)
  }

  return (
    <div className="cl">
      <Fondo />
      <main className="app">
        <Marca />
        <Hero codigo={paso === 'invalido' ? null : codigo} meta={meta} />

        {paso === 'cargando' && (
          <section className="panel cargando" aria-live="polite">
            <div className="giro" />
            <p>Revisando tu código…</p>
          </section>
        )}

        {paso === 'celular' && (
          <section className="panel paso">
            <h2>Suma este postre a tu tarjeta</h2>
            <p>Escribe tu número de celular. Si es tu primera vez, te registramos en un segundo.</p>
            <form className="campo" onSubmit={enviarCelular} noValidate>
              <label htmlFor="cel">Celular</label>
              <input id="cel" inputMode="numeric" autoComplete="tel" placeholder="300 123 4567" maxLength={16}
                value={celular} onChange={(e) => setCelular(e.target.value)} autoFocus />
              <span className="error" role="alert">{error}</span>
              <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Buscando…' : 'Continuar'}</button>
            </form>
          </section>
        )}

        {paso === 'confirmar' && cliente && (
          <section className="panel paso">
            <h2>¿Eres tú?</h2>
            <div className="quien">
              <div className="avatar">{cliente.nombre.charAt(0).toUpperCase()}</div>
              <div>
                <b>{cliente.nombre}</b>
                <small>Llevas {cliente.compras} de {meta} postres</small>
              </div>
            </div>
            <span className="error" role="alert">{error}</span>
            <button className="btn" type="button" onClick={() => canjear()} disabled={enviando}>
              {enviando ? 'Registrando…' : 'Sí, registrar mi postre'}
            </button>
            <button className="link" type="button" onClick={() => { setError(''); setPaso('celular') }}>
              No soy yo, usar otro número
            </button>
          </section>
        )}

        {paso === 'registro' && (
          <section className="panel paso">
            <h2>Bienvenida, bienvenido</h2>
            <p>Es tu primer postre con nosotros. Solo necesitamos tu nombre.</p>
            <form className="campo" onSubmit={enviarNombre} noValidate>
              <label htmlFor="nom">Nombre</label>
              <input id="nom" name="nombre" autoComplete="name" placeholder="Tu nombre" maxLength={40} autoFocus />
              <span className="error" role="alert">{error}</span>
              <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear mi tarjeta'}</button>
            </form>
          </section>
        )}

        {paso === 'progreso' && resultado && <Progreso r={resultado} />}
        {paso === 'premio' && resultado && <Premio r={resultado} />}

        {paso === 'usado' && (
          <section className="panel usado paso">
            <div className="x" aria-hidden="true">×</div>
            <h2>Este código ya se usó</h2>
            <p>Cada QR suma un solo postre. Si crees que es un error, escríbenos y lo revisamos.</p>
          </section>
        )}

        {paso === 'invalido' && (
          <section className="panel usado paso">
            <div className="x" aria-hidden="true">?</div>
            <h2>No encontramos este código</h2>
            <p>Vuelve a escanear el QR que viene debajo de tu postre. Si sigue sin funcionar, escríbenos.</p>
          </section>
        )}

        <Pie />
      </main>
      {paso !== 'premio' && <BotonInstagram />}
    </div>
  )
}

function Progreso({ r }) {
  const barra = useRef(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (barra.current) barra.current.style.width = `${(r.compras / r.meta) * 100}%`
    })
    return () => cancelAnimationFrame(id)
  }, [r])
  const faltan = r.meta - r.compras
  return (
    <section className="panel paso">
      <span className="eyebrow">Compra registrada</span>
      <div className="contador">
        <span className="n">{r.compras}</span>
        <span className="de">de {r.meta} postres</span>
      </div>
      <div className="barra"><i ref={barra} /></div>
      <div className="sellos">
        {Array.from({ length: r.meta + 1 }, (_, i) => i + 1).map((n) =>
          n === r.meta + 1 ? (
            <div key={n} className="sello regalo">Gratis</div>
          ) : (
            <div key={n}
              className={`sello${n <= r.compras ? ' lleno' : ''}${n === r.compras ? ' nuevo' : ''}`}
              aria-label={n <= r.compras ? `Postre ${n} registrado` : 'Pendiente'}>
              {n}
            </div>
          )
        )}
      </div>
      <p>
        {r.nombre.split(' ')[0]}, te {faltan === 1 ? 'falta 1 postre' : `faltan ${faltan} postres`} para el gratis.
        Este código ya quedó usado.
      </p>
    </section>
  )
}

function Premio({ r }) {
  const lienzo = useRef(null)
  useEffect(() => { lanzarConfeti(lienzo.current) }, [])
  const wsp = enlaceWhatsApp({ nombre: r.nombre, celular: r.celular, cupon: r.premio })
  return (
    <section className="panel premio paso">
      <canvas ref={lienzo} aria-hidden="true" />
      <div className="aura">
        <span className="anillo" />
        <img src={logo} alt="" width="112" height="112" />
        <span className="estrella" aria-hidden="true">★</span>
      </div>
      <span className="eyebrow">¡Completaste tu tarjeta!</span>
      <h2>{r.nombre.split(' ')[0]}, tu {ordinal(r.meta + 1)} postre es <em>gratis</em></h2>
      <div className="mini" aria-label={`${r.meta} compras y 1 postre gratis`}>
        {Array.from({ length: r.meta }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}
        <i className="g" style={{ animationDelay: `${r.meta * 0.08}s` }}>★</i>
      </div>
      <div className="cupon">
        <div className="izq"><b>1 postre gratis</b><small>Válido en tu próxima compra</small></div>
        <div className="der"><small>Código</small><code>{r.premio}</code></div>
      </div>
      <a className="btn-wsp" href={wsp} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20z" />
        </svg>
        Enviar mi cupón por WhatsApp
      </a>
      <p className="nota-wsp">Se abre WhatsApp con tu cupón listo para enviar. Así no lo pierdes.</p>
      <ol className="pasos">
        <li><span>1</span>Envía tu cupón por WhatsApp con el botón de arriba.</li>
        <li><span>2</span>Muestra el mensaje o el código al reclamar tu postre.</li>
        <li><span>3</span>Tu tarjeta vuelve a empezar para que sigas sumando.</li>
      </ol>
    </section>
  )
}
