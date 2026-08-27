/**
 * BatchTranslateModal — Toplu Otomatik Çeviri (Batch MT) Yöneticisi ve Canlı İlerleme Modalı.
 * BaseModal soyut temel sınıfından türetilmiştir (OOP Kalıtım).
 */

import { BaseModal } from './BaseModal'
import { TranslationService } from '../services/TranslationService'
import { TranslationStore, TranslationEntry } from '../store/TranslationStore'
import { t } from '../i18n/i18n'

export class BatchTranslateModal extends BaseModal {
  private service: TranslationService
  private store: TranslationStore

  private isRunning = false
  private isPaused = false
  private isCancelled = false

  private targetEntries: TranslationEntry[] = []
  private currentIndex = 0
  private successCount = 0
  private errorCount = 0

  // Sayfa bazlı çeviri için aktif sayfadaki girdileri dışarıdan alabilme
  currentPageEntries: TranslationEntry[] = []

  onEntryTranslated?: (key: string, value: string) => void
  onFinished?: (totalSuccess: number) => void

  constructor(service: TranslationService, store: TranslationStore) {
    super('batch-overlay')
    this.service = service
    this.store = store
    this.bindBatchEvents()
  }

  protected override onOpen(): void {
    if (!this.isRunning) {
      this.resetState()
      this.updateScopeCounts()
      this.showConfigView()
    }
  }

  protected override canClose(): boolean {
    if (this.isRunning) {
      return confirm(t('batchConfirmCloseRunning') || 'Çeviri işlemi arka planda devam ediyor. Pencereyi kapatmak istiyor musunuz?')
    }
    return true
  }

  private resetState(): void {
    this.isRunning = false
    this.isPaused = false
    this.isCancelled = false
    this.currentIndex = 0
    this.successCount = 0
    this.errorCount = 0
    this.targetEntries = []
  }

  private bindBatchEvents(): void {
    document.getElementById('btn-batch-close')?.addEventListener('click', () => this.close())
    document.getElementById('btn-batch-cancel-cfg')?.addEventListener('click', () => this.close())

    document.getElementById('btn-batch-start')?.addEventListener('click', () => this.startBatch())
    document.getElementById('btn-batch-pause')?.addEventListener('click', () => this.togglePause())
    document.getElementById('btn-batch-stop')?.addEventListener('click', () => this.stopBatch())

    document.querySelectorAll<HTMLInputElement>('input[name="batch-scope"]').forEach(radio => {
      radio.addEventListener('change', () => this.updateScopeCounts())
    })
  }

  private updateScopeCounts(): void {
    const scopeRadio = document.querySelector<HTMLInputElement>('input[name="batch-scope"]:checked')
    const scope = scopeRadio ? scopeRadio.value : 'untranslated'
    const overwrite = (document.getElementById('batch-overwrite') as HTMLInputElement)?.checked

    let count = 0
    if (scope === 'untranslated') {
      count = this.store.getUntranslated().length
    } else if (scope === 'page') {
      count = overwrite
        ? this.currentPageEntries.length
        : this.currentPageEntries.filter(e => !e.value.trim()).length
    } else if (scope === 'all') {
      count = overwrite
        ? this.store.total
        : this.store.getUntranslated().length
    }

    const countEl = document.getElementById('batch-target-count')
    if (countEl) countEl.textContent = `${count} ${t('statsEntries')}`
  }

  private showConfigView(): void {
    const cfgEl = document.getElementById('batch-view-config')
    const progEl = document.getElementById('batch-view-progress')
    if (cfgEl) cfgEl.style.display = 'block'
    if (progEl) progEl.style.display = 'none'
  }

  private showProgressView(): void {
    const cfgEl = document.getElementById('batch-view-config')
    const progEl = document.getElementById('batch-view-progress')
    if (cfgEl) cfgEl.style.display = 'none'
    if (progEl) progEl.style.display = 'block'
  }

  private async startBatch(): Promise<void> {
    const scopeRadio = document.querySelector<HTMLInputElement>('input[name="batch-scope"]:checked')
    const scope = scopeRadio ? scopeRadio.value : 'untranslated'
    const overwrite = (document.getElementById('batch-overwrite') as HTMLInputElement)?.checked

    let list: TranslationEntry[] = []
    if (scope === 'untranslated') {
      list = this.store.getUntranslated()
    } else if (scope === 'page') {
      list = overwrite
        ? [...this.currentPageEntries]
        : this.currentPageEntries.filter(e => !e.value.trim())
    } else if (scope === 'all') {
      list = overwrite
        ? [...this.store.getAll()]
        : this.store.getUntranslated()
    }

    if (list.length === 0) {
      alert(t('batchNoEntries') || 'Çevrilecek girdi bulunamadı.')
      return
    }

    this.targetEntries = list
    this.isRunning = true
    this.isPaused = false
    this.isCancelled = false
    this.currentIndex = 0
    this.successCount = 0
    this.errorCount = 0

    this.showProgressView()
    this.updateProgressUI()

    const logList = document.getElementById('batch-live-log')
    if (logList) logList.innerHTML = ''

    // Asenkron Çeviri Döngüsü
    for (let i = 0; i < this.targetEntries.length; i++) {
      if (this.isCancelled) break

      // Duraklatılmışsa bekle
      while (this.isPaused && !this.isCancelled) {
        await this.sleep(200)
      }
      if (this.isCancelled) break

      this.currentIndex = i
      const entry = this.targetEntries[i]
      this.updateProgressUI(entry.key)

      try {
        const translated = await this.service.translate(entry.key)
        if (translated) {
          this.store.update(entry.key, translated)
          this.store.saveToLocalStorage()
          this.successCount++
          this.onEntryTranslated?.(entry.key, translated)
          this.appendLog(entry.key, translated, 'success')
        } else {
          this.errorCount++
          this.appendLog(entry.key, 'Boş yanıt alındı', 'error')
        }
      } catch (err) {
        this.errorCount++
        const msg = err instanceof Error ? err.message : String(err)
        this.appendLog(entry.key, msg, 'error')
      }

      this.updateProgressUI()

      // API limitlerine takılmamak için 180ms bekleme
      await this.sleep(180)
    }

    this.isRunning = false
    this.updateProgressUI()
    this.onFinished?.(this.successCount)

    const stopBtn = document.getElementById('btn-batch-stop')
    const pauseBtn = document.getElementById('btn-batch-pause')
    if (stopBtn) stopBtn.textContent = t('settingsClose')
    if (pauseBtn) pauseBtn.style.display = 'none'
  }

