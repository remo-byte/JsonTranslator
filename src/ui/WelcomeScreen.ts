/**
 * WelcomeScreen — Karşılama Ekranı (Dashboard) Bileşeni.
 * Ayrı bir modül olarak yönetilir:
 * - Başlık ve branding
 * - Dosya aç eylem kartı
 * - İpuçları ve kısayollar
 * - Son açılan dosyalar listesi ve temizleme işlemi
 */

import { RecentFilesStore } from '../store/RecentFilesStore'
import { t } from '../i18n/i18n'

export interface WelcomeScreenEvents {
  onOpenFile: () => void
  onOpenFilePath: (filePath: string) => void
}

export class WelcomeScreen {
  private container: HTMLElement
  private recentFilesStore: RecentFilesStore
  private events: WelcomeScreenEvents

  constructor(
    containerId: string,
    recentFilesStore: RecentFilesStore,
    events: WelcomeScreenEvents
  ) {
    this.container = document.getElementById(containerId)!
    this.recentFilesStore = recentFilesStore
    this.events = events

    this.render()
    this.bindEvents()
  }

  /** Karşılama ekranı iskeletini oluştur */
  render(): void {
    this.container.innerHTML = `
      <div class="welcome-shell">
        <!-- App Header -->
        <div class="welcome-branding">
          <div class="welcome-badge">JSON</div>
          <div>
            <h1 class="welcome-title">JSON Translator</h1>
            <p class="welcome-tagline" data-i18n="dropzoneDesc">${t('dropzoneDesc')}</p>
          </div>
        </div>

        <!-- 2-Column Grid -->
        <div class="welcome-grid">
          <!-- Left Column: Start Actions & Shortcuts -->
          <div class="welcome-col">
            <div class="welcome-section">
              <h2 class="welcome-section-title" data-i18n="startTitle">${t('startTitle')}</h2>
              <div class="action-card" id="btn-welcome-open">
                <div class="action-card-icon">📂</div>
                <div class="action-card-text">
                  <span class="action-card-title" data-i18n="openFile">${t('openFile')}</span>
                  <span class="action-card-desc" data-i18n="openFileDesc">${t('openFileDesc')}</span>
                </div>
              </div>
            </div>

            <div class="welcome-section">
              <h2 class="welcome-section-title" data-i18n="quickTipsTitle">${t('quickTipsTitle')}</h2>
              <div class="tip-card">
                <div class="tip-item">
                  <span class="tip-icon">💡</span>
                  <span data-i18n="tipFormat">${t('tipFormat')}</span>
                </div>
                <div class="tip-item">
                  <span class="tip-icon">⚡</span>
                  <span data-i18n="tipShortcuts">${t('tipShortcuts')}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Recent Files -->
          <div class="welcome-col">
            <div class="welcome-section">
              <div class="welcome-section-header">
                <h2 class="welcome-section-title" data-i18n="recentFilesTitle">${t('recentFilesTitle')}</h2>
                <button class="btn-link" id="btn-clear-recent" data-i18n="recentFilesClear">${t('recentFilesClear')}</button>
              </div>
              <div id="recent-files-list" class="recent-files-container">
                <!-- Rendered dynamically -->
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    this.renderRecentFiles()
  }

  private bindEvents(): void {
    // Aç butonu
    this.container.querySelector('#btn-welcome-open')?.addEventListener('click', () => {
      this.events.onOpenFile()
    })

    // Temizle butonu
    this.container.querySelector('#btn-clear-recent')?.addEventListener('click', () => {
      this.recentFilesStore.clear()
      this.renderRecentFiles()
    })
  }

  /** Son açılan dosyalar listesini render eder */
  renderRecentFiles(): void {
    const listEl = this.container.querySelector<HTMLElement>('#recent-files-list')
    if (!listEl) return

    const files = this.recentFilesStore.getAll()
    listEl.innerHTML = ''

    if (files.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'recent-empty-box'
      empty.innerHTML = `
        <div class="recent-empty-icon">📁</div>
        <div class="recent-empty-title">${t('recentFilesEmpty')}</div>
        <div class="recent-empty-desc">${t('recentFilesEmptyDesc')}</div>
      `
      listEl.appendChild(empty)
      return
    }

    files.forEach(f => {
      const item = document.createElement('div')
      item.className = 'recent-item'

      const info = document.createElement('div')
      info.className = 'recent-item-info'

      const nameEl = document.createElement('span')
      nameEl.className = 'recent-item-name'
      nameEl.textContent = f.name

      const pathEl = document.createElement('span')
      pathEl.className = 'recent-item-path'
      pathEl.textContent = f.path
      pathEl.title = f.path

      info.appendChild(nameEl)
      info.appendChild(pathEl)

      const removeBtn = document.createElement('button')
      removeBtn.className = 'recent-item-remove'
      removeBtn.innerHTML = '&times;'
      removeBtn.title = 'Kaldır / Remove'
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.recentFilesStore.remove(f.path)
        this.renderRecentFiles()
      })

      item.appendChild(info)
      item.appendChild(removeBtn)

      item.addEventListener('click', () => {
        this.events.onOpenFilePath(f.path)
      })

      listEl.appendChild(item)
    })
  }

  /** Dil değiştiğinde içerideki tüm dinamik metinleri yeniler */
  refreshDynamicStrings(): void {
    const tagline = this.container.querySelector('[data-i18n="dropzoneDesc"]')
    if (tagline) tagline.textContent = t('dropzoneDesc')

    const startTitle = this.container.querySelector('[data-i18n="startTitle"]')
    if (startTitle) startTitle.textContent = t('startTitle')

    const openFile = this.container.querySelector('[data-i18n="openFile"]')
    if (openFile) openFile.textContent = t('openFile')

    const openFileDesc = this.container.querySelector('[data-i18n="openFileDesc"]')
    if (openFileDesc) openFileDesc.textContent = t('openFileDesc')

    const tipsTitle = this.container.querySelector('[data-i18n="quickTipsTitle"]')
    if (tipsTitle) tipsTitle.textContent = t('quickTipsTitle')

    const tipFormat = this.container.querySelector('[data-i18n="tipFormat"]')
    if (tipFormat) tipFormat.textContent = t('tipFormat')

    const tipShortcuts = this.container.querySelector('[data-i18n="tipShortcuts"]')
    if (tipShortcuts) tipShortcuts.textContent = t('tipShortcuts')

    const recentTitle = this.container.querySelector('[data-i18n="recentFilesTitle"]')
    if (recentTitle) recentTitle.textContent = t('recentFilesTitle')

    const recentClear = this.container.querySelector('[data-i18n="recentFilesClear"]')
    if (recentClear) recentClear.textContent = t('recentFilesClear')

    this.renderRecentFiles()
  }

  show(): void {
    this.container.style.display = 'flex'
    this.renderRecentFiles()
  }

  hide(): void {
    this.container.style.display = 'none'
  }
}
