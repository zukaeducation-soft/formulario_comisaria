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