  private togglePause(): void {
    if (!this.isRunning) return
    this.isPaused = !this.isPaused
    const pauseBtn = document.getElementById('btn-batch-pause')
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused
        ? `▶️ ${t('batchResume')}`
        : `⏸️ ${t('batchPause')}`
    }
  }

  private stopBatch(): void {
    if (!this.isRunning) {
      this.close()
      return
    }
    if (confirm(t('batchConfirmStop'))) {
      this.isCancelled = true
      this.isRunning = false
      this.close()
    }
  }

  private updateProgressUI(currentKeyText?: string): void {
    const total = this.targetEntries.length
    const current = this.currentIndex + (this.isRunning ? 1 : 0)
    const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

    const barEl = document.getElementById('batch-progress-fill')
    const pctEl = document.getElementById('batch-pct-val')
    const countEl = document.getElementById('batch-count-val')
    const currentEl = document.getElementById('batch-current-text')

    if (barEl) barEl.style.width = `${pct}%`
    if (pctEl) pctEl.textContent = `%${pct}`
    if (countEl) countEl.textContent = `${current} / ${total}`

    if (currentEl && currentKeyText) {
      currentEl.textContent = currentKeyText
    }
  }

  private appendLog(key: string, result: string, status: 'success' | 'error'): void {
    const logList = document.getElementById('batch-live-log')
    if (!logList) return

    const row = document.createElement('div')
    row.className = `batch-log-item log-${status}`

    const keySpan = document.createElement('span')
    keySpan.className = 'log-key'
    keySpan.textContent = key

    const resSpan = document.createElement('span')
    resSpan.className = 'log-res'
    resSpan.textContent = result

    row.appendChild(keySpan)
    row.appendChild(resSpan)

    logList.insertBefore(row, logList.firstChild)
    if (logList.children.length > 50) {
      logList.removeChild(logList.lastChild!)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  refreshTexts(): void {
    const titleEl = document.getElementById('batch-title')
    const subTitleEl = document.getElementById('batch-subtitle')
    const btnStart = document.getElementById('btn-batch-start')
    const btnCancel = document.getElementById('btn-batch-cancel-cfg')

    if (titleEl) titleEl.textContent = t('batchTitle')
    if (subTitleEl) subTitleEl.textContent = t('batchSubtitle')
    if (btnStart) btnStart.textContent = `🚀 ${t('batchStart')}`
    if (btnCancel) btnCancel.textContent = t('mergeCancel')

    const lblScope = document.getElementById('lbl-batch-scope')
    const lblScopeUntranslated = document.getElementById('lbl-scope-untranslated')
    const lblScopePage = document.getElementById('lbl-scope-page')
    const lblScopeAll = document.getElementById('lbl-scope-all')
    const lblOverwrite = document.getElementById('lbl-batch-overwrite')
    const lblTotalPrompt = document.getElementById('lbl-batch-total-prompt')
    const lblActive = document.getElementById('lbl-batch-active')
    const lblStreamLog = document.getElementById('lbl-batch-stream-log')
    const btnPause = document.getElementById('btn-batch-pause')
    const btnStop = document.getElementById('btn-batch-stop')

    if (lblScope) lblScope.textContent = t('batchScope')
    if (lblScopeUntranslated) lblScopeUntranslated.textContent = t('batchScopeUntranslated')
    if (lblScopePage) lblScopePage.textContent = t('batchScopePage')
    if (lblScopeAll) lblScopeAll.textContent = t('batchScopeAll')
    if (lblOverwrite) lblOverwrite.textContent = t('batchOverwrite')
    if (lblTotalPrompt) lblTotalPrompt.textContent = t('batchTotalPrompt')
    if (lblActive) lblActive.textContent = t('batchActive')
    if (lblStreamLog) lblStreamLog.textContent = t('batchStreamLog')
    if (btnPause && !this.isRunning) btnPause.textContent = `⏸️ ${t('batchPause')}`
    if (btnStop && !this.isRunning) btnStop.textContent = `⏹️ ${t('batchStop')}`
  }

}
