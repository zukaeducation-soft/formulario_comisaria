/**
 * Varios NNA en un mismo informe. El primero usa las claves de la sección 2 en el nivel
 * principal de los datos (como siempre); los demás se guardan en `nna_adicionales`, cada uno
 * con las mismas claves de la sección 2.
 */
import { edadEn, pruneHidden } from './visibility'
import { asString, type FieldValue, type FormData } from './types'

export const NNA_ADICIONALES = 'nna_adicionales'

export function nnaAdicionales(data: FormData): FormData[] {
  const v = data[NNA_ADICIONALES]
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is FormData => !!x && typeof x === 'object' && !Array.isArray(x)) : []
}

/** Todos los NNA del informe: el principal y los adicionales. */
export function todosLosNna(data: FormData): FormData[] {
  return [data, ...nnaAdicionales(data)]
}

export function nombreNna(d: FormData): string {
  return `${asString(d.nombres)} ${asString(d.apellidos)}`.trim()
}

/** Nombre para listas y títulos: «Ana Pérez» o «Ana Pérez y 2 más». */
export function nombresInforme(data: FormData): string {
  const principal = nombreNna(data)
  const extra = nnaAdicionales(data).length
  if (!principal) return ''
  return extra ? `${principal} y ${extra} más` : principal
}

/** Título de la sección 2 para el NNA `i` (desde 0) de `total`. */
export function tituloNna(base: string, i: number, total: number): string {
  return total > 1 ? `${base} (${i + 1} de ${total})` : base
}

/** Recalcula la edad con la fecha de nacimiento y la fecha de referencia del informe. */
export function conEdad(d: FormData, fechaReferencia: string, borrarSiSinFecha: boolean): FormData {
  const ref = fechaReferencia || new Date().toISOString().slice(0, 10)
  const edad = edadEn(asString(d.fecha_nacimiento), ref)
  if (edad) return { ...d, edad_anios: String(edad.anios), edad_meses: String(edad.meses) }
  if (borrarSiSinFecha && !asString(d.fecha_nacimiento)) return { ...d, edad_anios: '', edad_meses: '' }
  return d
}

/** Cambia un campo de un NNA adicional (índice desde 0), con el cálculo de edad y la limpieza de campos ocultos. */
export function setNnaAdicional(data: FormData, i: number, key: string, value: FieldValue): FormData {
  const lista = nnaAdicionales(data).slice()
  if (!lista[i]) return data
  let d: FormData = { ...lista[i], [key]: value }
  if (key === 'fecha_nacimiento') d = conEdad(d, asString(data.fecha_elaboracion), true)
  lista[i] = pruneHidden(d)
  return { ...data, [NNA_ADICIONALES]: lista }
}

export function agregarNna(data: FormData): FormData {
  return { ...data, [NNA_ADICIONALES]: [...nnaAdicionales(data), {}] }
}

export function quitarNna(data: FormData, i: number): FormData {
  const lista = nnaAdicionales(data).filter((_, j) => j !== i)
  const next = { ...data }
  if (lista.length) next[NNA_ADICIONALES] = lista
  else delete next[NNA_ADICIONALES]
  return next
}

/** Recalcula la edad de los NNA adicionales cuando cambia la fecha de elaboración del informe. */
export function recalcularEdades(data: FormData): FormData {
  const lista = nnaAdicionales(data)
  if (!lista.length) return data
  return { ...data, [NNA_ADICIONALES]: lista.map((d) => conEdad(d, asString(data.fecha_elaboracion), false)) }
}

/** ¿El NNA adicional tiene algún dato escrito? (la edad calculada no cuenta) */
export function nnaTieneDatos(d: FormData): boolean {
  return Object.entries(d).some(([k, v]) => {
    if (k === 'edad_anios' || k === 'edad_meses') return false
    if (typeof v === 'string') return v.trim().length > 0
    return Array.isArray(v) && v.length > 0
  })
}
