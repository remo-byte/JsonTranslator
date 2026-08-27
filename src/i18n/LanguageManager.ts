/**
 * LanguageManager
 *
 * src/languages/ klasöründeki *.json dosyalarını Vite'ın
 * import.meta.glob API'si ile tarar. Her JSON'da şu alanlar beklenir:
 *   _name  → Dropdown'da gösterilecek dil adı  (örn. "English")
 *   _code  → Dil kodu                          (örn. "en")
 *   ...    → UI string key'leri
 *
 * Yeni dil eklemek için src/languages/ altına yeni bir .json dosyası
 * bırakmak yeterlidir — kod değişikliği gerekmez.
 */

const STORAGE_KEY = 'jt_lang'
const DEFAULT_LANG = 'en'

// Vite build-time static import — tüm language JSON'larını eager yükle
const langModules = import.meta.glob<Record<string, string>>(
  '../languages/*.json',
  { eager: true }
)

export interface LanguageEntry {
  code: string
  name: string
}

export type StringKey = string

class LanguageManager {
  /** Mevcut string sözlüğü */
  private strings: Record<string, string> = {}
  /** Aktif dil kodu */
  private _lang: string = DEFAULT_LANG
  /** Yüklü tüm diller */
  private _available: LanguageEntry[] = []

  constructor() {
    this._loadAll()
    const saved = localStorage.getItem(STORAGE_KEY)
    const initial = this._available.find(l => l.code === saved)?.code ?? DEFAULT_LANG
    this._apply(initial)
  }

  // ─────────────────────────────────
  // Public API
  // ─────────────────────────────────

  get lang(): string { return this._lang }

  get available(): LanguageEntry[] { return this._available }

  /** Dili değiştir ve DOM'u güncelle */
  setLang(code: string): void {
    if (!this._available.find(l => l.code === code)) return
    this._apply(code)
    localStorage.setItem(STORAGE_KEY, code)
    this.applyAll()
  }

  /** String anahtarını çevir */
  t(key: StringKey): string {
    return this.strings[key] ?? key
  }

  /**
   * Sayfadaki data-i18n attribute'lu elementleri günceller.
   *   data-i18n="key"           → element.textContent
   *   data-i18n-attr="attrName" → element.setAttribute(attrName, value)
   */
  applyAll(): void {
    document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
      const key  = el.dataset.i18n!
      const attr = el.dataset.i18nAttr
      const val  = this.t(key)
      if (attr) el.setAttribute(attr, val)
      else      el.textContent = val
    })
  }

  // ─────────────────────────────────
  // Private
  // ─────────────────────────────────

  private _loadAll(): void {
    for (const [path, module] of Object.entries(langModules)) {
      // Dosya adından kodu çıkar: '../languages/en.json' → 'en'
      const code = path.replace(/^.*\//, '').replace(/\.json$/, '')
      const name = (module['_name'] as string | undefined) ?? code
      this._available.push({ code, name })
    }
    // Alfabetik sırala (en önce default)
    this._available.sort((a, b) =>
      a.code === DEFAULT_LANG ? -1 : b.code === DEFAULT_LANG ? 1 : a.name.localeCompare(b.name)
    )
  }

  private _apply(code: string): void {
    const path = Object.keys(langModules).find(p =>
      p.replace(/^.*\//, '').replace(/\.json$/, '') === code
    )
    if (!path) return
    this._lang    = code
    this.strings  = langModules[path] as Record<string, string>
  }
}

/** Singleton */
export const langManager = new LanguageManager()

/** Kısayol */
export const t = (key: StringKey): string => langManager.t(key)
