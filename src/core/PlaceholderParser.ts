/**
 * PlaceholderParser — Kaynak metindeki yer tutucuları ve HTML etiketleri tespit eder.
 * validate_translation.py regex kuralları ile birebir uyumludur.
 */

export interface Token {
  type: 'placeholder' | 'tag' | 'text'
  value: string
}

const PLACEHOLDER_RE = /%[A-Za-z0-9]+/g
const TAG_RE = /<[^>]+>/g

export class PlaceholderParser {
  /**
   * Metni token dizisine ayırır:
   * - placeholder: %s, %d, %0 vb.
   * - tag: <b>, </b>, <br/> vb.
   * - text: düz metin
   */
  tokenize(text: string): Token[] {
    const tokens: Token[] = []
    const combined = new RegExp(
      `(${PLACEHOLDER_RE.source})|(${TAG_RE.source})`,
      'g'
    )
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = combined.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
      }
      if (match[1] !== undefined) {
        tokens.push({ type: 'placeholder', value: match[0] })
      } else {
        tokens.push({ type: 'tag', value: match[0] })
      }
      lastIndex = combined.lastIndex
    }

    if (lastIndex < text.length) {
      tokens.push({ type: 'text', value: text.slice(lastIndex) })
    }

    return tokens
  }

  /** Sadece yer tutucu listesi — sıralı karşılaştırma için */
  extractPlaceholders(text: string): string[] {
    return Array.from(text.matchAll(PLACEHOLDER_RE), m => m[0])
  }

  /** Sadece etiket listesi — normalize edilmiş (boşluk kaldırılmış, küçük harf) */
  extractTags(text: string): string[] {
    return Array.from(text.matchAll(TAG_RE), m =>
      m[0].replace(/\s+/g, '').toLowerCase()
    )
  }
}
