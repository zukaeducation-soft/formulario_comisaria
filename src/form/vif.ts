/**
 * Formato «Informe sociofamiliar inicial de verificación de derechos – Violencia intrafamiliar»
 * (modelo entregado por la Comisaría). Algunas claves se comparten con el formato de NNA a propósito:
 * `nombres` (nombre completo de la víctima), `fecha_nacimiento`, `edad_anios`, `doc_tipo` y `doc_numero`,
 * de modo que el servidor, la búsqueda y el panel de administración muestren el nombre sin cambios.
 */
import { checks, d, heading, note, row, sel, sections as seccionesNna, t, ta, table } from './schema'
import { asList, type FormData, type Section } from './types'

export const VIF_TITULO = 'INFORME SOCIOFAMILIAR INICIAL DE VERIFICACIÓN DE DERECHOS- VIOLENCIA INTRAFAMILIAR'

export const VIF_ASUNTO = 'Informe inicial sociofamiliar de verificación de derechos de la víctima'

export const VIF_OBJETIVO =
  'Realizar la valoración sociofamiliar de la señora con el fin de identificar las dinámicas familiares, factores de riesgo y protección presentes en su entorno, verificar la posible vulneración de sus derechos derivada de situaciones de violencia intrafamiliar y establecer elementos que orienten la adopción de medidas de protección y acciones de restablecimiento que contribuyan a su bienestar integral y al fortalecimiento de su red de apoyo familiar y social.'

/**
 * Instrumentos de la metodología. `descripcion` es el texto sugerido (redacción del modelo, revisada);
 * el profesional puede cambiarlo en cada informe (clave `vif_inst_desc_<n>`).
 */
export const VIF_INSTRUMENTOS: { nombre: string; descripcion: string }[] = [
  {
    nombre: 'Entrevista semi-estructurada',
    descripcion:
      'Aplicada a la persona objeto de atención y a miembros significativos de su entorno familiar o red de apoyo, con el propósito de conocer su situación personal, familiar y social; los antecedentes de los hechos reportados; las dinámicas relacionales y las condiciones de convivencia; las redes de apoyo y los factores de riesgo y de protección, así como su percepción frente a la situación objeto de estudio.',
  },
  {
    nombre: 'Observación directa',
    descripcion:
      'Realizada durante el proceso de atención, permitió identificar aspectos relacionados con la comunicación, el comportamiento, el estado emocional, la interacción con el entorno familiar y social, las condiciones de convivencia, la distribución de roles y las manifestaciones asociadas a situaciones de vulneración de derechos o de afectación de su bienestar integral.',
  },
  {
    nombre: 'Revisión documental',
    descripcion:
      'Consistió en el análisis de los documentos aportados al proceso, tales como denuncias, informes institucionales, valoraciones interdisciplinarias, historias clínicas, medidas de protección, registros de atención y demás soportes relevantes para la comprensión integral de la situación evaluada.',
  },
  {
    nombre: 'Registro en formato institucional',
    descripcion:
      'Consignación sistemática de la información recolectada en los formatos establecidos por la Comisaría de Familia, que garantiza la trazabilidad del caso, el seguimiento de las actuaciones y el soporte técnico para la toma de decisiones.',
  },
  {
    nombre: 'Análisis sociofamiliar',
    descripcion:
      'A partir de la información recopilada, se realizó un análisis integral de la situación personal, familiar y social de la persona atendida, en el que se identificaron factores de riesgo y de protección, capacidades individuales y familiares, recursos de apoyo y necesidades de intervención, con el propósito de emitir conceptos y recomendaciones técnicas que orienten la adopción de medidas de protección y el fortalecimiento de sus condiciones de bienestar y de garantía de derechos.',
  },
]

/** Clave de la descripción editable del instrumento `i`. */
export const claveDescripcion = (i: number): string => `vif_inst_desc_${i}`

/** Descripciones sugeridas, para los datos iniciales de un informe nuevo. */
export function descripcionesPorDefecto(): Record<string, string> {
  return Object.fromEntries(VIF_INSTRUMENTOS.map((ins, i) => [claveDescripcion(i), ins.descripcion]))
}

/**
 * Pone la descripción sugerida a los instrumentos marcados que no tienen ninguna
 * (al volver a marcar uno o en informes creados antes de que fueran editables).
 * Un texto vacío escrito por el profesional se respeta; al imprimir se usa la sugerida.
 */
export function completarDescripciones(data: FormData): FormData {
  if (data.formato !== 'vif') return data
  const marcados = asList(data.vif_instrumentos)
  let next = data
  VIF_INSTRUMENTOS.forEach((ins, i) => {
    const k = claveDescripcion(i)
    if (marcados.includes(ins.nombre) && next[k] === undefined) next = { ...next, [k]: ins.descripcion }
  })
  return next
}

const TIPOS_DOCUMENTO = ['Cédula de ciudadanía', 'Tarjeta de identidad', 'Registro civil', 'Cédula de extranjería', 'Pasaporte', 'Permiso por Protección Temporal (PPT)', 'Ninguno']

const evidencia = seccionesNna.find((s) => s.id === 'evidencia')!

