import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase.js'
import { traerTodo, mensajeError } from '../../lib/datos.js'
import { formatoCodigo, urlCodigo } from '../../lib/config.js'
import '../../styles/imprimir.css'

// Hoja lista para imprimir: 20 stickers por página tamaño carta.
export default function ImprimirLote() {
  const { lote } = useParams()
  const [soloLibres, setSoloLibres] = useState(true)
  const [codigos, setCodigos] = useState(null)
  const [error, setError] = useState('')
  const [avance, setAvance] = useState(0)

  useEffect(() => {
    let vivo = true
    setCodigos(null); setAvance(0)
    ;(async () => {
      try {
        const { data: s } = await supabase.auth.getSession()
        if (!s.session) throw new Error('Inicia sesión en el panel antes de imprimir.')
        const filas = await traerTodo(() => {
          let q = supabase.from('codigos_qr').select('codigo').eq('lote', lote).order('creado_en')
          if (soloLibres) q = q.eq('usado', false)
          return q
        })
        const listos = []
        for (let i = 0; i < filas.length; i++) {
          const img = await QRCode.toDataURL(urlCodigo(filas[i].codigo), {
            errorCorrectionLevel: 'M', margin: 1, width: 240, color: { dark: '#4b1f2a', light: '#ffffff' },
          })
          listos.push({ codigo: filas[i].codigo, img })
          if (i % 25 === 0 && vivo) setAvance(Math.round((i / filas.length) * 100))
        }
        if (vivo) setCodigos(listos)
      } catch (e) { if (vivo) setError(mensajeError(e)) }
    })()
    return () => { vivo = false }
  }, [lote, soloLibres])

  return (
    <div className="hoja">
      <div className="barra-imp no-imprimir">
        <div>
          <b>Lote: {lote}</b>
          <span>{codigos ? `${codigos.length} stickers · ${Math.ceil(codigos.length / 20)} hojas` : error ? '' : `Preparando… ${avance}%`}</span>
        </div>
        <label><input type="checkbox" checked={soloLibres} onChange={(e) => setSoloLibres(e.target.checked)} /> Solo códigos sin usar</label>
        <button onClick={() => window.print()} disabled={!codigos?.length}>Imprimir</button>
      </div>
      {error && <p className="error-imp no-imprimir">{error}</p>}
      {codigos?.length === 0 && <p className="error-imp no-imprimir">Este lote no tiene códigos sin usar.</p>}
      <div className="stickers">
        {codigos?.map((c) => (
          <div className="sticker" key={c.codigo}>
            <img src={c.img} alt="" />
            <b>minimum</b>
            <span>Escanéame y suma tu postre</span>
            <code>{formatoCodigo(c.codigo)}</code>
          </div>
        ))}
      </div>
    </div>
  )
}
