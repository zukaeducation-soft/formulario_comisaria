/** PDF del informe de violencia intrafamiliar con el diseño del modelo (tablas azul claro, apartados I–IX). */
import { rgb, type RGB } from 'pdf-lib'
import { vifDocumento, vifFirma, type VifElemento } from '../form/vifDoc'
import type { FormData } from '../form/types'
import type { Profile } from '../store/storage'
import { BlockRenderer } from './blocks'
import { FlowDocument, INK, sanitize } from './engine'
import { drawPhotoAnnex, embedDataUrl, HEADER_TEXT, type PdfAssets } from './generate'
import { drawRich, wrapRich } from './richpdf'

const AZUL = rgb(0.867, 0.902, 0.949) // DDE6F2
const BORDE = rgb(0.62, 0.76, 0.9) // 9EC2E6
const SIZE = 8.6
const LINE = 11.6
const SIZE_TABLA = 7.8
const LINE_TABLA = 10
const PADX = 5
const PADY = 3.5

type Celda = { text: string; bold?: boolean; fill?: RGB; justify?: boolean; center?: boolean }

function rect(doc: FlowDocument, x: number, top: number, w: number, h: number, fill?: RGB): void {
  doc.page.drawRectangle({ x, y: top - h, width: w, height: h, color: fill, borderColor: BORDE, borderWidth: 0.6 })
}

/** Tabla con anchos relativos; cada fila salta de página completa si no cabe. */
function tabla(doc: FlowDocument, pesos: number[], filas: Celda[][], opts: { x?: number; width?: number; size?: number; line?: number } = {}): void {
  const x0 = opts.x ?? doc.left
  const width = opts.width ?? doc.width
  const size = opts.size ?? SIZE_TABLA
  const line = opts.line ?? LINE_TABLA
  const total = pesos.reduce((a, b) => a + b, 0)
  const anchos = pesos.map((p) => (width * p) / total)
  for (const fila of filas) {
    const wrapped = fila.map((c, i) => {
      const fonts = c.bold ? { ...doc.fonts, regular: doc.fonts.bold } : doc.fonts
      return wrapRich(fonts, size, anchos[i] - 2 * PADX, c.text || ' ', { justify: !!c.justify })
    })
    const h = Math.max(...wrapped.map((l) => l.length)) * line + 2 * PADY
    doc.ensure(h)
    let x = x0
    fila.forEach((c, i) => {
      rect(doc, x, doc.y, anchos[i], h, c.fill)
      let lines = wrapped[i]
      if (c.center) {
        // Centrar líneas cortas (encabezados)
        lines = lines.map((l) => {
          const lw = l.words.reduce((a, w) => a + w.width, 0) + Math.max(0, l.words.length - 1) * doc.fonts.regular.widthOfTextAtSize(' ', size)
          return { ...l, x: Math.max(0, (anchos[i] - 2 * PADX - lw) / 2) }
        })
      }
      drawRich(doc, lines, x + PADX, doc.y - PADY, size, line, anchos[i] - 2 * PADX)
      x += anchos[i]
    })
    doc.advance(h)
  }
}

function centrado(doc: FlowDocument, text: string, size: number, bold: boolean, lineH: number): void {
  const font = bold ? doc.fonts.bold : doc.fonts.regular
  const fonts = bold ? { ...doc.fonts, regular: doc.fonts.bold } : doc.fonts
  for (const l of wrapRich(fonts, size, doc.width - 80, text, { justify: false })) {
    const t = sanitize(l.words.map((w) => w.pieces.map((p) => p.text).join('')).join(' '))
    const tw = font.widthOfTextAtSize(t, size)
    doc.ensure(lineH)
    doc.page.drawText(t, { x: doc.left + (doc.width - tw) / 2, y: doc.y - lineH * 0.76, size, font, color: INK })
    doc.advance(lineH)
  }
}

function texto(doc: FlowDocument, text: string, bullets: boolean): void {
  const x = doc.left + 18
  const w = doc.width - 36
  for (const l of wrapRich(doc.fonts, SIZE, w, text, { autoBullet: bullets })) {
    doc.ensure(LINE)
    drawRich(doc, [l], x, doc.y, SIZE, LINE, w)
    doc.advance(LINE)
  }
  doc.advance(4)
}

