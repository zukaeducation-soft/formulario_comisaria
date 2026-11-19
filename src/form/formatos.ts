/** Tipos de formulario disponibles. Cada informe guarda el suyo en `data.formato` (sin valor = NNA). */
import { sections as seccionesNna } from './schema'
import type { FormData, Section } from './types'
import { sectionsVif } from './vif'

export type FormatoId = 'nna' | 'vif'

export interface Formato {
  id: FormatoId
  /** Nombre corto para listas y etiquetas */
  corto: string
  nombre: string
  descripcion: string
  sections: Section[]
}

export const FORMATOS: Record<FormatoId, Formato> = {
  nna: {
    id: 'nna',
    corto: 'NNA',
    nombre: 'Verificación de derechos de NNA',
    descripcion: 'Formato F-PM-096 de valoración sociofamiliar para niños, niñas y adolescentes.',
    sections: seccionesNna,
  },
  vif: {
    id: 'vif',
    corto: 'VIF',
    nombre: 'Violencia intrafamiliar',
    descripcion: 'Informe sociofamiliar inicial de verificación de derechos de la víctima de violencia intrafamiliar.',
    sections: sectionsVif,
  },
}

export function formatoDe(data: FormData): FormatoId {
  return data.formato === 'vif' ? 'vif' : 'nna'
}

export function seccionesDe(data: FormData): Section[] {
  return FORMATOS[formatoDe(data)].sections
}
