// @ts-nocheck
const BLOCKQUOTE_PREFIX = /^\s*>\s?/
const CODE_FENCE_PREFIX = /^\s*```/
const HEADING_PATTERN = /^(#{1,4})\s+(.+)$/
const HORIZONTAL_RULE_PATTERN = /^\s*([-*_])(?:\s*\1){2,}\s*$/
const ORDERED_LIST_PATTERN = /^(\s*)(\d+)\.\s+(.+)$/
const UNORDERED_LIST_PATTERN = /^(\s*)[-*+]\s+(.+)$/
const FINAL_ANSWER_PREFIX_PATTERN = /^\s*(?:Final\s*Answer|최종\s*답변)[:：]\s*/i
const FINAL_ANSWER_OPEN_LINE_PATTERN = /^\s*<final_answer>\s*$/i
const FINAL_ANSWER_TAG_PATTERN = /<final_answer>([\s\S]*?)<\/final_answer>/gi
const TOOL_CALL_TAG_PATTERN = /<tool_call>[\s\S]*?<\/tool_call>/gi
const TOOL_CALL_LINE_PATTERN = /^\s*\[TOOL_CALL\]\s*/i

const resolveMarkdownUrl = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return raw
  if (/^(?:https?:|data:|blob:|mailto:|tel:)/i.test(raw)) {
    return raw
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin
  try {
    return new URL(raw, baseUrl).toString()
  } catch {
    return raw
  }
}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const normalizeIndent = (value = '') => value.replace(/\t/g, '  ').length

const stripOuterPipes = (line = '') => {
  let trimmed = String(line).trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed
}

const splitTableRow = (line = '') => stripOuterPipes(line)
  .split('|')
  .map((cell) => cell.trim())

const isBlankLine = (line = '') => !String(line).trim()

const normalizeBlockForCompare = (block = '') => String(block)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .join('\n')

const dedupeAdjacentBlocks = (content = '') => {
  const blocks = String(content).split(/\n{2,}/)
  const compacted = []
  let previous = ''

  blocks.forEach((block) => {
    const trimmed = block.trim()
    if (!trimmed) return
    const normalized = normalizeBlockForCompare(trimmed)
    if (!normalized || normalized === previous) return
    compacted.push(trimmed)
    previous = normalized
  })

  return compacted.join('\n\n')
}

const stripBracketToolCallBlocks = (content = '') => {
  const kept = []
  let skippingBlock = false

  String(content).split('\n').forEach((line) => {
    const stripped = String(line).trim()

    if (!skippingBlock && TOOL_CALL_LINE_PATTERN.test(line)) {
      skippingBlock = true
      return
    }

    if (skippingBlock) {
      if (FINAL_ANSWER_OPEN_LINE_PATTERN.test(stripped) || FINAL_ANSWER_PREFIX_PATTERN.test(stripped)) {
        skippingBlock = false
        kept.push(line)
        return
      }
      if (!stripped) {
        skippingBlock = false
      }
      return
    }

    kept.push(line)
  })

  return kept.join('\n')
}

export const sanitizeReportMarkdownSource = (content = '', options = {}) => {
  const normalized = stripBracketToolCallBlocks(String(content)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n'))
  let source = normalized.replace(FINAL_ANSWER_TAG_PATTERN, (_, body) => String(body || '').trim())

  source = source
    .replace(TOOL_CALL_TAG_PATTERN, '')
    .replace(FINAL_ANSWER_PREFIX_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')

  if (options.stripLeadingHeading) {
    source = stripLeadingHeading(source)
  }

  return dedupeAdjacentBlocks(source).trim()
}

const isTableDivider = (line = '') => {
  const cells = splitTableRow(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

const isTableStart = (lines, index) => {
  if (index + 1 >= lines.length) return false
  const header = String(lines[index] || '').trim()
  const divider = String(lines[index + 1] || '').trim()
  return header.includes('|') && isTableDivider(divider)
}

const startsBlock = (lines, index) => {
  const line = String(lines[index] || '')
  if (!line) return false
  const trimmed = line.trim()
  if (!trimmed) return true
  return (
    CODE_FENCE_PREFIX.test(line) ||
    HEADING_PATTERN.test(trimmed) ||
    BLOCKQUOTE_PREFIX.test(line) ||
    HORIZONTAL_RULE_PATTERN.test(trimmed) ||
    ORDERED_LIST_PATTERN.test(line) ||
    UNORDERED_LIST_PATTERN.test(line) ||
    isTableStart(lines, index)
  )
}

const renderInlineMarkdown = (text = '') => {
  const codeTokens = []
  const imageTokens = []
  const linkTokens = []
  let html = escapeHtml(text)

  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@CODETOKEN${codeTokens.length}@@`
    codeTokens.push(`<code class="inline-code">${code}</code>`)
    return token
  })

  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => {
    const token = `@@IMAGETOKEN${imageTokens.length}@@`
    imageTokens.push(
      `<img class="md-image" src="${escapeHtml(resolveMarkdownUrl(src))}" alt="${escapeHtml(alt)}" loading="lazy" style="display:block;max-width:100%;height:auto;margin:18px auto;">`,
    )
    return token
  })

  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, href) => {
    const token = `@@LINKTOKEN${linkTokens.length}@@`
    linkTokens.push(`<a class="md-link" href="${escapeHtml(resolveMarkdownUrl(href))}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    return token
  })
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
  html = html.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')

  imageTokens.forEach((tokenHtml, index) => {
    html = html.replace(`@@IMAGETOKEN${index}@@`, tokenHtml)
  })
  linkTokens.forEach((tokenHtml, index) => {
    html = html.replace(`@@LINKTOKEN${index}@@`, tokenHtml)
  })
  codeTokens.forEach((tokenHtml, index) => {
    html = html.replace(`@@CODETOKEN${index}@@`, tokenHtml)
  })

  return html
}

const renderParagraph = (lines = []) => {
  const content = lines
    .map((line) => renderInlineMarkdown(String(line).trim()))
    .join('<br>')
  return content ? `<p class="md-p">${content}</p>` : ''
}

const renderBlockquote = (lines = []) => {
  const paragraphs = []
  let chunk = []

  lines.forEach((line) => {
    const stripped = String(line).replace(BLOCKQUOTE_PREFIX, '')
    if (isBlankLine(stripped)) {
      if (chunk.length) {
        paragraphs.push(renderParagraph(chunk))
        chunk = []
      }
      return
    }
    chunk.push(stripped)
  })

  if (chunk.length) {
    paragraphs.push(renderParagraph(chunk))
  }

  return `<blockquote class="md-quote">${paragraphs.join('')}</blockquote>`
}

const renderCodeBlock = (lines = [], language = '') => {
  const languageClass = language ? ` language-${escapeHtml(language)}` : ''
  const code = escapeHtml(lines.join('\n'))
  return `<pre class="code-block"><code class="${languageClass.trim()}">${code}</code></pre>`
}

const renderTable = (tableLines = []) => {
  const headerCells = splitTableRow(tableLines[0] || '')
  const bodyRows = tableLines.slice(2).map((line) => splitTableRow(line))
  const headerHtml = headerCells
    .map((cell) => `<th class="md-th">${renderInlineMarkdown(cell)}</th>`)
    .join('')
  const bodyHtml = bodyRows
    .map((row) => {
      const cells = row.map((cell) => `<td class="md-td">${renderInlineMarkdown(cell)}</td>`).join('')
      return `<tr class="md-tr">${cells}</tr>`
    })
    .join('')

  return [
    '<div class="md-table-wrap">',
    '<table class="md-table">',
    `<thead class="md-thead"><tr class="md-tr">${headerHtml}</tr></thead>`,
    `<tbody class="md-tbody">${bodyHtml}</tbody>`,
    '</table>',
    '</div>',
  ].join('')
}

const getListToken = (line = '') => {
  const orderedMatch = String(line).match(ORDERED_LIST_PATTERN)
  if (orderedMatch) {
    return {
      type: 'ol',
      indent: normalizeIndent(orderedMatch[1]),
      marker: Number(orderedMatch[2]) || 1,
      content: orderedMatch[3],
    }
  }

  const unorderedMatch = String(line).match(UNORDERED_LIST_PATTERN)
  if (unorderedMatch) {
    return {
      type: 'ul',
      indent: normalizeIndent(unorderedMatch[1]),
      marker: null,
      content: unorderedMatch[2],
    }
  }

  return null
}

const renderList = (lines, startIndex) => {
  const stack = []
  let html = ''
  let index = startIndex

  while (index < lines.length) {
    const token = getListToken(lines[index])
    if (!token) break

    while (stack.length && token.indent < stack[stack.length - 1].indent) {
      html += `</li></${stack.pop().type}>`
    }

    if (!stack.length || token.indent > stack[stack.length - 1].indent) {
      const startAttr = token.type === 'ol' && token.marker > 1 ? ` start="${token.marker}"` : ''
      html += `<${token.type} class="${token.type === 'ol' ? 'md-ol' : 'md-ul'}"${startAttr}>`
      stack.push({ type: token.type, indent: token.indent })
    } else {
      if (token.type !== stack[stack.length - 1].type) {
        html += `</li></${stack.pop().type}>`
        const startAttr = token.type === 'ol' && token.marker > 1 ? ` start="${token.marker}"` : ''
        html += `<${token.type} class="${token.type === 'ol' ? 'md-ol' : 'md-ul'}"${startAttr}>`
        stack.push({ type: token.type, indent: token.indent })
      } else if (index > startIndex) {
        html += '</li>'
      }
    }

    const liClass = token.type === 'ol' ? 'md-oli' : 'md-li'
    html += `<li class="${liClass}">${renderInlineMarkdown(token.content.trim())}`
    index += 1

    while (index < lines.length) {
      if (isBlankLine(lines[index])) break
      if (startsBlock(lines, index)) break
      const continuationIndent = normalizeIndent(String(lines[index]).match(/^\s*/) ? String(lines[index]).match(/^\s*/)[0] : '')
      if (continuationIndent <= token.indent) break
      html += `<br>${renderInlineMarkdown(String(lines[index]).trim())}`
      index += 1
    }
  }

  while (stack.length) {
    html += `</li></${stack.pop().type}>`
  }

  return { html, nextIndex: index }
}

const stripLeadingHeading = (content = '') => content.replace(/^\s{0,3}#{1,4}\s+.+(?:\r?\n)+/, '')

export const renderReportMarkdown = (content, options = {}) => {
  if (!content) return ''

  const source = sanitizeReportMarkdownSource(content, options)
  const headingLevelOffset = Number.isFinite(Number(options.headingLevelOffset))
    ? Number(options.headingLevelOffset)
    : 1
  const lines = source.split('\n')
  const blocks = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = String(line || '').trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (CODE_FENCE_PREFIX.test(line)) {
      const language = trimmed.replace(/^```/, '').trim()
      const codeLines = []
      index += 1
      while (index < lines.length && !CODE_FENCE_PREFIX.test(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push(renderCodeBlock(codeLines, language))
      continue
    }

    if (isTableStart(lines, index)) {
      const tableLines = [lines[index], lines[index + 1]]
      index += 2
      while (index < lines.length && String(lines[index] || '').includes('|') && !isBlankLine(lines[index])) {
        tableLines.push(lines[index])
        index += 1
      }
      blocks.push(renderTable(tableLines))
      continue
    }

    const headingMatch = trimmed.match(HEADING_PATTERN)
    if (headingMatch) {
      const level = Math.max(1, Math.min(headingMatch[1].length + headingLevelOffset, 6))
      blocks.push(`<h${level} class="md-h${level}">${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`)
      index += 1
      continue
    }

    if (BLOCKQUOTE_PREFIX.test(line)) {
      const quoteLines = []
      while (index < lines.length && (BLOCKQUOTE_PREFIX.test(lines[index]) || isBlankLine(lines[index]))) {
        quoteLines.push(lines[index])
        index += 1
      }
      blocks.push(renderBlockquote(quoteLines))
      continue
    }

    if (HORIZONTAL_RULE_PATTERN.test(trimmed)) {
      blocks.push('<hr class="md-hr">')
      index += 1
      continue
    }

    if (getListToken(line)) {
      const listBlock = renderList(lines, index)
      blocks.push(listBlock.html)
      index = listBlock.nextIndex
      continue
    }

    const paragraphLines = []
    while (index < lines.length && !isBlankLine(lines[index]) && !startsBlock(lines, index)) {
      paragraphLines.push(lines[index])
      index += 1
    }
    blocks.push(renderParagraph(paragraphLines))
  }

  return blocks.join('')
}

export const renderSectionMarkdown = (content, options = {}) => renderReportMarkdown(content, {
  stripLeadingHeading: true,
  ...options,
})

export const renderResponseMarkdown = (content, options = {}) => renderReportMarkdown(content, {
  stripLeadingHeading: false,
  ...options,
})
