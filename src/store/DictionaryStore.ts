/**
 * DictionaryStore — Terimler Sözlüğü (Glossary) veri yönetimi.
 * Kaynak metinlerdeki terimlerin otomatik bulunmasını, eklenmesini,
 * silinmesini, akıllı harf uyarlamasını (Case Matching),
 * JSON ve CSV/TSV içe/dışa aktarılmasını sağlar.
 */

export interface DictionaryTerm {
  id: string
  source: string // Kaynak dil terimi (örn: "Mission")
  target: string // Hedef dil karşılığı (örn: "Görev")
  note?: string   // İsteğe bağlı açıklama/not
}

export interface TermMatch {
  term: DictionaryTerm
  start: number
  end: number
  matchedText: string
  adaptedTarget: string
}

const STORAGE_KEY = 'jt_glossary_terms'

export class DictionaryStore {
  private terms: DictionaryTerm[] = []

  constructor() {
    this.load()
  }

  getAll(): DictionaryTerm[] {
    return this.terms
  }

  add(source: string, target: string, note?: string): DictionaryTerm | null {
    const s = source.trim()
    const t = target.trim()
    if (!s || !t) return null

    // Aynı kaynak kelime varsa güncelle
    const existing = this.terms.find(
      item => item.source.toLowerCase() === s.toLowerCase()
    )

    if (existing) {
      existing.target = t
      if (note !== undefined) existing.note = note.trim()
      this.save()
      return existing
    }

    const newTerm: DictionaryTerm = {
      id: `term_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: s,
      target: t,
      note: note ? note.trim() : undefined,
    }

    this.terms.unshift(newTerm)
    this.save()
    return newTerm
  }

  update(id: string, source: string, target: string, note?: string): boolean {
    const term = this.terms.find(t => t.id === id)
    if (!term) return false
    const s = source.trim()
    const tg = target.trim()
    if (!s || !tg) return false

    term.source = s
    term.target = tg
    term.note = note ? note.trim() : undefined
    this.save()
    return true
  }

  delete(id: string): boolean {
    const initLen = this.terms.length
    this.terms = this.terms.filter(t => t.id !== id)
    if (this.terms.length !== initLen) {
      this.save()
      return true
    }
    return false
  }

  clear(): void {
    this.terms = []
    this.save()
  }

  /**
   * Akıllı Harf Uyarlaması (Smart Case Matching)
   * Kaynak metindeki harf yapısına göre hedef çeviriyi uyarlar:
   * - MISSION -> GÖREV
   * - Mission -> Görev
   * - mission -> görev
   */
  matchCase(sourceOccurrence: string, targetTranslation: string): string {
    if (!sourceOccurrence || !targetTranslation) return targetTranslation

    // Tamamı BÜYÜK HARF ise
    if (
      sourceOccurrence.length > 1 &&
      sourceOccurrence === sourceOccurrence.toLocaleUpperCase()
    ) {
      return targetTranslation.toLocaleUpperCase()
    }

    // İlk harf büyükse
    const firstChar = sourceOccurrence.charAt(0)
    if (
      firstChar === firstChar.toLocaleUpperCase() &&
      firstChar !== firstChar.toLocaleLowerCase()
    ) {
      return (
        targetTranslation.charAt(0).toLocaleUpperCase() +
        targetTranslation.slice(1)
      )
    }

    // Tamamı küçük harf ise
    if (sourceOccurrence === sourceOccurrence.toLocaleLowerCase()) {
      return (
        targetTranslation.charAt(0).toLocaleLowerCase() +
        targetTranslation.slice(1)
      )
    }

    return targetTranslation
  }

  /**
   * Verilen kaynak metinde geçen tüm sözlük terimlerini bulur.
   * Uzun terimler önce eşleşecek şekilde sıralanır.
   */
  findMatches(text: string): DictionaryTerm[] {
    if (!text || this.terms.length === 0) return []
    const lowerText = text.toLowerCase()

    // Uzun terimlere öncelik ver
    const sorted = [...this.terms].sort(
      (a, b) => b.source.length - a.source.length
    )

    const matches: DictionaryTerm[] = []
    const matchedIds = new Set<string>()

    for (const term of sorted) {
      const srcLower = term.source.toLowerCase()
      // Kelime veya alt dize eşleşmesi
      if (lowerText.includes(srcLower) && !matchedIds.has(term.id)) {
        matches.push(term)
        matchedIds.add(term.id)
      }
    }

    return matches
  }

  /**
   * Metin içinde geçen terimlerin başlangıç-bitiş konumlarını ve
   * uyarlanmış çeviri karşılıklarını çakışmasız (non-overlapping) olarak döner.
   */
  findMatchesWithOffsets(text: string): TermMatch[] {
    if (!text || this.terms.length === 0) return []

    // Uzun terimlere öncelik ver
    const sorted = [...this.terms].sort(
      (a, b) => b.source.length - a.source.length
    )

    const matches: TermMatch[] = []
    const occupied = new Array<boolean>(text.length).fill(false)

    for (const term of sorted) {
      const srcLen = term.source.length
      if (srcLen === 0) continue

      // Regex ile büyük/küçük harf duyarsız arama
      const escaped = term.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length

        // Alan daha önce başka bir uzun terimle eşleşti mi?
        let isFree = true
        for (let i = start; i < end; i++) {
          if (occupied[i]) {
            isFree = false
            break
          }
        }

        if (isFree) {
          for (let i = start; i < end; i++) occupied[i] = true
          const matchedText = match[0]
          const adaptedTarget = this.matchCase(matchedText, term.target)

          matches.push({
            term,
            start,
            end,
            matchedText,
            adaptedTarget,
          })
        }
      }
    }

    // Metin sırasına göre sırala
    return matches.sort((a, b) => a.start - b.start)
  }

  /** JSON olarak dışa aktar */
  exportJson(): string {
    return JSON.stringify(this.terms, null, 2)
  }

  /** JSON'dan içeri aktar */
  importJson(jsonString: string): number {
    try {
      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) return 0

      let addedCount = 0
      for (const item of parsed) {
        if (item && typeof item.source === 'string' && typeof item.target === 'string') {
          if (this.add(item.source, item.target, item.note)) {
            addedCount++
          }
        }
      }
      return addedCount
    } catch {
      return 0
    }
  }

  /** CSV / Excel olarak dışa aktar (UTF-8 BOM ile) */
  exportCsv(): string {
    const header = 'Source,Target,Note\r\n'
    const rows = this.terms.map(t => {
      const s = `"${(t.source || '').replace(/"/g, '""')}"`
      const tgt = `"${(t.target || '').replace(/"/g, '""')}"`
      const n = t.note ? `"${t.note.replace(/"/g, '""')}"` : '""'
      return `${s},${tgt},${n}`
    })
    return '\uFEFF' + header + rows.join('\r\n')
  }

  /** CSV, TSV veya noktalı virgüllü dosyayı içeri aktar */
  importCsv(csvString: string): number {
    if (!csvString || !csvString.trim()) return 0

    // BOM temizle
    const clean = csvString.replace(/^\uFEFF/, '')
    const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0)
    if (lines.length === 0) return 0

    // Ayırıcıyı tespit et (, veya \t veya ;)
    const firstLine = lines[0]
    let sep = ','
    if (firstLine.includes('\t')) sep = '\t'
    else if (firstLine.includes(';') && !firstLine.includes(',')) sep = ';'

    let addedCount = 0
    let startIndex = 0

    // Başlık satırı kontrolü (Source / Target / vb.)
    if (
      firstLine.toLowerCase().includes('source') ||
      firstLine.toLowerCase().includes('kaynak') ||
      firstLine.toLowerCase().includes('english')
    ) {
      startIndex = 1
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      const parts = this.parseCsvLine(line, sep)
      if (parts.length >= 2) {
        const src = parts[0]?.trim()
        const tgt = parts[1]?.trim()
        const note = parts[2]?.trim() || undefined
        if (src && tgt) {
          if (this.add(src, tgt, note)) {
            addedCount++
          }
        }
      }
    }

    return addedCount
  }

  private parseCsvLine(line: string, sep: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === sep && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.terms = JSON.parse(raw)
      }
    } catch {
      this.terms = []
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.terms))
    } catch {
      // ignore
    }
  }
}
