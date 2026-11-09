import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { fecha, fechaHora, mensajeError, traerTodo } from '../../lib/datos.js'
import { formatoCelular, formatoCodigo, limpiarCelular } from '../../lib/config.js'

export default function Clientes() {
  const { id } = useParams()
  return id ? <Detalle id={id} /> : <Lista />
}

function Lista() {
  const navegar = useNavigate()
  const [filas, setFilas] = useState(null)
  const [meta, setMeta] = useState(5)
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      traerTodo(() => supabase.from('clientes').select('id, nombre, celular, compras_acumuladas, creado_en, premios(entregado)')),
      supabase.from('configuracion').select('meta_postres').eq('id', 1).single(),
    ])
      .then(([c, conf]) => { setFilas(c); if (conf.data) setMeta(conf.data.meta_postres) })
      .catch((e) => setError(mensajeError(e)))
  }, [])

  const visibles = useMemo(() => {
    if (!filas) return []
    const q = busca.trim().toLowerCase()
    const qNum = q.replace(/\D/g, '')
    let r = filas.filter((c) => !q || c.nombre.toLowerCase().includes(q) || (qNum && c.celular.includes(qNum)))
    const premios = (c) => c.premios.length
    if (orden === 'reciente') r = [...r].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
    if (orden === 'cerca') r = [...r].sort((a, b) => b.compras_acumuladas - a.compras_acumuladas)
    if (orden === 'fieles') r = [...r].sort((a, b) => premios(b) - premios(a) || b.compras_acumuladas - a.compras_acumuladas)
    if (orden === 'nombre') r = [...r].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return r
  }, [filas, busca, orden])

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Clientes</h1>
          <p>{filas ? `${filas.length} registrados` : 'Cargando…'}</p>
        </div>
      </div>
      <section className="card">
        <div className="fila">
          <label>Buscar<input id="busca" placeholder="Nombre o celular" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
          <label style={{ flex: '0 1 200px' }}>Ordenar
            <select id="orden" value={orden} onChange={(e) => setOrden(e.target.value)}>
              <option value="reciente">Más recientes</option>
              <option value="cerca">Más cerca del premio</option>
              <option value="fieles">Más premios ganados</option>
              <option value="nombre">Por nombre</option>
            </select>
          </label>
        </div>
        {error && <div className="aviso error">{error}</div>}
        {filas && visibles.length === 0 && (
          <p className="vacio">{filas.length === 0 ? 'Aún no hay clientes. Se registran solos al escanear su primer QR.' : 'No hay clientes con esa búsqueda.'}</p>
        )}
        {visibles.length > 0 && (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Nombre</th><th className="ocultar-movil">Celular</th><th>Tarjeta</th><th className="num">Premios</th></tr>
              </thead>
              <tbody>
                {visibles.map((c) => (
                  <tr key={c.id} className="clic" onClick={() => navegar(`/admin/clientes/${c.id}`)}>
                    <td>{c.nombre}</td>
                    <td className="ocultar-movil mono">{formatoCelular(c.celular)}</td>
                    <td><Sellos n={c.compras_acumuladas} meta={meta} /></td>
                    <td className="num">
                      {c.premios.length}
                      {c.premios.some((p) => !p.entregado) && <> <span className="chip alerta">por entregar</span></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function Sellos({ n, meta }) {
  return (
    <span className="mini-sellos" aria-label={`${n} de ${meta}`} title={`${n} de ${meta}`}>
      {Array.from({ length: meta }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
    </span>
  )
}

function Detalle({ id }) {
  const navegar = useNavigate()
  const [c, setC] = useState(null)
  const [compras, setCompras] = useState([])
  const [premios, setPremios] = useState([])
  const [meta, setMeta] = useState(5)
  const [aviso, setAviso] = useState(null)
  const [editando, setEditando] = useState(false)
  const [confirmar, setConfirmar] = useState(null)

  async function cargar() {
    const [cli, com, pre, conf] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('compras').select('id, fecha, anulada, codigos_qr(codigo)').eq('cliente_id', id).order('fecha', { ascending: false }),
      supabase.from('premios').select('*').eq('cliente_id', id).order('fecha_ganado', { ascending: false }),
      supabase.from('configuracion').select('meta_postres').eq('id', 1).single(),
    ])
    if (cli.error) return setAviso({ tipo: 'error', texto: 'No encontramos este cliente.' })
    setC(cli.data); setCompras(com.data ?? []); setPremios(pre.data ?? [])
    if (conf.data) setMeta(conf.data.meta_postres)
  }
  useEffect(() => { cargar() }, [id])

  async function guardar(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const nombre = f.get('nombre').toString().trim()
    const celular = limpiarCelular(f.get('celular').toString())
    if (nombre.length < 2) return setAviso({ tipo: 'error', texto: 'El nombre es muy corto.' })
    if (celular.length !== 10) return setAviso({ tipo: 'error', texto: 'El celular debe tener 10 dígitos.' })
    const { error } = await supabase.from('clientes').update({ nombre, celular }).eq('id', id)
    if (error) return setAviso({ tipo: 'error', texto: error.code === '23505' ? 'Ese celular ya pertenece a otro cliente.' : mensajeError(error) })
    setEditando(false); setAviso({ tipo: 'ok', texto: 'Datos guardados.' }); cargar()
  }

  async function anular(compra) {
    const { error } = await supabase.rpc('anular_compra', { p_compra: compra })
    setConfirmar(null)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: 'Compra anulada. Se descontó un sello.' }); cargar()
  }

  async function entregar(premio) {
    const { error } = await supabase.from('premios').update({ entregado: true, fecha_entrega: new Date().toISOString() }).eq('id', premio)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: 'Premio marcado como entregado.' }); cargar()
  }

  if (!c) return aviso ? <div className={`aviso ${aviso.tipo}`}>{aviso.texto}</div> : <p className="vacio">Cargando…</p>

  return (
    <>
      <button className="volver" onClick={() => navegar('/admin/clientes')}>← Todos los clientes</button>
      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}
      <div className="dos">
        <section className="card">
          <div className="persona">
            <div className="avatar">{c.nombre.charAt(0)}</div>
            <div>
              <h2>{c.nombre}</h2>
              <p className="sub mono">{formatoCelular(c.celular)} · cliente desde {fecha(c.creado_en)}</p>
            </div>
          </div>
          <p>Tarjeta actual: <Sellos n={c.compras_acumuladas} meta={meta} /> <b>{c.compras_acumuladas} de {meta}</b></p>
          {editando ? (
            <form className="fila" onSubmit={guardar}>
              <label>Nombre<input id="ed-nombre" name="nombre" defaultValue={c.nombre} /></label>
              <label>Celular<input id="ed-celular" name="celular" inputMode="numeric" defaultValue={c.celular} /></label>
              <button className="boton" type="submit">Guardar</button>
              <button className="boton sec" type="button" onClick={() => setEditando(false)}>Cancelar</button>
            </form>
          ) : (
            <div className="fila"><button className="boton sec peq" onClick={() => setEditando(true)}>Editar datos</button></div>
          )}
        </section>

        <section className="card">
          <h2>Premios</h2>
          {premios.length === 0 ? <p className="vacio">Todavía no ha ganado premios.</p> : (
            <ul className="historial">
              {premios.map((p) => (
                <li key={p.id}>
                  <span className="f"><code className="mono">{p.codigo}</code> <span className="sub">· {fecha(p.fecha_ganado)}</span></span>
                  {p.entregado
                    ? <span className="chip ok">Entregado</span>
                    : <button className="boton peq" onClick={() => entregar(p.id)}>Marcar entregado</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Historial de compras</h2>
        <p className="sub">Si una compra se registró por error, anúlala y se descuenta el sello.</p>
        {compras.length === 0 ? <p className="vacio">Sin compras.</p> : (
          <ul className="historial">
            {compras.map((k) => (
              <li key={k.id} className={k.anulada ? 'anulada' : ''}>
                <span className="f">{fechaHora(k.fecha)} {k.codigos_qr && <span className="sub mono">· {formatoCodigo(k.codigos_qr.codigo)}</span>}</span>
                {k.anulada ? <span className="chip neutro">Anulada</span>
                  : confirmar === k.id ? (
                    <>
                      <button className="boton peq" onClick={() => anular(k.id)}>Sí, anular</button>
                      <button className="boton sec peq" onClick={() => setConfirmar(null)}>No</button>
                    </>
                  ) : <button className="boton sec peq" onClick={() => setConfirmar(k.id)}>Anular</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
