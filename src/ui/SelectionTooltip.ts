/**
 * SelectionTooltip — Seçilen metin üzerinde beliren "Sözlüğe Ekle" dropdown / tooltip bileşeni.
 * Kullanıcı editör alanında bir kelime/cümle seçtiğinde imlecin/seçimin yanında
 * şık bir "➕ Sözlüğe Ekle" butonu gösterir.
 */

import { t } from '../i18n/i18n'

export class SelectionTooltip {
  private tooltipEl!: HTMLElement
  private selectedText: string = ''
  private onAddTermCallback: (text: string) => void

  constructor(onAddTerm: (text: string) => void) {
    this.onAddTermCallback = onAddTerm
    this.createTooltipElement()
    this.bindEvents()
  }

  private createTooltipElement(): void {
    this.tooltipEl = document.createElement('div')
    this.tooltipEl.id = 'selection-tooltip'
    this.tooltipEl.className = 'selection-tooltip'
    this.tooltipEl.style.display = 'none'

    this.tooltipEl.addEventListener('mousedown', (e) => {
      e.preventDefault() // Metin seçiminin kaybolmasını engelle
      e.stopPropagation()
    })

    this.tooltipEl.addEventListener('click', (e) => {
      e.stopPropagation()
      if (this.selectedText) {
        this.onAddTermCallback(this.selectedText)
        this.hide()
      }
    })

    document.body.appendChild(this.tooltipEl)
  }

  private bindEvents(): void {
    document.addEventListener('mouseup', (e) => {
      // Eğer tooltip'in kendisine tıklandıysa işlem yapma
      if (this.tooltipEl.contains(e.target as Node)) return

      // Küçük bir gecikme ile seçimi kontrol et (mouseup sonrası selection stabil olsun)
      setTimeout(() => this.checkSelection(), 10)
    })

    document.addEventListener('mousedown', (e) => {
      if (!this.tooltipEl.contains(e.target as Node)) {
        this.hide()
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide()
    })
  }

  private checkSelection(): void {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      this.hide()
      return
    }

    const text = selection.toString().trim()
    if (!text || text.length > 80) {
      this.hide()
      return
    }

    // Seçimin editör detay alanı içinde olup olmadığını kontrol et
    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const detailPane = document.getElementById('detail-pane')

    if (!detailPane || !detailPane.contains(container)) {
      this.hide()
      return
    }

    this.selectedText = text
    this.showAtRange(range)
  }

  private showAtRange(range: Range): void {
    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      this.hide()
      return
    }

    const displayText =
      this.selectedText.length > 20
        ? this.selectedText.slice(0, 20) + '…'
        : this.selectedText

    this.tooltipEl.innerHTML = `
      <span class="tooltip-icon">📖</span>
      <span class="tooltip-label">${t('addToDictionary')}</span>
      <span class="tooltip-term">"${displayText}"</span>
    `

    this.tooltipEl.style.display = 'flex'

    // Konumlandırma: Seçimin hemen üzerinde ortala
    const tooltipRect = this.tooltipEl.getBoundingClientRect()
    let top = rect.top - tooltipRect.height - 8
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2

    // Ekran sınırlarını kontrol et
    if (top < 10) {
      top = rect.bottom + 8 // Üstte yer yoksa altına yerleştir
    }
    if (left < 10) left = 10
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10
    }

    this.tooltipEl.style.top = `${window.scrollY + top}px`
    this.tooltipEl.style.left = `${window.scrollX + left}px`
    this.tooltipEl.classList.add('visible')
  }

  hide(): void {
    this.selectedText = ''
    this.tooltipEl.style.display = 'none'
    this.tooltipEl.classList.remove('visible')
  }
}
