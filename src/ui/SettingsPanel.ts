/**
 * SettingsPanel — Ayarlar modal'ını yönetir.
 * BaseModal soyut temel sınıfından türetilmiştir (OOP Kalıtım).
 */

import { BaseModal } from './BaseModal'
import { langManager, t } from '../i18n/LanguageManager'
import { TranslationService, MTProvider } from '../services/TranslationService'

export class SettingsPanel extends BaseModal {
  private select!: HTMLSelectElement
  private translationService: TranslationService

  // MT elementleri
  private mtProviderSelect!: HTMLSelectElement
  private mtLangSelect!: HTMLSelectElement
  private mtDeeplInput!: HTMLInputElement
  private mtGoogleInput!: HTMLInputElement
  private mtDeeplRow!: HTMLElement
  private mtGoogleRow!: HTMLElement

  onLangChange: (() => void) | null = null

  constructor(translationService: TranslationService) {
    super('settings-overlay')
    this.translationService = translationService

    this._buildDropdown()
    this._initMTElements()

    document.getElementById('btn-settings-close')?.addEventListener('click', () => this.close())
    document.getElementById('btn-settings-close-footer')?.addEventListener('click', () => this.close())
  }

  protected override onOpen(): void {
    this._refreshOptions()
    this._loadMTSettings()
    setTimeout(() => this.select?.focus(), 50)
  }

  refreshTexts(): void {
    const titleEl = document.getElementById('settings-title')
    const langEl  = document.getElementById('settings-lang-label')
    const mtTitle = document.getElementById('settings-mt-title')
    const mtProv  = document.getElementById('settings-mt-provider-label')
    const mtLang  = document.getElementById('settings-mt-lang-label')
    const mtDeepl = document.getElementById('settings-mt-deepl-label')
    const mtGoog  = document.getElementById('settings-mt-google-label')
    const closeBtn = document.getElementById('btn-settings-close-footer')

    if (titleEl) titleEl.textContent = t('settingsTitle')
    if (langEl)  langEl.textContent  = t('settingsLang')
    if (mtTitle) mtTitle.textContent = t('mtSectionTitle')
    if (mtProv)  mtProv.textContent  = t('mtProvider')
    if (mtLang)  mtLang.textContent  = t('mtTargetLang')
    if (mtDeepl) mtDeepl.textContent = t('mtDeeplKey')
    if (mtGoog)  mtGoog.textContent  = t('mtGoogleKey')
    if (closeBtn) closeBtn.textContent = t('settingsClose')

    if (this.mtDeeplInput) this.mtDeeplInput.placeholder = t('mtDeeplKeyPlaceholder')
    if (this.mtGoogleInput) this.mtGoogleInput.placeholder = t('mtGoogleKeyPlaceholder')
  }

  // ─────────────────────────────────────
  // Private
  // ─────────────────────────────────────

  private _buildDropdown(): void {
    const container = document.getElementById('lang-select-container')
    if (!container) return

    this.select = document.createElement('select')
    this.select.id        = 'lang-select'
    this.select.className = 'lang-select'

    langManager.available.forEach(lang => {
      const opt = document.createElement('option')
      opt.value       = lang.code
      opt.textContent = lang.name
      opt.selected    = lang.code === langManager.lang
      this.select.appendChild(opt)
    })

    this.select.addEventListener('change', () => {
      langManager.setLang(this.select.value)
      this.onLangChange?.()
    })

    container.appendChild(this.select)
  }

  private _initMTElements(): void {
    this.mtProviderSelect = document.getElementById('mt-provider-select') as HTMLSelectElement
    this.mtLangSelect     = document.getElementById('mt-lang-select') as HTMLSelectElement
    this.mtDeeplInput     = document.getElementById('mt-deepl-key') as HTMLInputElement
    this.mtGoogleInput    = document.getElementById('mt-google-key') as HTMLInputElement
    this.mtDeeplRow       = document.getElementById('mt-deepl-row')!
    this.mtGoogleRow      = document.getElementById('mt-google-row')!

    this.mtProviderSelect?.addEventListener('change', () => {
      this.translationService.saveSettings({ provider: this.mtProviderSelect.value as MTProvider })
      this._updateMTRowsVisibility()
    })

    this.mtLangSelect?.addEventListener('change', () => {
      this.translationService.saveSettings({ targetLang: this.mtLangSelect.value })
    })

    this.mtDeeplInput?.addEventListener('input', () => {
      this.translationService.saveSettings({ deeplApiKey: this.mtDeeplInput.value.trim() })
    })

    this.mtGoogleInput?.addEventListener('input', () => {
      this.translationService.saveSettings({ googleApiKey: this.mtGoogleInput.value.trim() })
    })
  }

  private _loadMTSettings(): void {
    const settings = this.translationService.getSettings()
    if (this.mtProviderSelect) this.mtProviderSelect.value = settings.provider
    if (this.mtLangSelect) this.mtLangSelect.value = settings.targetLang
    if (this.mtDeeplInput) this.mtDeeplInput.value = settings.deeplApiKey
    if (this.mtGoogleInput) this.mtGoogleInput.value = settings.googleApiKey

    this._updateMTRowsVisibility()
  }

  private _updateMTRowsVisibility(): void {
    const provider = this.mtProviderSelect?.value || 'google'
    if (provider === 'deepl') {
      if (this.mtDeeplRow) this.mtDeeplRow.style.display = 'flex'
      if (this.mtGoogleRow) this.mtGoogleRow.style.display = 'none'
    } else {
      if (this.mtDeeplRow) this.mtDeeplRow.style.display = 'none'
      if (this.mtGoogleRow) this.mtGoogleRow.style.display = 'flex'
    }
  }

  private _refreshOptions(): void {
    if (!this.select) return
    this.select.value = langManager.lang
  }
}
