import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { generateDocx } from '../docx/generate'
import { buildPrintHtml } from '../pdf/html'
import { generatePdf } from '../pdf/generate'
import { DEFAULT_PROFILE, defaultData, isEmptyReport } from '../store/storage'
import { agregarNna, nnaAdicionales, nombresInforme, quitarNna, recalcularEdades, setNnaAdicional, todosLosNna, tituloNna } from './nna'
import type { FormData } from './types'

const base: FormData = { fecha_elaboracion: '2026-11-19', nombres: 'Valeria', apellidos: 'Hurtado', doc_tipo: 'Tarjeta de identidad', doc_numero: '111' }

describe('varios NNA', () => {
  it('agrega, edita, calcula la edad y quita NNA adicionales', () => {
    let d = agregarNna(base)
    expect(nnaAdicionales(d)).toEqual([{}])
    d = setNnaAdicional(d, 0, 'nombres', 'Tomás')
    d = setNnaAdicional(d, 0, 'fecha_nacimiento', '2015-05-10')
    const extra = nnaAdicionales(d)[0]
    expect(extra.nombres).toBe('Tomás')
    expect(extra.edad_anios).toBe('11')
    expect(extra.edad_meses).toBe('6')
    // El NNA principal no cambia
    expect(d.nombres).toBe('Valeria')
    expect(nombresInforme(d)).toBe('Valeria Hurtado y 1 más')
    expect(todosLosNna(d)).toHaveLength(2)

    d = recalcularEdades({ ...d, fecha_elaboracion: '2027-06-01' })
    expect(nnaAdicionales(d)[0].edad_anios).toBe('12')

    d = quitarNna(d, 0)
    expect(d.nna_adicionales).toBeUndefined()
    expect(nombresInforme(d)).toBe('Valeria Hurtado')
  })

  it('limpia los campos ocultos solo del NNA que cambia', () => {
    let d = agregarNna({ ...base, regimen: 'Subsidiado', eps: 'EPS A' })
    d = setNnaAdicional(d, 0, 'eps', 'EPS B')
    d = setNnaAdicional(d, 0, 'regimen', 'Ninguno')
    expect(nnaAdicionales(d)[0].eps).toBeUndefined()
    expect(d.eps).toBe('EPS A')
  })

  it('numera el título solo cuando hay varios', () => {
    expect(tituloNna('2. DATOS', 0, 1)).toBe('2. DATOS')
    expect(tituloNna('2. DATOS', 1, 3)).toBe('2. DATOS (2 de 3)')
  })

  it('un NNA adicional vacío no cuenta como contenido del informe', () => {
    const profile = { ...DEFAULT_PROFILE, nombre: 'Pro', tarjeta: '123' }
    const vacio = agregarNna(defaultData(profile))
    expect(isEmptyReport(vacio, profile)).toBe(true)
    expect(isEmptyReport(setNnaAdicional(vacio, 0, 'nombres', 'Ana'), profile)).toBe(false)
  })

  it('el PDF, la impresión y el Word incluyen una sección 2 por cada NNA', async () => {
    const assets = {
      escudo: new Uint8Array(readFileSync(new URL('../assets/escudo.png', import.meta.url))),
      pdet: new Uint8Array(readFileSync(new URL('../assets/pdet.png', import.meta.url))),
      pie: new Uint8Array(readFileSync(new URL('../assets/pie.png', import.meta.url))),
    }
    const d = setNnaAdicional(agregarNna(base), 0, 'nombres', 'Tomás')
    const uno = await PDFDocument.load(await generatePdf({ data: base, profile: DEFAULT_PROFILE, assets }))
    const dos = await PDFDocument.load(await generatePdf({ data: d, profile: DEFAULT_PROFILE, assets }))
    expect(dos.getPageCount()).toBeGreaterThan(uno.getPageCount())

    const html = buildPrintHtml(d, DEFAULT_PROFILE, { escudo: '', pdet: '', pie: '' })
    expect(html).toContain('2. DATOS DEL NIÑO, NIÑA O ADOLESCENTE (1 de 2)')
    expect(html).toContain('2. DATOS DEL NIÑO, NIÑA O ADOLESCENTE (2 de 2)')
    expect(html).toContain('Tomás')

    const docx = await generateDocx({ data: d, profile: DEFAULT_PROFILE })
    expect(docx.size).toBeGreaterThan(5_000)
  })
})
