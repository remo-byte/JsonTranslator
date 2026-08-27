/**
 * MergeModal — Güncelleme Birleştirme (Diff & Merge) Önizleme ve Onay Modalı.
 * BaseModal soyut temel sınıfından türetilmiştir (OOP Kalıtım).
 */

import { BaseModal } from './BaseModal'
import { MergeResult, MergeEntryDetail } from '../core/JsonMerger'
import { t } from '../i18n/i18n'

export class MergeModal extends BaseModal {
  private currentResult: MergeResult | null = null
  private activeFilter: 'all' | 'changed' = 'changed'

  onConfirm: ((result: MergeResult) => void) | null = null

  constructor() {
    super('merge-overlay')
    this.bindMergeEvents()
  }

  openWithResult(result: MergeResult): void {
    this.currentResult = result
    this.activeFilter = 'changed'
    this.open()
  }

  protected override onOpen(): void {
    this.renderStats()
    this.renderDetails()
  }

  protected override onClose(): void {
    this.currentResult = null
  }

  private bindMergeEvents(): void {
    document.getElementById('btn-merge-close')?.addEventListener('click', () => this.close())
    document.getElementById('btn-merge-cancel')?.addEventListener('click', () => this.close())

    document.getElementById('btn-merge-confirm')?.addEventListener('click', () => {
      if (this.currentResult) {
        this.onConfirm?.(this.currentResult)
        this.close()
      }
    })

    document.getElementById('merge-tab-changed')?.addEventListener('click', () => {
      this.activeFilter = 'changed'
      this.updateTabStyles()
      this.renderDetails()
    })

    document.getElementById('merge-tab-all')?.addEventListener('click', () => {
      this.activeFilter = 'all'
      this.updateTabStyles()
      this.renderDetails()
    })
  }

  private updateTabStyles(): void {
    const tabChanged = document.getElementById('merge-tab-changed')
    const tabAll = document.getElementById('merge-tab-all')
    if (this.activeFilter === 'changed') {
      tabChanged?.classList.add('active')
      tabAll?.classList.remove('active')
    } else {
      tabChanged?.classList.remove('active')
      tabAll?.classList.add('active')
    }
  }

  private renderStats(): void {
    if (!this.currentResult) return
    const { stats } = this.currentResult

    const elExact   = document.getElementById('stat-exact-val')
    const elRenamed = document.getElementById('stat-renamed-val')
    const elFuzzy   = document.getElementById('stat-fuzzy-val')
    const elNew     = document.getElementById('stat-new-val')
    const elRemoved = document.getElementById('stat-removed-val')

    if (elExact)   elExact.textContent   = String(stats.exactCount)
    if (elRenamed) elRenamed.textContent = String(stats.renamedCount)
    if (elFuzzy)   elFuzzy.textContent   = String(stats.fuzzyCount)
    if (elNew)     elNew.textContent     = String(stats.newCount)
    if (elRemoved) elRemoved.textContent = String(stats.removedCount)
  }

  private renderDetails(): void {
    const listEl = document.getElementById('merge-diff-list')
    if (!listEl || !this.currentResult) return
    listEl.innerHTML = ''

    let items: MergeEntryDetail[] = this.currentResult.details
    if (this.activeFilter === 'changed') {
      items = items.filter(d => d.matchType !== 'exact')
    }

    if (items.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'merge-empty'
      empty.textContent = t('mergeNoChanges')
      listEl.appendChild(empty)
      return
    }

    const frag = document.createDocumentFragment()
    for (const item of items) {
      const row = document.createElement('div')
      row.className = `merge-item-row match-${item.matchType}`

      // Sol: Badge ve Key
      const left = document.createElement('div')
      left.className = 'merge-item-left'

      const badge = document.createElement('span')
      badge.className = `merge-badge badge-${item.matchType}`

      if (item.matchType === 'exact') {
        badge.textContent = t('mergeBadgeExact')
      } else if (item.matchType === 'renamed') {
        badge.textContent = `${t('mergeBadgeRenamed')} (${item.matchedFromKey})`
      } else if (item.matchType === 'fuzzy') {
        badge.textContent = `${t('mergeBadgeFuzzy')} %${item.similarity} (${item.matchedFromKey})`
      } else {
        badge.textContent = t('mergeBadgeNew')
      }


      const keyEl = document.createElement('div')
      keyEl.className = 'merge-item-key'
      keyEl.textContent = item.key

      left.appendChild(badge)
      left.appendChild(keyEl)

      // Sağ: Çeviri Önizlemesi
      const right = document.createElement('div')
      right.className = 'merge-item-right'
      right.textContent = item.translation || t('untranslatedLabel')
      if (!item.translation) right.classList.add('empty')

      row.appendChild(left)
      row.appendChild(right)
      frag.appendChild(row)
    }

    listEl.appendChild(frag)
  }

  refreshTexts(): void {
    const titleEl    = document.getElementById('merge-title')
    const subTitleEl = document.getElementById('merge-subtitle')
    const tabChanged = document.getElementById('merge-tab-changed')
    const tabAll     = document.getElementById('merge-tab-all')
    const btnCancel  = document.getElementById('btn-merge-cancel')
    const btnConfirm = document.getElementById('btn-merge-confirm')

    if (titleEl)    titleEl.textContent    = t('mergeTitle')
    if (subTitleEl) subTitleEl.textContent = t('mergeSubtitle')
    if (tabChanged) tabChanged.textContent = t('mergeFilterChanged')
    if (tabAll)     tabAll.textContent     = t('mergeFilterAll')
    if (btnCancel)  btnCancel.textContent  = t('mergeCancel')
    if (btnConfirm) btnConfirm.textContent = t('mergeApply')

    const lblExact   = document.getElementById('stat-exact-lbl')
    const lblRenamed = document.getElementById('stat-renamed-lbl')
    const lblFuzzy   = document.getElementById('stat-fuzzy-lbl')
    const lblNew     = document.getElementById('stat-new-lbl')
    const lblRemoved = document.getElementById('stat-removed-lbl')

    if (lblExact)   lblExact.textContent   = t('mergeStatExact')
    if (lblRenamed) lblRenamed.textContent = t('mergeStatRenamed')
    if (lblFuzzy)   lblFuzzy.textContent   = t('mergeStatFuzzy')
    if (lblNew)     lblNew.textContent     = t('mergeStatNew')
    if (lblRemoved) lblRemoved.textContent = t('mergeStatRemoved')
  }
}