function elemento(doc: FlowDocument, e: VifElemento): void {
  switch (e.t) {
    case 'titulo':
      centrado(doc, e.text, 10, true, 13)
      return
    case 'codigo':
      centrado(doc, e.text, 8.5, false, 11)
      doc.advance(4)
      return
    case 'h1': {
      doc.ensure(16 + 40)
      doc.advance(6)
      doc.page.drawText(sanitize(e.text), { x: doc.left + 30, y: doc.y - 10, size: 9.5, font: doc.fonts.bold, color: INK })
      doc.advance(16)
      return
    }
    case 'h2': {
      doc.ensure(14 + 30)
      doc.advance(2)
      const x = doc.left + 18
      doc.page.drawRectangle({ x, y: doc.y - 8.2, width: 3.6, height: 3.6, color: INK })
      doc.page.drawText(sanitize(e.text), { x: x + 9, y: doc.y - 9.5, size: 9, font: doc.fonts.bold, color: INK })
      doc.advance(14)
      return
    }
    case 'kv':
      tabla(
        doc,
        [34, 66],
        e.rows.map(([k, val]) => [
          { text: k, bold: true, fill: AZUL },
          { text: val, justify: true },
        ]),
        { x: doc.left + 18, width: doc.width - 36 },
      )
      doc.advance(6)
      return
    case 'tabla':
      tabla(
        doc,
        e.cols.map((c) => c.w),
        [
          e.cols.map((c) => ({ text: c.label, bold: true, fill: AZUL, center: true })),
          ...e.rows.map((r, i) => r.map((text, j) => ({ text, justify: e.cols.length === 2 && j === 1, bold: e.cols.length === 2 && j === 0, fill: e.cols.length === 2 && j === 0 ? AZUL : i % 2 ? AZUL : undefined }))),
        ],
        { x: doc.left + 18, width: doc.width - 36 },
      )
      doc.advance(6)
      return
    case 'texto':
      texto(doc, e.text, !!e.bullets)
      return
  }
}

async function firma(doc: FlowDocument, data: FormData, profile: Profile): Promise<void> {
  doc.ensure(130)
  doc.advance(18)
  const img = profile.firma ? await embedDataUrl(doc, profile.firma) : undefined
  const cx = doc.left + doc.width / 2
  if (img) {
    const s = Math.min(170 / img.width, 55 / img.height, 1)
    doc.page.drawImage(img, { x: cx - (img.width * s) / 2, y: doc.y - img.height * s, width: img.width * s, height: img.height * s })
    doc.advance(img.height * s)
  } else doc.advance(40)
  doc.hline(cx - 110, cx + 110, doc.y, 0.7, INK)
  doc.advance(3)
  for (const linea of vifFirma(data, profile)) {
    const t = sanitize(linea)
    const tw = doc.fonts.bold.widthOfTextAtSize(t, 8.6)
    doc.page.drawText(t, { x: cx - tw / 2, y: doc.y - 9, size: 8.6, font: doc.fonts.bold, color: INK })
    doc.advance(11)
  }
}

export async function generateVifPdf({ data, profile, assets }: { data: FormData; profile: Profile; assets?: PdfAssets }): Promise<Uint8Array> {
  const doc = await FlowDocument.create()
  for (const e of vifDocumento(data)) elemento(doc, e)
  await firma(doc, data, profile)
  await drawPhotoAnnex(doc, new BlockRenderer(doc, data), data)

  doc.drawHeaders({
    ...HEADER_TEXT,
    escudo: assets?.escudo ? await doc.pdf.embedPng(assets.escudo) : undefined,
    pdet: assets?.pdet ? await doc.pdf.embedPng(assets.pdet) : undefined,
    pie: assets?.pie ? await doc.pdf.embedPng(assets.pie) : undefined,
  })
  const nombre = (data.nombres as string | undefined)?.trim()
  doc.pdf.setTitle(sanitize(`Informe VIF${nombre ? ` - ${nombre}` : ''}`))
  doc.pdf.setAuthor(sanitize(profile.nombre))
  doc.pdf.setProducer('Informe TS - Comisaría de Familia')
  return doc.pdf.save()
}
