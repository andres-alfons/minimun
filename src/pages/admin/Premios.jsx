import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { fecha, mensajeError, traerTodo } from '../../lib/datos.js'
import { formatoCelular } from '../../lib/config.js'

export default function Premios({ alCambiar }) {
  const [filas, setFilas] = useState(null)
  const [vista, setVista] = useState('pendientes')
  const [busca, setBusca] = useState('')
  const [aviso, setAviso] = useState(null)

  async function cargar() {
    try {
      const data = await traerTodo(() =>
        supabase.from('premios').select('id, codigo, fecha_ganado, entregado, fecha_entrega, clientes(id, nombre, celular)')
          .order('fecha_ganado', { ascending: false }))
      setFilas(data)
      alCambiar?.(data.filter((p) => !p.entregado).length)
    } catch (e) { setAviso({ tipo: 'error', texto: mensajeError(e) }) }
  }
  useEffect(() => { cargar() }, [])

  async function entregar(p) {
    const { error } = await supabase.from('premios').update({ entregado: true, fecha_entrega: new Date().toISOString() }).eq('id', p.id)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: `Premio ${p.codigo} de ${p.clientes?.nombre ?? 'cliente'} entregado.` })
    cargar()
  }

  const visibles = useMemo(() => {
    if (!filas) return []
    const q = busca.trim().toUpperCase()
    return filas
      .filter((p) => (vista === 'pendientes' ? !p.entregado : p.entregado))
      .filter((p) => !q || p.codigo.includes(q) || p.clientes?.nombre.toUpperCase().includes(q) || p.clientes?.celular.includes(q.replace(/\D/g, '') || '—'))
  }, [filas, vista, busca])

  const pendientes = filas?.filter((p) => !p.entregado).length ?? 0

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Premios</h1>
          <p>Cuando alguien llegue con su cupón, búscalo por código y márcalo como entregado.</p>
        </div>
      </div>
      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}
      <section className="card">
        <div className="fila">
          <label>Buscar<input id="busca-premio" placeholder="Código del cupón, nombre o celular" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
          <div className="fila" role="group" aria-label="Filtrar premios">
            <button className={`boton peq${vista === 'pendientes' ? '' : ' sec'}`} onClick={() => setVista('pendientes')}>Por entregar ({pendientes})</button>
            <button className={`boton peq${vista === 'entregados' ? '' : ' sec'}`} onClick={() => setVista('entregados')}>Entregados</button>
          </div>
        </div>
        {!filas ? <p className="vacio">Cargando…</p> : visibles.length === 0 ? (
          <p className="vacio">{vista === 'pendientes' ? 'No hay premios por entregar.' : 'Aún no se ha entregado ningún premio.'}</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Cupón</th><th>Cliente</th><th className="ocultar-movil">Ganado</th><th /></tr></thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.codigo}</code></td>
                    <td>
                      {p.clientes ? <Link to={`/admin/clientes/${p.clientes.id}`}>{p.clientes.nombre}</Link> : '—'}
                      {p.clientes && <div className="sub mono">{formatoCelular(p.clientes.celular)}</div>}
                    </td>
                    <td className="ocultar-movil">{fecha(p.fecha_ganado)}</td>
                    <td className="num">
                      {p.entregado
                        ? <span className="chip ok">Entregado {fecha(p.fecha_entrega)}</span>
                        : <button className="boton peq" onClick={() => entregar(p)}>Entregado</button>}
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
