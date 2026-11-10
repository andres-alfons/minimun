export const WSP_USUARIO = import.meta.env.VITE_WSP_USUARIO || 'tina.s_11'
export const IG_USUARIO = import.meta.env.VITE_IG_USUARIO || 'minimum.v'
export const IG_URL = `https://www.instagram.com/${IG_USUARIO}/`

// Dominio que va dentro de cada QR.
// Se limpian espacios, "/" y "." sobrantes al final (un punto final rompe el QR en celulares).
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).trim().replace(/[\/.\s]+$/, '')

export const urlCodigo = (codigo) => `${SITE_URL}/q/${codigo}`

// Muestra los códigos en bloques de 4 para que se lean fácil: K7Q2-XA9M
export const formatoCodigo = (c = '') => c.replace(/(.{4})(?=.)/g, '$1-')

export const limpiarCelular = (t = '') => t.replace(/\D/g, '').slice(-10)

export const formatoCelular = (c = '') =>
  c.length === 10 ? `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}` : c

export function enlaceWhatsApp({ nombre, celular, cupon }) {
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  const texto =
    `¡Hola, minimum! Acabo de ganar mi postre gratis.\n\n` +
    `Nombre: ${nombre}\nCelular: ${formatoCelular(celular)}\nCódigo del cupón: ${cupon}\nFecha: ${hoy}\n\n` +
    `¿Cuándo puedo reclamarlo?`
  const p = new URLSearchParams({ username: WSP_USUARIO, type: 'username', text: texto, app_absent: '0' })
  return `https://api.whatsapp.com/send/?${p.toString()}`
}

export function ordinal(n) {
  const o = ['', 'primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo']
  return o[n] || `número ${n}`
}
