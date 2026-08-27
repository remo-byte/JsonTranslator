/**
 * FindReplaceModal — Proje Çapında Gelişmiş Bul & Değiştir Modalı (Ctrl+H).
 * BaseModal soyut temel sınıfından türetilmiştir (OOP Kalıtım).
 */

import { BaseModal } from './BaseModal'
import { TranslationStore, TranslationEntry } from '../store/TranslationStore'
import { t } from '../i18n/i18n'

export interface FindMatch {
  key: string
  originalValue: string
  previewReplaced: string
  occurrences: number
}

export class FindReplaceModal extends BaseModal {
  private store: TranslationStore

  private findInput!: HTMLInputElement
  private replaceInput!: HTMLInputElement
  private caseCheck!: HTMLInputElement
  private wordCheck!: HTMLInputElement
  private regexCheck!: HTMLInputElement
  private statusText!: HTMLElement
  private previewList!: HTMLElement

  onReplaceAll?: (replacedCount: number) => void
  onSelectEntry?: (key: string) => void

  constructor(store: TranslationStore) {
    super('find-replace-overlay')
    this.store = store
    this.initElements()
    this.bindEvents()
  }

  private initElements(): void {
    this.findInput    = document.getElementById('find-query-input') as HTMLInputElement
    this.replaceInput = document.getElementById('replace-query-input') as HTMLInputElement
    this.caseCheck    = document.getElementById('find-opt-case') as HTMLInputElement
    this.wordCheck    = document.getElementById('find-opt-word') as HTMLInputElement
    this.regexCheck   = document.getElementById('find-opt-regex') as HTMLInputElement
    this.statusText   = document.getElementById('find-status-text')!
    this.previewList  = document.getElementById('find-results-list')!
  }

  private bindEvents(): void {
    document.getElementById('btn-find-close')?.addEventListener('click', () => this.close())
    document.getElementById('btn-find-cancel')?.addEventListener('click', () => this.close())

    this.findInput?.addEventListener('input', () => this.performSearch())
    this.replaceInput?.addEventListener('input', () => this.performSearch())
    this.caseCheck?.addEventListener('change', () => this.performSearch())
    this.wordCheck?.addEventListener('change', () => this.performSearch())
    this.regexCheck?.addEventListener('change', () => this.performSearch())

    document.getElementById('btn-find-replace-all')?.addEventListener('click', () => this.replaceAll())
  }

  protected override onOpen(): void {
    setTimeout(() => {
      this.findInput?.focus()
      this.findInput?.select()
    }, 50)
    this.performSearch()
  }

  private buildRegex(): RegExp | null {
    const query = this.findInput.value
    if (!query) return null

    try {
      let pattern = query
      if (!this.regexCheck.checked) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      }
      if (this.wordCheck.checked) {
        pattern = `\\b${pattern}\\b`
      }
      const flags = this.caseCheck.checked ? 'g' : 'gi'
      return new RegExp(pattern, flags)
    } catch {
      return null
    }
  }

  private performSearch(): void {
    const regex = this.buildRegex()
    if (!regex || !this.previewList) {
      if (this.statusText) this.statusText.textContent = t('findTypeToSearch')
      if (this.previewList) this.previewList.innerHTML = `<div class="find-empty">${t('findTypeToSearch')}</div>`
      return
    }


    const replaceText = this.replaceInput.value || ''
    const matches: FindMatch[] = []
    let totalOccurrences = 0

    for (const entry of this.store.getAll()) {
      if (!entry.value) continue
      const count = (entry.value.match(regex) || []).length
      if (count > 0) {
        totalOccurrences += count
        const replaced = entry.value.replace(regex, replaceText)
        matches.push({
          key: entry.key,
          originalValue: entry.value,
          previewReplaced: replaced,
          occurrences: count,
        })
      }
    }

    if (this.statusText) {
      this.statusText.textContent = `${matches.length} ${t('findEntriesFound')} (${totalOccurrences} ${t('findOccurrences')})`
    }

    this.renderPreview(matches)
  }

  private renderPreview(matches: FindMatch[]): void {
    this.previewList.innerHTML = ''
    if (matches.length === 0) {
      this.previewList.innerHTML = `<div class="find-empty">${t('noResults')}</div>`
      return
    }

    const frag = document.createDocumentFragment()
    for (const match of matches) {
      const row = document.createElement('div')
      row.className = 'find-result-row'
      row.title = `${t('goToEntry')}: ${match.key}`

      const left = document.createElement('div')
      left.className = 'fr-left'

      const keyEl = document.createElement('div')
      keyEl.className = 'fr-key'
      keyEl.textContent = match.key

      const valEl = document.createElement('div')
      valEl.className = 'fr-val'
      valEl.textContent = match.originalValue

      left.appendChild(keyEl)
      left.appendChild(valEl)

      const arrow = document.createElement('div')
      arrow.className = 'fr-arrow'
      arrow.textContent = '→'

      const right = document.createElement('div')
      right.className = 'fr-right'
      right.textContent = match.previewReplaced

      row.appendChild(left)
      row.appendChild(arrow)
      row.appendChild(right)

      row.addEventListener('click', () => {
        this.onSelectEntry?.(match.key)
        this.close()
      })

      frag.appendChild(row)
    }

    this.previewList.appendChild(frag)
  }

  private replaceAll(): void {
    const regex = this.buildRegex()
    if (!regex) return

    const replaceText = this.replaceInput.value || ''
    let replacedCount = 0

    for (const entry of this.store.getAll()) {
      if (!entry.value) continue
      if (regex.test(entry.value)) {
        const newVal = entry.value.replace(regex, replaceText)
        this.store.update(entry.key, newVal)
        replacedCount++
      }
    }

    if (replacedCount > 0) {
      this.store.saveToLocalStorage()
      this.onReplaceAll?.(replacedCount)
      this.close()
    }
  }

  refreshTexts(): void {
    const titleEl = document.getElementById('find-title')
    const subTitleEl = document.getElementById('find-subtitle')
    const btnCancel = document.getElementById('btn-find-cancel')
    const btnReplace = document.getElementById('btn-find-replace-all')

    if (titleEl) titleEl.textContent = t('findTitle')
    if (subTitleEl) subTitleEl.textContent = t('findSubtitle')
    if (btnCancel) btnCancel.textContent = t('mergeCancel')
    if (btnReplace) btnReplace.textContent = `⚡ ${t('findReplaceAll')}`

    const lblFind = document.getElementById('lbl-find-query')
    const lblReplace = document.getElementById('lbl-replace-query')
    const lblCase = document.getElementById('lbl-opt-case')
    const lblWord = document.getElementById('lbl-opt-word')
    const lblRegex = document.getElementById('lbl-opt-regex')

    if (lblFind) lblFind.textContent = t('findLabel')
    if (lblReplace) lblReplace.textContent = t('replaceLabel')
    if (lblCase) lblCase.textContent = t('findMatchCase')
    if (lblWord) lblWord.textContent = t('findWholeWord')
    if (lblRegex) lblRegex.textContent = t('findRegex')

    if (this.findInput) this.findInput.placeholder = t('findPlaceholder')
    if (this.replaceInput) this.replaceInput.placeholder = t('replacePlaceholder')
  }
}

