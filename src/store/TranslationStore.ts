/**
 * TranslationStore — Veri katmanı.
 * JSON yükleme, state tutma, serialize etme.
 */

export interface TranslationEntry {
  key: string        // Kaynak İngilizce metin
  value: string      // Mevcut çeviri (boş = çevrilmemiş)
  dirty: boolean     // Değiştirildi mi
}

export class TranslationStore {
  private entries: TranslationEntry[] = []
  private filePath: string | null = null
  private _isDirty = false

  get currentFilePath(): string | null {
    return this.filePath
  }

  get isDirty(): boolean {
    return this._isDirty
  }

  get fileName(): string {
    if (!this.filePath) return 'Dosya Yok'
    const parts = this.filePath.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1]
  }

  /** Ham JSON string'den yükle */
  loadFromJson(jsonContent: string, filePath: string): void {
    const raw = JSON.parse(jsonContent) as Record<string, string>

    if (typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Geçersiz format: Düz {string: string} objesi bekleniyor.')
    }

    this.entries = Object.entries(raw).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : '',
      dirty: false,
    }))
    this.filePath = filePath
    this._isDirty = false
  }

  /** Tüm girdiler */
  getAll(): TranslationEntry[] {
    return this.entries
  }

  /** Çevrilmiş girdiler (value !== '') */
  getTranslated(): TranslationEntry[] {
    return this.entries.filter(e => e.value.trim() !== '')
  }

  /** Çevrilmemiş girdiler (value === '') */
  getUntranslated(): TranslationEntry[] {
    return this.entries.filter(e => e.value.trim() === '')
  }

  /** Toplam girdi sayısı */
  get total(): number {
    return this.entries.length
  }

  /** Çevrilen girdi sayısı */
  get translatedCount(): number {
    return this.entries.filter(e => e.value.trim() !== '').length
  }

  /** Bir girdinin değerini güncelle */
  update(key: string, value: string): void {
    const entry = this.entries.find(e => e.key === key)
    if (entry) {
      entry.value = value
      entry.dirty = true
      this._isDirty = true
    }
  }

  /**
   * JSON çıktısı — build_translation.py kuralları:
   * indent=1, ensure_ascii=False (JS native unicode)
   */
  serialize(): string {
    const obj: Record<string, string> = {}
    for (const entry of this.entries) {
      obj[entry.key] = entry.value
    }
    return JSON.stringify(obj, null, 1)
  }

  /** Kaydetme sonrası dirty sıfırla */
  markSaved(newFilePath?: string): void {
    if (newFilePath) this.filePath = newFilePath
    this._isDirty = false
    for (const entry of this.entries) {
      entry.dirty = false
    }
  }

  /** LocalStorage'a kaydet */
  saveToLocalStorage(): void {
    if (!this.filePath) return
    const key = `jt_draft_${this.fileName}`
    localStorage.setItem(key, JSON.stringify({
      filePath: this.filePath,
      entries: this.entries,
    }))
  }

  /** LocalStorage'dan yükle — mevcut filePath eşleşiyorsa */
  restoreFromLocalStorage(filePath: string): boolean {
    const fileName = filePath.replace(/\\/g, '/').split('/').pop() ?? ''
    const raw = localStorage.getItem(`jt_draft_${fileName}`)
    if (!raw) return false

    try {
      const data = JSON.parse(raw) as { filePath: string; entries: TranslationEntry[] }
      if (data.filePath !== filePath) return false
      this.entries = data.entries
      this.filePath = filePath
      this._isDirty = true
      return true
    } catch {
      return false
    }
  }

  /**
   * Birleştirilmiş güncel girdi listesini store'a uygular.
   */
  applyMerge(newEntries: TranslationEntry[]): void {
    this.entries = newEntries
    this._isDirty = true
    this.saveToLocalStorage()
  }
}

