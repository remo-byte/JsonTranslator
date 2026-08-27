/**
 * StatsModal — Proje İstatistikleri ve Kelime Analizi Modalı.
 * BaseModal soyut temel sınıfından türetilmiştir (OOP Kalıtım).
 */

import { BaseModal } from './BaseModal'
import { ProjectStats, StatisticsEngine } from '../core/StatisticsEngine'
import { TranslationStore } from '../store/TranslationStore'
import { Validator } from '../core/Validator'
import { t } from '../i18n/i18n'

export class StatsModal extends BaseModal {
  private store: TranslationStore
  private validator: Validator

  constructor(store: TranslationStore, validator: Validator) {
    super('stats-overlay')
    this.store = store
    this.validator = validator

    document.getElementById('btn-stats-close')?.addEventListener('click', () => this.close())
    document.getElementById('btn-stats-close-footer')?.addEventListener('click', () => this.close())
  }

  protected override onOpen(): void {
    this.render()
  }

  render(): void {
    const stats: ProjectStats = StatisticsEngine.compute(this.store.getAll(), this.validator)

    // İlerleme yüzdesi ve çubuğu
    const pctEl = document.getElementById('stats-progress-percent')
    const barEl = document.getElementById('stats-progress-bar-fill')
    const countEl = document.getElementById('stats-progress-counts')

    if (pctEl) pctEl.textContent = `%${stats.progressPercent}`
    if (barEl) barEl.style.width = `${stats.progressPercent}%`
    if (countEl) {
      countEl.textContent = `${stats.translatedEntries} / ${stats.totalEntries} ${t('statsEntries')}`
    }

    // Metrik Değerleri
    this.setText('stats-val-src-words', stats.sourceWords.toLocaleString())
    this.setText('stats-val-rem-words', stats.remainingSourceWords.toLocaleString())
    this.setText('stats-val-tgt-words', stats.targetWords.toLocaleString())

    this.setText('stats-val-src-chars', stats.sourceChars.toLocaleString())
    this.setText('stats-val-src-chars-nospace', stats.sourceCharsNoSpaces.toLocaleString())
    this.setText('stats-val-tgt-chars', stats.targetChars.toLocaleString())
  }

  private setText(id: string, text: string): void {
    const el = document.getElementById(id)
    if (el) el.textContent = text
  }

  refreshTexts(): void {
    const titleEl = document.getElementById('stats-title')
    const subTitleEl = document.getElementById('stats-subtitle')
    const closeBtn = document.getElementById('btn-stats-close-footer')

    if (titleEl) titleEl.textContent = t('statsTitle')
    if (subTitleEl) subTitleEl.textContent = t('statsSubtitle')
    if (closeBtn) closeBtn.textContent = t('settingsClose')

    // Başlık etiketleri
    this.setText('lbl-stats-src-words', t('statsSourceWords'))
    this.setText('lbl-stats-rem-words', t('statsRemainingWords'))
    this.setText('lbl-stats-tgt-words', t('statsTargetWords'))
    this.setText('lbl-stats-src-chars', t('statsSourceChars'))
    this.setText('lbl-stats-src-chars-nospace', t('statsCharsNoSpace'))
    this.setText('lbl-stats-tgt-chars', t('statsTargetChars'))
  }
}
