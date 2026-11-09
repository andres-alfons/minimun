import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { fechaHora, mensajeError } from '../../lib/datos.js'
import { formatoCodigo, urlCodigo } from '../../lib/config.js'

export default function Ajustes() {
  const [meta, setMeta] = useState('')
  const [aviso, setAviso] = useState(null)
  const [qr, setQr] = useState(undefined) // undefined = sin buscar, null = no existe

  useEffect(() => {
    supabase.from('configuracion').select('meta_postres').eq('id', 1).single()
      .then(({ data }) => data && setMeta(String(data.meta_postres)))
  }, [])

  async function guardarMeta(e) {
    e.preventDefault()
    const n = parseInt(meta, 10)
    if (!(n >= 1 && n <= 50)) return setAviso({ tipo: 'error', texto: 'La meta debe estar entre 1 y 50 postres.' })
    const { error } = await supabase.from('configuracion').update({ meta_postres: n, actualizado_en: new Date().toISOString() }).eq('id', 1)
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: `Meta guardada: ${n} compras y el siguiente es gratis.` })
  }

  async function buscarQr(e) {
    e.preventDefault()
    const codigo = new FormData(e.currentTarget).get('codigo').toString().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!codigo) return
    const { data } = await supabase.from('codigos_qr').select('id, codigo, lote, usado, usado_en, clientes(id, nombre)').eq('codigo', codigo).maybeSingle()
    setQr(data ?? null)
  }

  async function reactivar() {
    const { error } = await supabase.rpc('reactivar_codigo', { p_codigo: qr.id })
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error) })
    setAviso({ tipo: 'ok', texto: `El código ${formatoCodigo(qr.codigo)} vuelve a estar disponible.` })
    setQr({ ...qr, usado: false, usado_en: null, clientes: null })
  }

  return (
    <>
      <div className="ad-cab"><div><h1>Ajustes</h1></div></div>
      {aviso && <div className={`aviso ${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <section className="card">
        <h2>Meta del premio</h2>
        <p className="sub">Cuántas compras necesita un cliente para ganar el siguiente postre gratis. Si la cambias, aplica para todos desde ahora.</p>
        <form className="fila" onSubmit={guardarMeta}>
          <label style={{ flex: '0 1 160px' }}>Compras<input id="meta" type="number" min="1" max="50" value={meta} onChange={(e) => setMeta(e.target.value)} /></label>
          <button className="boton" type="submit">Guardar</button>
        </form>
      </section>

      <section className="card">
        <h2>Revisar un código QR</h2>
        <p className="sub">Escribe el código que aparece debajo del QR para ver si ya se usó. Si un cliente tuvo un problema, puedes habilitarlo de nuevo.</p>
        <form className="fila" onSubmit={buscarQr}>
          <label>Código<input id="codigo" name="codigo" placeholder="Ej: K7Q2-XA9M" autoCapitalize="characters" /></label>
          <button className="boton sec" type="submit">Buscar</button>
        </form>
        {qr === null && <div className="aviso error">No existe ningún QR con ese código.</div>}
        {qr && (
          <ul className="historial">
            <li><span className="f">Código</span><code className="mono">{formatoCodigo(qr.codigo)}</code></li>
            <li><span className="f">Lote</span>{qr.lote}</li>
            <li>
              <span className="f">Estado</span>
              {qr.usado ? <span className="chip neutro">Usado {fechaHora(qr.usado_en)}</span> : <span className="chip ok">Disponible</span>}
            </li>
            {qr.clientes && <li><span className="f">Lo usó</span><Link to={`/admin/clientes/${qr.clientes.id}`}>{qr.clientes.nombre}</Link></li>}
            <li><span className="f">Enlace</span><span className="sub mono" style={{ wordBreak: 'break-all' }}>{urlCodigo(qr.codigo)}</span></li>
            {qr.usado && (
              <li>
                <span className="f sub">Habilitarlo no borra la compra registrada. Si fue un error, anula la compra en el perfil del cliente.</span>
                <button className="boton peq naranja" onClick={reactivar}>Habilitar de nuevo</button>
              </li>
            )}
          </ul>
        )}
      </section>
    </>
  )
}
