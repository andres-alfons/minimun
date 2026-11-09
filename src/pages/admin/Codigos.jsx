import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { fecha, mensajeError } from '../../lib/datos.js'

export default function Codigos() {
  const [lotes, setLotes] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [creando, setCreando] = useState(false)

  async function cargar() {
    const { data, error } = await supabase.rpc('resumen_lotes')
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setLotes(data)
  }
  useEffect(() => { cargar() }, [])

  async function generar(e) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const cantidad = parseInt(f.get('cantidad'), 10)
    const lote = f.get('lote').toString().trim()
    if (!lote) return setAviso({ tipo: 'error', texto: 'Escribe un nombre para el lote, por ejemplo "Noviembre".' })
    if (!(cantidad >= 1 && cantidad <= 2000)) return setAviso({ tipo: 'error', texto: 'La cantidad debe estar entre 1 y 2000.' })
    if (lotes?.some((l) => l.lote.toLowerCase() === lote.toLowerCase()))
      return setAviso({ tipo: 'error', texto: `Ya existe un lote llamado "${lote}". Usa otro nombre.` })
    setCreando(true); setAviso(null)
    const { data, error } = await supabase.rpc('generar_codigos', { p_cantidad: cantidad, p_lote: lote })
    setCreando(false)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: `Listo: ${data} códigos creados en el lote "${lote}". Ya puedes imprimirlos.` })
    form.reset()
    cargar()
  }

  return (
    <>
      <div className="ad-cab">
        <div>
          <h1>Códigos QR</h1>
          <p>Crea lotes de códigos y descárgalos listos para imprimir en hojas de stickers.</p>
        </div>
      </div>
      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <section className="card">
        <h2>Crear un lote nuevo</h2>
        <form className="fila" onSubmit={generar}>
          <label>Nombre del lote<input id="lote" name="lote" placeholder="Ej: Noviembre 2026" maxLength={40} /></label>
          <label style={{ flex: '0 1 140px' }}>Cantidad<input id="cantidad" name="cantidad" type="number" min="1" max="2000" defaultValue="100" /></label>
          <button className="boton" type="submit" disabled={creando}>{creando ? 'Creando…' : 'Crear códigos'}</button>
        </form>
        <p className="sub">Cada código es aleatorio y sirve una sola vez. En una hoja tamaño carta caben 20 stickers.</p>
      </section>

      <section className="card">
        <h2>Lotes</h2>
        {!lotes ? <p className="vacio">Cargando…</p> : lotes.length === 0 ? (
          <p className="vacio">Aún no hay códigos. Crea tu primer lote arriba.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Lote</th><th className="num">Usados</th><th className="ocultar-movil">Creado</th><th /></tr></thead>
              <tbody>
                {lotes.map((l) => {
                  const libres = l.total - l.usados
                  return (
                    <tr key={l.lote}>
                      <td>{l.lote}</td>
                      <td className="num">
                        {l.usados} / {l.total}{' '}
                        {libres === 0 ? <span className="chip neutro">agotado</span> : <span className="chip ok">{libres} libres</span>}
                      </td>
                      <td className="ocultar-movil">{fecha(l.creado_en)}</td>
                      <td className="num">
                        <a className="boton sec peq" href={`/admin/imprimir/${encodeURIComponent(l.lote)}`} target="_blank" rel="noopener">Imprimir</a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
