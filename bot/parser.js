/**
 * parser.js — parses CSV or Excel bank export files (Israeli banks)
 * Returns: Array<{ date: string, desc: string, amount: number, type: 'expense'|'income' }>
 */

function detectEncoding(buffer) {
  const w1255 = new TextDecoder('windows-1255').decode(buffer)
  const utf8  = new TextDecoder('utf-8').decode(buffer)
  const hebrewRe = /[א-ת]/g
  return (w1255.match(hebrewRe) || []).length >= (utf8.match(hebrewRe) || []).length
    ? w1255 : utf8
}

function parseCSVText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines.map(line => {
    const cells = []
    let cur = '', inQ = false
    for (const c of line) {
      if (c === '"') { inQ = !inQ }
      else if ((c === ',' || c === '\t') && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += c
    }
    cells.push(cur.trim())
    return cells
  })
}

function parseRow(row) {
  let dateStr = '', desc = '', amount = 0

  for (const rawCell of row) {
    const cell = String(rawCell ?? '').trim()
    if (!cell) continue

    if (!dateStr) {
      const m = cell.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})$/)
      if (m) {
        const y = m[3].length === 2 ? '20' + m[3] : m[3]
        dateStr = `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
        continue
      }
    }

    const numStr = cell.replace(/,/g, '').replace(/\s/g, '')
    const n = parseFloat(numStr)
    if (!isNaN(n) && Math.abs(n) > 0 && Math.abs(n) < 10_000_000 && !/^\d{6,}$/.test(cell)) {
      if (!amount) amount = n
      continue
    }

    if (cell.length > 2 && isNaN(Number(numStr))) {
      if (cell.length > desc.length) desc = cell
    }
  }

  if (!dateStr || !amount || !desc) return null
  return {
    date: dateStr,
    desc,
    amount: Math.abs(amount),
    type: amount < 0 ? 'expense' : 'income',
  }
}

export async function parseFile(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase()

  if (ext === 'csv' || ext === 'txt') {
    const text = detectEncoding(buffer)
    const rows = parseCSVText(text)
    return rows.map(parseRow).filter(Boolean)
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // dynamic import so xlsx is optional
    const { read, utils } = await import('xlsx')
    const wb = read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = utils.sheet_to_json(ws, { header: 1, defval: '' })
    return rows.map(parseRow).filter(Boolean)
  }

  throw new Error(`סוג קובץ לא נתמך: .${ext}`)
}
