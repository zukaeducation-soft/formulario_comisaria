/**
 * Contenido del informe de violencia intrafamiliar en el orden y la forma del modelo, independiente
 * del formato de salida. Lo dibujan el PDF (pdf/vif.ts) y el Word (docx/generate.ts).
 */
import { formatDate } from '../pdf/engine'
import { asList, asRows, asString, type FormData } from './types'
import { claveDescripcion, VIF_INSTRUMENTOS, VIF_TITULO } from './vif'

export type VifElemento =
  | { t: 'titulo'; text: string }
  | { t: 'codigo'; text: string }
  /** Título de apartado con número romano */
  | { t: 'h1'; text: string }
  /** Subtítulo dentro de un apartado */
  | { t: 'h2'; text: string }
  /** Tabla de dos columnas: etiqueta y valor (el valor admite formato) */
  | { t: 'kv'; rows: [string, string][] }
  /** Tabla con encabezado */
  | { t: 'tabla'; cols: { label: string; w: number }[]; rows: string[][] }
  /** Texto corrido justificado (con formato) */
  | { t: 'texto'; text: string; bullets?: boolean }

export function vifDocumento(data: FormData): VifElemento[] {
  const v = (k: string) => asString(data[k]).trim()
  const out: VifElemento[] = [{ t: 'titulo', text: VIF_TITULO }]
  if (v('_codigo')) out.push({ t: 'codigo', text: `Informe N.° ${v('_codigo')}` })

  out.push({ t: 'h1', text: 'I. Datos del informe' })
  out.push({
    t: 'kv',
    rows: [
      ['Fecha de elaboración:', formatDate(v('fecha_elaboracion'))],
      ['Elaborado por:', v('elaborado_por')],
      ['Sección:', v('seccion')],
      ['Tarjeta Profesional N°:', v('tarjeta_profesional')],
      ['Dirigido a:', v('dirigido_a')],
      ['Asunto:', v('asunto')],
      ['Reporte:', v('reporte')],
    ],
  })

  out.push({ t: 'h1', text: 'II. Datos de identificación de la víctima' })
  const edad = v('edad_anios')
  const doc = [v('doc_tipo'), v('doc_tipo') !== 'Ninguno' ? v('doc_numero') : ''].filter(Boolean).join(' N.° ')
  out.push({
    t: 'kv',
    rows: [
      ['Nombre completo de la víctima:', v('nombres')],
      ['Fecha de nacimiento:', formatDate(v('fecha_nacimiento'))],
      ['Edad:', edad ? `${edad} años` : ''],
      ['Tipo de documento:', doc],
      ['Lugar de residencia:', v('vif_residencia')],
      ['Ocupación:', v('vif_ocupacion')],
      ['Estado civil:', v('vif_estado_civil')],
      ['Escolaridad:', v('vif_escolaridad')],
      ['EPS / Régimen:', v('vif_eps')],
      ['Contactos:', v('vif_contactos')],
      ['Grupo poblacional / Enfoque diferencial:', v('vif_grupo_poblacional')],
    ],
  })
  // Grupo familiar: solo las filas diligenciadas (una vacía si no hay ninguna)
  const familia = asRows(data.vif_familia).filter((r) => Object.values(r).some((x) => String(x ?? '').trim()))
  const filas = (familia.length ? familia : [{}]).map((r: Record<string, string>) => [r.nombre ?? '', r.parentesco ?? '', r.edad ?? '', r.identificacion ?? '', r.ocupacion ?? '', r.contacto ?? ''])
  out.push({
    t: 'tabla',
    cols: [
      { label: 'Nombres y apellidos', w: 2.4 },
      { label: 'Parentesco', w: 1.4 },
      { label: 'Edad', w: 0.7 },
      { label: 'Identificación', w: 1.5 },
      { label: 'Ocupación', w: 1.5 },
      { label: 'Contactos', w: 1.5 },
    ],
    rows: filas,
  })

  out.push({ t: 'h1', text: 'III. Presunto agresor' })
  out.push({
    t: 'kv',
    rows: [
      ['Nombre completo:', v('agresor_nombre')],
      ['Parentesco o relación con la víctima:', v('agresor_parentesco')],
      ['Documento de identidad:', v('agresor_documento')],
      ['Edad:', v('agresor_edad') ? `${v('agresor_edad')} años` : ''],
      ['Ocupación:', v('agresor_ocupacion')],
      ['Contactos:', v('agresor_contacto')],
    ],
  })
  if (v('agresor_info')) out.push({ t: 'texto', text: v('agresor_info') })

  out.push({ t: 'h1', text: 'IV. Objetivo de verificación' })
  if (v('vif_objetivo')) out.push({ t: 'texto', text: v('vif_objetivo') })

  out.push({ t: 'h1', text: 'V. Metodología e instrumentos utilizados' })
  const marcados = asList(data.vif_instrumentos)
  const instrumentos = VIF_INSTRUMENTOS.flatMap((ins, i) => (marcados.includes(ins.nombre) ? [[`${ins.nombre}:`, v(claveDescripcion(i)) || ins.descripcion]] : []))
  if (v('vif_otros_instrumentos')) instrumentos.push(['Otros:', v('vif_otros_instrumentos')])
  out.push({
    t: 'tabla',
    cols: [
      { label: 'Instrumentos aplicados', w: 1 },
      { label: 'Descripción', w: 2 },
    ],
    rows: instrumentos.length ? instrumentos : [['', '']],
  })

  const apartado = (titulo: string, key: string, bullets = false) => {
    out.push({ t: 'h1', text: titulo })
    if (v(key)) out.push({ t: 'texto', text: v(key), bullets })
  }
  apartado('VI. Valoración sociofamiliar', 'vif_valoracion')
  apartado('VII. Manifestaciones de la víctima', 'vif_manifestaciones')
  out.push({ t: 'h2', text: 'Condiciones sociohabitacionales' })
  if (v('vif_condiciones')) out.push({ t: 'texto', text: v('vif_condiciones') })
  out.push({ t: 'h2', text: 'Identificación de factores' })
  out.push({ t: 'h2', text: 'Factores de generatividad' })
  if (v('vif_generatividad')) out.push({ t: 'texto', text: v('vif_generatividad'), bullets: true })
  out.push({ t: 'h2', text: 'Factores de riesgo' })
  if (v('vif_riesgo')) out.push({ t: 'texto', text: v('vif_riesgo'), bullets: true })
  apartado('VIII. Análisis social y conclusiones del trabajador social', 'vif_analisis')
  apartado('IX. Recomendaciones al Despacho Comisaría', 'vif_recomendaciones')
  return out
}

/** Datos del bloque de firma al final del informe. */
export function vifFirma(data: FormData, profile: { nombre: string; tarjeta: string; cargo: string }): string[] {
  const nombre = asString(data.prof_nombre) || profile.nombre
  const tarjeta = asString(data.prof_tarjeta) || profile.tarjeta
  return [nombre, profile.cargo || 'Trabajadora Social', 'Comisaría de Familia, Morales Cauca', tarjeta ? `TP. ${tarjeta}` : ''].filter(Boolean)
}
