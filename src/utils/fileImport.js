function countQuestionMarks(str) {
  return (str.match(/\?/g) || []).length
}

export async function readFileWithEncoding(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer.slice(0, 3))

  const isUTF8BOM = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf

  if (isUTF8BOM) {
    return new TextDecoder('utf-8').decode(buffer)
  }

  const utf8 = new TextDecoder('utf-8').decode(buffer)
  if (utf8.includes('�') || countQuestionMarks(utf8) > 5) {
    return new TextDecoder('windows-1255').decode(buffer)
  }

  return utf8
}

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines.map(line => {
    const cells = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') inQ = !inQ
      else if ((c === ',' || c === '\t') && !inQ) {
        cells.push(cur.trim())
        cur = ''
      } else cur += c
    }
    cells.push(cur.trim())
    return cells
  })
}