export const sectionsVif: Section[] = [
  {
    id: 'informe',
    title: 'I. Datos del informe',
    short: 'Datos del informe',
    blocks: [
      note('Estos datos se toman del perfil del profesional y pueden ajustarse para este informe.'),
      row([d('fecha_elaboracion', 'Fecha de elaboración'), t('elaborado_por', 'Elaborado por')]),
      row([t('seccion', 'Sección'), t('tarjeta_profesional', 'Tarjeta Profesional N°')]),
      t('dirigido_a', 'Dirigido a'),
      ta('asunto', 'Asunto', 2),
      ta('reporte', 'Reporte', 3),
    ],
  },
  {
    id: 'victima',
    title: 'II. Datos de identificación de la víctima',
    short: 'Datos de la víctima',
    blocks: [
      t('nombres', 'Nombre completo de la víctima'),
      row([
        d('fecha_nacimiento', 'Fecha de nacimiento'),
        t('edad_anios', 'Edad (años)', { inputType: 'number', readOnlyWhen: { key: 'fecha_nacimiento', truthy: true } }),
      ]),
      row([sel('doc_tipo', 'Tipo de documento', { options: TIPOS_DOCUMENTO, placeholder: 'Seleccione' }), t('doc_numero', 'Número de documento', { when: { key: 'doc_tipo', notEquals: 'Ninguno' } })]),
      row([t('vif_residencia', 'Lugar de residencia'), t('vif_ocupacion', 'Ocupación')]),
      row([t('vif_estado_civil', 'Estado civil'), t('vif_escolaridad', 'Escolaridad')]),
      row([t('vif_eps', 'EPS / Régimen'), t('vif_contactos', 'Contactos')]),
      t('vif_grupo_poblacional', 'Grupo poblacional / Enfoque diferencial'),
      heading('Grupo familiar'),
      table(
        'vif_familia',
        [
          { key: 'nombre', label: 'Nombres y apellidos', width: 2.4 },
          { key: 'parentesco', label: 'Parentesco', width: 1.4 },
          { key: 'edad', label: 'Edad', type: 'number', width: 0.7 },
          { key: 'identificacion', label: 'Identificación', width: 1.5 },
          { key: 'ocupacion', label: 'Ocupación', width: 1.5 },
          { key: 'contacto', label: 'Contactos', width: 1.5 },
        ],
        2,
        { rowName: 'Persona' },
      ),
    ],
  },
  {
    id: 'agresor',
    title: 'III. Presunto agresor',
    short: 'Presunto agresor',
    blocks: [
      row([t('agresor_nombre', 'Nombre completo'), t('agresor_parentesco', 'Parentesco o relación con la víctima')]),
      row([t('agresor_documento', 'Documento de identidad'), t('agresor_edad', 'Edad', { inputType: 'number' })]),
      row([t('agresor_ocupacion', 'Ocupación'), t('agresor_contacto', 'Contactos')]),
      ta('agresor_info', 'Información adicional', 4),
    ],
  },
  {
    id: 'objetivo',
    title: 'IV. Objetivo de verificación',
    short: 'Objetivo',
    blocks: [ta('vif_objetivo', '', 6, { hint: 'Texto sugerido por el formato; puede ajustarlo a cada caso.' })],
  },
  {
    id: 'metodologia',
    title: 'V. Metodología e instrumentos utilizados',
    short: 'Metodología',
    blocks: [
      checks(
        'vif_instrumentos',
        'Instrumentos aplicados',
        VIF_INSTRUMENTOS.map((i) => i.nombre),
      ),
      note('Cada instrumento marcado se imprime con su descripción en la tabla de metodología. La descripción viene sugerida y puede ajustarla; si la deja vacía, se usa la sugerida.'),
      ...VIF_INSTRUMENTOS.map((ins, i) => ta(claveDescripcion(i), `Descripción: ${ins.nombre}`, 5, { when: { key: 'vif_instrumentos', includes: ins.nombre } })),
      ta('vif_otros_instrumentos', 'Otros instrumentos o precisiones (opcional)', 3),
    ],
  },
  {
    id: 'valoracion',
    title: 'VI. Valoración sociofamiliar',
    short: 'Valoración sociofamiliar',
    blocks: [ta('vif_valoracion', '', 10)],
  },
  {
    id: 'manifestaciones',
    title: 'VII. Manifestaciones de la víctima',
    short: 'Manifestaciones',
    blocks: [
      ta('vif_manifestaciones', '', 8),
      ta('vif_condiciones', 'Condiciones sociohabitacionales', 6),
      heading('Identificación de factores'),
      ta('vif_generatividad', 'Factores de generatividad', 5, { bullets: true, hint: 'Un factor por línea.' }),
      ta('vif_riesgo', 'Factores de riesgo', 5, { bullets: true, hint: 'Un factor por línea.' }),
    ],
  },
  {
    id: 'analisis',
    title: 'VIII. Análisis social y conclusiones del trabajador social',
    short: 'Análisis y conclusiones',
    blocks: [ta('vif_analisis', '', 10)],
  },
  {
    id: 'recomendaciones',
    title: 'IX. Recomendaciones al Despacho Comisaría',
    short: 'Recomendaciones',
    blocks: [ta('vif_recomendaciones', '', 8)],
  },
  {
    id: 'profesional',
    title: 'Profesional y firma',
    short: 'Profesional y firma',
    blocks: [note('Al final del informe se imprimen la firma, el nombre, el cargo y la tarjeta profesional.'), row([t('prof_nombre', 'Nombre'), t('prof_tarjeta', 'Tarjeta profesional')])],
  },
  evidencia,
]
