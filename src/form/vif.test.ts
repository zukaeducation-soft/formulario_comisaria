import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { generateDocx } from '../docx/generate'
import { pdfFileName } from '../pdf/download'
import { generatePdf } from '../pdf/generate'
import { DEFAULT_PROFILE, defaultData, isEmptyReport } from '../store/storage'
import { formatoDe, seccionesDe } from './formatos'
import { progressPercent } from './progress'
import { pruneHidden } from './visibility'
import { claveDescripcion, completarDescripciones, VIF_INSTRUMENTOS } from './vif'
import { vifDocumento } from './vifDoc'

const profile = { ...DEFAULT_PROFILE, nombre: 'Pro', tarjeta: '123' }

describe('formato VIF', () => {
  it('nace con su formato, sus secciones y sin contar como contenido los textos sugeridos', () => {
    const d = defaultData(profile, 'vif')
    expect(formatoDe(d)).toBe('vif')
    expect(seccionesDe(d).map((s) => s.title)[0]).toBe('I. Datos del informe')
    expect(isEmptyReport(d, profile)).toBe(true)
    expect(isEmptyReport({ ...d, nombres: 'Ana' }, profile)).toBe(false)
    // Los informes antiguos (sin formato) siguen siendo de NNA
    expect(formatoDe({ nombres: 'x' })).toBe('nna')
    expect(seccionesDe({})[0].title).toBe('1. DATOS GENERALES')
  })

  it('calcula el avance y limpia campos ocultos con sus propias secciones', () => {
    const d = defaultData(profile, 'vif')
    expect(progressPercent(d)).toBeGreaterThan(0)
    const limpio = pruneHidden({ ...d, doc_tipo: 'Ninguno', doc_numero: '123' })
    expect(limpio.doc_numero).toBeUndefined()
  })

  it('arma el contenido del informe con los apartados I a IX', () => {
    const els = vifDocumento({ ...defaultData(profile, 'vif'), nombres: 'Ana Ruiz', vif_familia: [{ nombre: '' }, { nombre: 'Luis', parentesco: 'Hijo' }] })
    const titulos = els.filter((e) => e.t === 'h1').map((e) => (e as { text: string }).text.split('.')[0])
    expect(titulos).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'])
    const familia = els.find((e) => e.t === 'tabla')
    expect(familia && familia.t === 'tabla' && familia.rows).toEqual([['Luis', 'Hijo', '', '', '', '']])
  })

  it('genera el PDF y el Word con nombre de archivo propio', async () => {
    const assets = {
      escudo: new Uint8Array(readFileSync(new URL('../assets/escudo.png', import.meta.url))),
      pdet: new Uint8Array(readFileSync(new URL('../assets/pdet.png', import.meta.url))),
      pie: new Uint8Array(readFileSync(new URL('../assets/pie.png', import.meta.url))),
    }
    const data = { ...defaultData(profile, 'vif'), nombres: 'María López', vif_analisis: 'Texto **largo**. '.repeat(300) }
    const pdf = await PDFDocument.load(await generatePdf({ data, profile, assets }))
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2)
    expect(pdf.getTitle()).toContain('Informe VIF')
    const docx = await generateDocx({ data, profile, assets })
    expect(docx.size).toBeGreaterThan(20_000)
    expect(pdfFileName(data)).toMatch(/^Informe_VIF_Maria_Lopez_/)
  })
})

describe('descripciones de la metodología', () => {
  const tablaMetodologia = (d: Parameters<typeof vifDocumento>[0]) => {
    const t = vifDocumento(d).filter((e) => e.t === 'tabla')[1]
    return t && t.t === 'tabla' ? t.rows : []
  }

  it('nacen con el texto sugerido, se pueden editar y vacías usan la sugerida', () => {
    const d = defaultData(profile, 'vif')
    expect(d[claveDescripcion(0)]).toBe(VIF_INSTRUMENTOS[0].descripcion)
    const editado = { ...d, [claveDescripcion(0)]: 'Entrevista con la víctima y su hermana.', [claveDescripcion(1)]: '' }
    const filas = tablaMetodologia(editado)
    expect(filas[0]).toEqual(['Entrevista semi-estructurada:', 'Entrevista con la víctima y su hermana.'])
    expect(filas[1][1]).toBe(VIF_INSTRUMENTOS[1].descripcion)
    expect(isEmptyReport(d, profile)).toBe(true)
  })

  it('al desmarcar se quita de la tabla y al volver a marcar recupera el texto sugerido', () => {
    const d = defaultData(profile, 'vif')
    const sin = pruneHidden({ ...d, vif_instrumentos: VIF_INSTRUMENTOS.slice(1).map((i) => i.nombre) })
    expect(sin[claveDescripcion(0)]).toBeUndefined()
    expect(tablaMetodologia(sin)).toHaveLength(4)
    const otraVez = completarDescripciones({ ...sin, vif_instrumentos: VIF_INSTRUMENTOS.map((i) => i.nombre) })
    expect(otraVez[claveDescripcion(0)]).toBe(VIF_INSTRUMENTOS[0].descripcion)
  })
})
