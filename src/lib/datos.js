import { supabase } from './supabase.js'

// Supabase entrega máximo 1000 filas por consulta; esto trae todas por partes.
export async function traerTodo(armarConsulta, porPagina = 1000) {
  const filas = []
  for (let desde = 0; ; desde += porPagina) {
    const { data, error } = await armarConsulta().range(desde, desde + porPagina - 1)
    if (error) throw error
    filas.push(...data)
    if (data.length < porPagina) return filas
  }
}

export async function contar(tabla, filtro = (q) => q) {
  const { count, error } = await filtro(supabase.from(tabla).select('id', { count: 'exact', head: true }))
  if (error) throw error
  return count ?? 0
}

export const fecha = (f) =>
  new Date(f).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

export const fechaHora = (f) =>
  new Date(f).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const mensajeError = (e) =>
  e?.message?.includes('No autorizado') ? 'Tu usuario no tiene permiso para esto.' : (e?.message || 'Algo salió mal. Inténtalo de nuevo.')
