import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { contar, fechaHora, mensajeError, traerTodo } from '../../lib/datos.js'

const DIAS = 14

export default function Resumen() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const desde = new Date(); desde.setHours(0, 0, 0, 0); desde.setDate(desde.getDate() - (DIAS - 1))
    Promise.all([
      contar('clientes'),
      contar('compras', (q) => q.eq('anulada', false)),
      contar('premios', (q) => q.eq('entregado', false)),
      contar('codigos_qr', (q) => q.eq('usado', false)),
      traerTodo(() => supabase.from('compras').select('fecha').eq('anulada', false).gte('fecha', desde.toISOString())),
      supabase.from('compras').select('id, fecha, anulada, clientes(id, nombre)').order('fecha', { ascending: false }).limit(8),
    ])
      .then(([clientes, compras, pendientes, disponibles, recientes, ultimas]) => {
        const porDia = Array.from({ length: DIAS }, (_, i) => {
          const dia = new Date(desde); dia.setDate(desde.getDate() + i)
          return { dia, n: 0 }
        })
        for (const c of recientes) {
          const i = Math.floor((new Date(c.fecha) - desde) / 864e5)
          if (porDia[i]) porDia[i].n++
        }
        setD({ clientes, compras, pendientes, disponibles, porDia, ultimas: ultimas.data ?? [] })
      })
      .catch((e) => setError(mensajeError(e)))
  }, [])

  if (error) return <div className="aviso error">{error}</div>
  if (!d) return <p className="vacio">Cargando…</p>

  const semana = d.porDia.slice(-7).reduce((s, x) => s + x.n, 0)
  const max = Math.max(4, ...d.porDia.map((x) => x.n))
  const tope = Math.ceil(max / 4) * 4

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Hola, así van las ventas</h1>
          <p>Postres registrados con QR y premios por entregar.</p>
        </div>
      </div>

      <div className="cifras">
        <div className="cifra destacada">
          <span>Premios por entregar</span>
          <b>{d.pendientes}</b>
          <small><Link to="/admin/premios">Ver premios</Link></small>
        </div>
        <div className="cifra"><span>Postres esta semana</span><b>{semana}</b><small>últimos 7 días</small></div>
        <div className="cifra"><span>Postres en total</span><b>{d.compras}</b><small>desde el inicio</small></div>
        <div className="cifra"><span>Clientes</span><b>{d.clientes}</b><small>registrados</small></div>
        <div className="cifra">
          <span>QR disponibles</span><b>{d.disponibles}</b>
          <small>{d.disponibles < 50 ? <span className="chip alerta">Quedan pocos</span> : 'sin usar'}</small>
        </div>
      </div>

      <section className="card">
        <h2>Postres por día</h2>
        <p className="sub">Últimos {DIAS} días. Toca una barra para ver el número.</p>
        <div className="grafica">
          <div className="escala" aria-hidden="true">
            {[4, 3, 2, 1, 0].map((k) => <span key={k}>{(tope / 4) * k}</span>)}
          </div>
          <div className="barras" role="img" aria-label={`Postres por día en los últimos ${DIAS} días`}>
            {d.porDia.map((x, i) => (
              <div key={i} className={`b${i === DIAS - 1 ? ' hoy' : ''}`} tabIndex={0}>
                <em>{x.n}</em>
                <i style={{ height: `${(x.n / tope) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="ejes" aria-hidden="true">
            {d.porDia.map((x, i) => (
              <span key={i}>{i % 2 === (DIAS - 1) % 2 ? x.dia.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric' }) : ''}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Últimos postres registrados</h2>
        {d.ultimas.length === 0 ? (
          <p className="vacio">Todavía no hay compras. Cuando alguien escanee un QR aparecerá aquí.</p>
        ) : (
          <ul className="historial">
            {d.ultimas.map((c) => (
              <li key={c.id} className={c.anulada ? 'anulada' : ''}>
                <span className="f">
                  {c.clientes ? <Link to={`/admin/clientes/${c.clientes.id}`}>{c.clientes.nombre}</Link> : 'Cliente borrado'}
                </span>
                <span className="sub">{fechaHora(c.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
