/**
 * App — Ana Uygulama Bağlayıcı Sınıfı.
 * - Sol sidebar: entry listesi + 50'lik sayfalandırma (PaginationController)
 * - Sağ üst: source text (chips + akıllı sözlük vurgulamaları)
 * - Sağ alt: target textarea + sözlük önerileri (Glossary) + Otomatik Çevir (MT)
 * - WelcomeScreen: Ayrı modül karşılama ekranı
 * - SplitterController: Boyutlandırılabilir paneller
 * - DictionaryPanel & Store: Terimler Sözlüğü (JSON / CSV / TSV)
 * - JsonMerger & MergeModal: 3 Aşamalı Akıllı Güncelleme Senkronizasyonu (Diff & Merge)
 * - BatchTranslateModal: Toplu Otomatik Çeviri motoru
 * - StatsModal: Proje İstatistikleri ve Kelime Analizi
 * - TranslationService: Google Translate / DeepL API
 * - Validator: Frekans sayımlı etiket + Sözlük QA kontrolü
 */

import { ElectronBridge } from './bridge/ElectronBridge'
import { TranslationStore, TranslationEntry } from './store/TranslationStore'
import { RecentFilesStore } from './store/RecentFilesStore'
import { DictionaryStore } from './store/DictionaryStore'
import { TranslationService } from './services/TranslationService'
import { JsonMerger, MergeResult } from './core/JsonMerger'
import { PlaceholderParser, Token } from './core/PlaceholderParser'
import { Validator } from './core/Validator'
import { ProgressBar } from './ui/ProgressBar'
import { FilterController, FilterMode } from './ui/FilterController'
import { SearchController } from './ui/SearchController'
import { SettingsPanel } from './ui/SettingsPanel'
import { WelcomeScreen } from './ui/WelcomeScreen'
import { SplitterController } from './ui/Splitter'
import { PaginationController } from './ui/PaginationController'
import { DictionaryPanel } from './ui/DictionaryPanel'
import { SelectionTooltip } from './ui/SelectionTooltip'
import { MergeModal } from './ui/MergeModal'
import { StatsModal } from './ui/StatsModal'
import { BatchTranslateModal } from './ui/BatchTranslateModal'
import { FindReplaceModal } from './ui/FindReplaceModal'
import { i18n, t } from './i18n/i18n'


export class App {
  private bridge: ElectronBridge
  private store: TranslationStore
  private recentFiles: RecentFilesStore
  private dictionaryStore: DictionaryStore
  private translationService: TranslationService
  private parser: PlaceholderParser
  private validator: Validator
  private progressBar: ProgressBar
  private filter: FilterController
  private search: SearchController
  private settings: SettingsPanel
  private dictionaryPanel: DictionaryPanel
  private welcomeScreen: WelcomeScreen
  private splitter: SplitterController
  private pagination: PaginationController
  private selectionTooltip: SelectionTooltip
  private mergeModal: MergeModal
  private statsModal: StatsModal
  private batchModal: BatchTranslateModal
  private findReplaceModal: FindReplaceModal

  // DOM referansları

  private editorSection!: HTMLElement
  private entryList!: HTMLElement
  private detailEmpty!: HTMLElement
  private detailHeader!: HTMLElement
  private detailKeyLabel!: HTMLElement
  private sourcePanel!: HTMLElement
  private sourceContent!: HTMLElement
  private targetPanel!: HTMLElement
  private targetTextarea!: HTMLTextAreaElement
  private btnAutoTranslate!: HTMLButtonElement
  private btnTranslateText!: HTMLElement
  private glossaryBar!: HTMLElement
  private glossaryChips!: HTMLElement
  private validationMsg!: HTMLElement
  private statusEl!: HTMLElement

  // State
  private currentKey: string | null = null
  private visibleKeys: string[] = [] // filtrelenmiş tüm anahtarlar
  private filteredEntries: TranslationEntry[] = [] // filtrelenmiş tüm girdiler

  constructor() {
    this.bridge             = new ElectronBridge()
    this.store              = new TranslationStore()
    this.recentFiles        = new RecentFilesStore()
    this.dictionaryStore    = new DictionaryStore()
    this.translationService = new TranslationService()
    this.parser             = new PlaceholderParser()
    this.validator          = new Validator(this.dictionaryStore)
    this.progressBar        = new ProgressBar('#progress-bar-fill', '#progress-text')
    this.filter             = new FilterController('#sidebar-toolbar')
    this.search             = new SearchController('#search-input')
    this.settings           = new SettingsPanel(this.translationService)
    this.dictionaryPanel    = new DictionaryPanel(this.dictionaryStore)
    this.mergeModal         = new MergeModal()
    this.statsModal         = new StatsModal(this.store, this.validator)
    this.batchModal         = new BatchTranslateModal(this.translationService, this.store)
    this.findReplaceModal   = new FindReplaceModal(this.store)

    // Seçilen metin üzerinde beliren "Sözlüğe Ekle" dropdown / tooltip'i
    this.selectionTooltip = new SelectionTooltip((selectedText) => {
      this.dictionaryPanel.open(selectedText)
    })

    // DOM öğeleri
    this.editorSection    = document.getElementById('editor-section')!
    this.entryList        = document.getElementById('entry-list')!
    this.detailEmpty      = document.getElementById('detail-empty')!
    this.detailHeader     = document.getElementById('detail-header')!
    this.detailKeyLabel   = document.getElementById('detail-key-label')!
    this.sourcePanel      = document.getElementById('source-panel')!
    this.sourceContent    = document.getElementById('source-content')!
    this.targetPanel      = document.getElementById('target-panel')!
    this.targetTextarea   = document.getElementById('target-textarea') as HTMLTextAreaElement
    this.btnAutoTranslate = document.getElementById('btn-auto-translate') as HTMLButtonElement
    this.btnTranslateText = document.getElementById('btn-translate-text')!
    this.glossaryBar      = document.getElementById('glossary-bar')!
    this.glossaryChips    = document.getElementById('glossary-chips')!
    this.validationMsg    = document.getElementById('validation-msg')!
    this.statusEl         = document.getElementById('status-msg')!

    // Ayrı Karşılama Ekranı Modülü
    this.welcomeScreen = new WelcomeScreen('dropzone', this.recentFiles, {
      onOpenFile: () => this.openFile(),
      onOpenFilePath: (filePath) => this.openFilePath(filePath),
    })

    // Boyutlandırılabilir Panel Yöneticisi
    this.splitter = new SplitterController()

    // 50'lik Sayfalandırma Yöneticisi
    this.pagination = new PaginationController('sidebar-pagination', 50, {
      onPageChange: () => this.renderSidebarPage(),
    })

    this.bindEvents()

    // Sayfa yüklenince i18n uygula
    i18n.applyAll()

    // Dil değişiminde dinamik stringleri güncelle
    this.settings.onLangChange = () => this.refreshDynamicStrings()

    // Sözlük güncellendiğinde önerileri, vurguları ve doğrulamayı yenile
    this.dictionaryPanel.onTermsChange = () => {
      if (this.currentKey) {
        this.renderSourceContent(this.currentKey)
        this.renderGlossaryMatches(this.currentKey)
        this.updateValidation(this.currentKey, this.targetTextarea.value)
      }
      this.renderSidebar(false)
    }

    // Güncelleme Birleştirme onaylandığında
    this.mergeModal.onConfirm = (result) => {
      this.applyMergeResult(result)
    }

    // Toplu çeviri olayları
    this.batchModal.onEntryTranslated = (key, value) => {
      this.refreshSidebarItem(key)
      this.updateProgress()
      if (this.currentKey === key) {
        this.targetTextarea.value = value
        this.updateValidation(key, value)
      }
    }

    this.batchModal.onFinished = (totalSuccess) => {
      this.renderSidebar(false)
      this.updateProgress()
      this.updateTitle()
      this.setStatus(`${t('batchCompleted')} ${totalSuccess}`)
    }

    // Bul & Değiştir olayları
    this.findReplaceModal.onSelectEntry = (key) => {
      this.selectEntry(key)
    }

    this.findReplaceModal.onReplaceAll = (count) => {
      this.renderSidebar(false)
      this.updateProgress()
      this.updateTitle()
      if (this.currentKey) {
        const entry = this.store.getAll().find(e => e.key === this.currentKey)
        if (entry) {
          this.targetTextarea.value = entry.value
          this.updateValidation(entry.key, entry.value)
        }
      }
      this.setStatus(`${count} ${t('findReplacedMsg')}`)
    }
  }


  // ═══════════════════════════════
  // Event bağlama
  // ═══════════════════════════════
  private bindEvents(): void {
    document.getElementById('btn-open')?.addEventListener('click', () => this.openFile())
    document.getElementById('btn-save')?.addEventListener('click', () => this.save())
    document.getElementById('btn-save-as')?.addEventListener('click', () => this.saveAs())
    document.getElementById('btn-prev')?.addEventListener('click', () => this.navigateRelative(-1))
    document.getElementById('btn-next')?.addEventListener('click', () => this.navigateRelative(1))
    document.getElementById('btn-dictionary')?.addEventListener('click', () => this.dictionaryPanel.toggle())
    document.getElementById('btn-find-replace')?.addEventListener('click', () => this.openFindReplace())
    document.getElementById('btn-merge')?.addEventListener('click', () => this.handleMergeUpdate())
    document.getElementById('btn-stats')?.addEventListener('click', () => this.openStats())
    document.getElementById('btn-batch-translate')?.addEventListener('click', () => this.openBatchTranslate())
    document.getElementById('btn-settings')?.addEventListener('click', () => this.settings.open())
    document.getElementById('btn-settings-close-footer')?.addEventListener('click', () => this.settings.close())
    this.btnAutoTranslate?.addEventListener('click', () => this.handleAutoTranslate())

    // Textarea değişimi
    this.targetTextarea.addEventListener('input', () => this.onTargetInput())

    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault(); this.saveAs()
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault(); this.save()
      } else if (e.ctrlKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault(); this.openFindReplace()
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault(); this.saveAndNext()
      } else if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault(); this.handleAutoTranslate()
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault(); this.navigateRelative(1)
      } else if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault(); this.navigateRelative(-1)
      }
    })

    this.filter.onChange(() => { this.renderSidebar(true); this.clearDetail() })
    this.search.onChange(() => { this.renderSidebar(true); this.clearDetail() })
  }

  // ═══════════════════════════════
  // Bul & Değiştir Modalı (Ctrl+H)
  // ═══════════════════════════════
  private openFindReplace(): void {
    if (this.store.total === 0) {
      this.setStatus(t('mustOpenFirst'), true)
      return
    }
    this.findReplaceModal.open()
  }

  // ═══════════════════════════════
  // İstatistikler Modalı
  // ═══════════════════════════════

  private openStats(): void {
    if (this.store.total === 0) {
      this.setStatus(t('mustOpenFirst'), true)
      return
    }
    this.statsModal.open()
  }

  // ═══════════════════════════════
  // Toplu Otomatik Çeviri (Batch MT)
  // ═══════════════════════════════
  private openBatchTranslate(): void {
    if (this.store.total === 0) {
      this.setStatus(t('mustOpenFirst'), true)
      return
    }
    const { start, end } = this.pagination.range
    this.batchModal.currentPageEntries = this.filteredEntries.slice(start, end)
    this.batchModal.open()
  }

  // ═══════════════════════════════
  // Güncelleme Birleştirme (Diff & Merge)
  // ═══════════════════════════════
  private async handleMergeUpdate(): Promise<void> {
    if (this.store.total === 0) {
      this.setStatus(t('mustOpenFirst'), true)
      return
    }

    try {
      const result = await this.bridge.openFile()
      if (!result || !result.content) return

      const mergeResult = JsonMerger.merge(this.store.getAll(), result.content)
      this.mergeModal.openWithResult(mergeResult)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[handleMergeUpdate]', msg)
      this.setStatus(`${t('mergeError')} ${msg}`, true)
    }
  }


  private applyMergeResult(mergeResult: MergeResult): void {
    this.store.applyMerge(mergeResult.entries)
    this.showEditor()
    this.renderSidebar(true)
    this.updateProgress()
    this.updateTitle()
    this.setStatus(`${t('mergeSuccess')} ${mergeResult.stats.totalNew}`)

    const first = this.store.getUntranslated()[0] ?? this.store.getAll()[0]
    if (first) this.selectEntry(first.key)
  }

  // ═══════════════════════════════
  // Tekil Otomatik Çeviri (Machine Translation)
  // ═══════════════════════════════
  private async handleAutoTranslate(): Promise<void> {
    if (!this.currentKey) return
    const sourceText = this.currentKey

    if (this.btnAutoTranslate) {
      this.btnAutoTranslate.disabled = true
      this.btnAutoTranslate.classList.add('loading')
      if (this.btnTranslateText) this.btnTranslateText.textContent = t('translating')
    }

    try {
      const translated = await this.translationService.translate(sourceText)
      if (translated) {
        this.targetTextarea.value = translated
        this.onTargetInput()
        this.setStatus(t('translateSuccess'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[handleAutoTranslate]', msg)
      this.setStatus(msg, true)
    } finally {
      if (this.btnAutoTranslate) {
        this.btnAutoTranslate.disabled = false
        this.btnAutoTranslate.classList.remove('loading')
        if (this.btnTranslateText) this.btnTranslateText.textContent = t('autoTranslate')
      }
    }
  }

  // ═══════════════════════════════
  // Dosya işlemleri
  // ═══════════════════════════════
  private async openFile(): Promise<void> {
    try {
      const result = await this.bridge.openFile()
      if (!result) return
      this.store.loadFromJson(result.content, result.path)
      this.recentFiles.add(result.path)
      this.welcomeScreen.renderRecentFiles()
      if (this.store.restoreFromLocalStorage(result.path)) {
        this.setStatus(t('draftRestored'))
      }
      this.showEditor()
      this.renderSidebar(true)
      this.updateProgress()
      this.updateTitle()
      const first = this.store.getUntranslated()[0] ?? this.store.getAll()[0]
      if (first) this.selectEntry(first.key)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[openFile]', msg)
      this.setStatus(`${t('openError')} ${msg}`, true)
    }
  }

  private async openFilePath(filePath: string): Promise<void> {
    try {
      const result = await this.bridge.readFile(filePath)
      if (!result || result.content === null || result.content === undefined) {
        this.setStatus(`${t('fileNotFound')}: ${filePath}`, true)
        return
      }
      this.store.loadFromJson(result.content, result.path)
      this.recentFiles.add(result.path)
      this.welcomeScreen.renderRecentFiles()
      if (this.store.restoreFromLocalStorage(result.path)) {
        this.setStatus(t('draftRestored'))
      }
      this.showEditor()
      this.renderSidebar(true)
      this.updateProgress()
      this.updateTitle()
      const first = this.store.getUntranslated()[0] ?? this.store.getAll()[0]
      if (first) this.selectEntry(first.key)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[openFilePath]', msg)
      this.setStatus(`${t('openError')} ${msg}`, true)
    }
  }

  private async save(): Promise<void> {
    if (this.currentKey) {
      this.store.update(this.currentKey, this.targetTextarea.value)
    }
    if (!this.store.currentFilePath) { await this.saveAs(); return }
    const res = await this.bridge.saveFile(this.store.currentFilePath, this.store.serialize())
    if (res.success) {
      this.store.markSaved()
      this.recentFiles.add(this.store.currentFilePath)
      this.setStatus(t('saved'))
      this.updateTitle()
    } else {
      this.setStatus(`${t('saveError')} ${res.error}`, true)
    }
  }

  private async saveAs(): Promise<void> {
    if (this.currentKey) this.store.update(this.currentKey, this.targetTextarea.value)
    const res = await this.bridge.saveFileAs(this.store.serialize(), this.store.fileName)
    if (res) {
      this.store.markSaved(res.path)
      this.recentFiles.add(res.path)
      this.setStatus(t('savedAs'))
      this.updateTitle()
    }
  }

  private saveAndNext(): void {
    if (this.currentKey) {
      this.store.update(this.currentKey, this.targetTextarea.value)
      this.store.saveToLocalStorage()
    }
    this.save()
    this.navigateRelative(1)
  }

  // ═══════════════════════════════
  // Sidebar render (50'lik Sayfalı)
  // ═══════════════════════════════
  private renderSidebar(resetPage = false): void {
    const mode = this.filter.mode as FilterMode
    let entries =
      mode === 'untranslated' ? this.store.getUntranslated()
      : mode === 'translated' ? this.store.getTranslated()
      : mode === 'errors' ? this.store.getAll().filter(e => {
          if (!e.value.trim()) return false
          return this.validator.validate(e.key, e.value).level === 'error'
        })
      : mode === 'warnings' ? this.store.getAll().filter(e => {
          if (!e.value.trim()) return false
          return this.validator.validate(e.key, e.value).level === 'warning'
        })
      : this.store.getAll()

    entries = entries.filter(e =>
      this.search.matches(e.key) || this.search.matches(e.value)
    )

    this.filteredEntries = entries
    this.visibleKeys = entries.map(e => e.key)

    this.pagination.setTotal(entries.length, resetPage)
    this.renderSidebarPage()
    this.updateIssueCounts()
  }


  private renderSidebarPage(): void {
    this.entryList.innerHTML = ''

    if (this.filteredEntries.length === 0) {
      const el = document.createElement('div')
      el.className = 'empty-msg'
      el.textContent = t('noResults')
      this.entryList.appendChild(el)
      return
    }

    const { start, end } = this.pagination.range
    const pageEntries = this.filteredEntries.slice(start, end)

    const frag = document.createDocumentFragment()
    for (const entry of pageEntries) {
      frag.appendChild(this.buildSidebarItem(entry))
    }
    this.entryList.appendChild(frag)

    // Aktif eleman bu sayfadaysa görünür yap
    if (this.currentKey) {
      const activeItem = this.entryList.querySelector<HTMLElement>(
        `.sidebar-item[data-key="${CSS.escape(this.currentKey)}"]`
      )
      activeItem?.classList.add('active')
    }
  }

  private buildSidebarItem(entry: TranslationEntry): HTMLElement {
    const item = document.createElement('div')
    item.className = 'sidebar-item' + (entry.key === this.currentKey ? ' active' : '')
    item.dataset.key = entry.key

    // Durum noktası
    const dot = document.createElement('span')
    dot.className = 'sidebar-dot'
    if (entry.value.trim()) {
      const vr = this.validator.validate(entry.key, entry.value)
      dot.classList.add(vr.level === 'error' ? 'error' : vr.level === 'warning' ? 'warning' : 'translated')
    }

    // Metin
    const textWrap = document.createElement('div')
    textWrap.className = 'sidebar-text'

    const keyEl = document.createElement('div')
    keyEl.className = 'sidebar-key'
    keyEl.textContent = entry.key

    const valEl = document.createElement('div')
    valEl.className = 'sidebar-val' + (entry.value.trim() ? '' : ' empty')
    valEl.textContent = entry.value.trim() || t('untranslatedLabel')

    textWrap.appendChild(keyEl)
    textWrap.appendChild(valEl)
    item.appendChild(dot)
    item.appendChild(textWrap)

    item.addEventListener('click', () => this.selectEntry(entry.key))
    return item
  }

  // ═══════════════════════════════
  // Girdi seçimi
  // ═══════════════════════════════
  selectEntry(key: string): void {
    if (this.currentKey && this.currentKey !== key) {
      this.store.update(this.currentKey, this.targetTextarea.value)
      this.refreshSidebarItem(this.currentKey)
    }

    this.currentKey = key
    const entry = this.store.getAll().find(e => e.key === key)
    if (!entry) return

    // Elemanın hangi sayfada olduğunu bulup gerekiyorsa o sayfaya geç
    const itemIdx = this.visibleKeys.indexOf(key)
    if (itemIdx >= 0) {
      const targetPage = this.pagination.getPageForIndex(itemIdx)
      if (targetPage !== this.pagination.page) {
        this.pagination.goToPage(targetPage, false)
        this.renderSidebarPage()
      }
    }

    // Sidebar aktif item
    this.entryList.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'))
    const activeItem = this.entryList.querySelector<HTMLElement>(`.sidebar-item[data-key="${CSS.escape(key)}"]`)
    activeItem?.classList.add('active')
    activeItem?.scrollIntoView({ block: 'nearest' })

    // Detail header
    this.detailEmpty.style.display = 'none'
    this.detailHeader.classList.add('visible')
    this.detailKeyLabel.textContent = key
    this.detailKeyLabel.title = key

    // Source panel (İnteraktif Sözlük Vurgulaması Dahil)
    this.sourcePanel.classList.add('visible')
    this.renderSourceContent(key)

    // Sözlük eşleşmeleri (Glossary Suggestions)
    this.renderGlossaryMatches(key)

    // Target panel
    this.targetPanel.classList.add('visible')
    this.targetTextarea.value = entry.value
    this.targetTextarea.focus()

    // Validation
    this.updateValidation(key, entry.value)
  }

  /**
   * Kaynak metni token'lara ve sözlük terimlerine göre render eder.
   * Sözlükteki terimler vurgulanır ve tıklandığında çeviriye yapıştırılır.
   */
  private renderSourceContent(key: string): void {
    this.sourceContent.innerHTML = ''
    const tokens: Token[] = this.parser.tokenize(key)

    for (const token of tokens) {
      if (token.type !== 'text') {
        // Yer tutucu veya etiket
        const chip = document.createElement('span')
        chip.className = `chip chip-${token.type}`
        chip.textContent = token.value
        chip.title = t('chipTooltip')
        chip.addEventListener('click', () => this.insertAtCursor(token.value))
        this.sourceContent.appendChild(chip)
      } else {
        // Düz metin: sözlük terimlerini ara ve vurgula
        const matches = this.dictionaryStore.findMatchesWithOffsets(token.value)
        if (matches.length === 0) {
          this.sourceContent.appendChild(document.createTextNode(token.value))
        } else {
          let lastIdx = 0
          for (const m of matches) {
            if (m.start > lastIdx) {
              this.sourceContent.appendChild(
                document.createTextNode(token.value.slice(lastIdx, m.start))
              )
            }
            const span = document.createElement('span')
            span.className = 'glossary-highlight'
            span.textContent = m.matchedText
            span.title = `${t('termTooltip')}: "${m.adaptedTarget}"`
            span.addEventListener('click', () => {
              this.insertAtCursor(m.adaptedTarget)
            })
            this.sourceContent.appendChild(span)
            lastIdx = m.end
          }
          if (lastIdx < token.value.length) {
            this.sourceContent.appendChild(
              document.createTextNode(token.value.slice(lastIdx))
            )
          }
        }
      }
    }
  }

  /** Kaynak metinde geçen sözlük terimlerini öneri olarak gösterir */
  private renderGlossaryMatches(key: string): void {
    if (!this.glossaryBar || !this.glossaryChips) return

    const matches = this.dictionaryStore.findMatches(key)
    this.glossaryChips.innerHTML = ''

    if (matches.length === 0) {
      this.glossaryBar.classList.remove('visible')
      return
    }

    this.glossaryBar.classList.add('visible')
    matches.forEach(term => {
      const adapted = this.dictionaryStore.matchCase(term.source, term.target)
      const chip = document.createElement('span')
      chip.className = 'glossary-chip'
      chip.title = `${t('insertTerm')}: "${adapted}"`
      chip.innerHTML = `
        <span class="chip-src">${term.source}</span>
        <span class="chip-arrow">→</span>
        <span class="chip-tgt">${adapted}</span>
      `
      chip.addEventListener('click', () => {
        this.insertAtCursor(adapted)
      })
      this.glossaryChips.appendChild(chip)
    })
  }

  private insertAtCursor(text: string): void {
    const ta = this.targetTextarea
    const pos = ta.selectionStart ?? ta.value.length
    const before = ta.value.slice(0, pos)
    const after  = ta.value.slice(pos)
    ta.value = before + text + after
    ta.selectionStart = ta.selectionEnd = pos + text.length
    ta.focus()
    this.onTargetInput()
  }

  private onTargetInput(): void {
    const key = this.currentKey
    if (!key) return
    const val = this.targetTextarea.value
    this.store.update(key, val)
    this.store.saveToLocalStorage()
    this.updateValidation(key, val)
    this.updateProgress()
    this.updateTitle()
    this.refreshSidebarItem(key)
    this.updateIssueCounts()
  }

  private updateValidation(key: string, value: string): void {
    const res = this.validator.validate(key, value)
    this.validationMsg.textContent = res.messages.join(' | ')
    this.validationMsg.className = `val-${res.level}`
  }

  private refreshSidebarItem(key: string): void {
    const item = this.entryList.querySelector<HTMLElement>(`.sidebar-item[data-key="${CSS.escape(key)}"]`)
    if (!item) return
    const entry = this.store.getAll().find(e => e.key === key)
    if (!entry) return

    const dot = item.querySelector<HTMLElement>('.sidebar-dot')!
    dot.className = 'sidebar-dot'
    if (entry.value.trim()) {
      const vr = this.validator.validate(key, entry.value)
      dot.classList.add(vr.level === 'error' ? 'error' : vr.level === 'warning' ? 'warning' : 'translated')
    }

    const valEl = item.querySelector<HTMLElement>('.sidebar-val')!
    valEl.textContent = entry.value.trim() || t('untranslatedLabel')
    valEl.className = 'sidebar-val' + (entry.value.trim() ? '' : ' empty')
  }

  // ═══════════════════════════════
  // Navigasyon
  // ═══════════════════════════════
  private navigateRelative(delta: number): void {
    if (!this.currentKey) {
      if (this.visibleKeys.length > 0) this.selectEntry(this.visibleKeys[0])
      return
    }
    const idx = this.visibleKeys.indexOf(this.currentKey)
    const next = this.visibleKeys[idx + delta]
    if (next) this.selectEntry(next)
  }

  // ═══════════════════════════════
  // Yardımcılar
  // ═══════════════════════════════
  private clearDetail(): void {
    this.currentKey = null
    this.detailEmpty.style.display = ''
    this.detailHeader.classList.remove('visible')
    this.sourcePanel.classList.remove('visible')
    this.targetPanel.classList.remove('visible')
    this.glossaryBar?.classList.remove('visible')
  }

  private showEditor(): void {
    this.welcomeScreen.hide()
    this.editorSection.style.display = 'flex'
  }

  private updateProgress(): void {
    this.progressBar.update(this.store.translatedCount, this.store.total)
    this.updateIssueCounts()
  }

  private updateIssueCounts(): void {
    let errorCount = 0
    let warningCount = 0

    for (const entry of this.store.getAll()) {
      if (!entry.value.trim()) continue
      const res = this.validator.validate(entry.key, entry.value)
      if (res.level === 'error') errorCount++
      else if (res.level === 'warning') warningCount++
    }

    const badgeErr = document.getElementById('badge-error-count')
    const badgeWarn = document.getElementById('badge-warning-count')

    if (badgeErr) {
      if (errorCount > 0) {
        badgeErr.textContent = errorCount > 99 ? '99+' : String(errorCount)
        badgeErr.title = `${errorCount} ${t('filterErrors')}`
        badgeErr.style.display = 'inline-flex'
      } else {
        badgeErr.textContent = ''
        badgeErr.title = ''
        badgeErr.style.display = 'none'
      }
    }
    if (badgeWarn) {
      if (warningCount > 0) {
        badgeWarn.textContent = warningCount > 99 ? '99+' : String(warningCount)
        badgeWarn.title = `${warningCount} ${t('filterWarnings')}`
        badgeWarn.style.display = 'inline-flex'
      } else {
        badgeWarn.textContent = ''
        badgeWarn.title = ''
        badgeWarn.style.display = 'none'
      }
    }
  }



  private updateTitle(): void {
    const dirty = this.store.isDirty ? '* ' : ''
    this.bridge.setTitle(`${dirty}${this.store.fileName} — JSON Translator`)
  }

  private setStatus(msg: string, isError = false): void {
    if (!this.statusEl) {
      this.statusEl = document.getElementById('status-msg')!
    }
    if (this.statusEl) {
      this.statusEl.textContent = msg
      this.statusEl.className = isError ? 'error' : ''
      setTimeout(() => {
        if (this.statusEl) this.statusEl.textContent = ''
      }, 4000)
    }
  }



  /** Dil değişince dinamik olarak üretilen metinleri yeniler */
  private refreshDynamicStrings(): void {
    // Sidebar boş etiketi
    this.entryList.querySelectorAll<HTMLElement>('.sidebar-val.empty').forEach(el => {
      el.textContent = t('untranslatedLabel')
    })
    // Chip tooltip'leri
    this.sourceContent.querySelectorAll<HTMLElement>('.chip').forEach(chip => {
      chip.title = t('chipTooltip')
    })
    // Boş liste mesajı
    const emptyMsg = this.entryList.querySelector<HTMLElement>('.empty-msg')
    if (emptyMsg) emptyMsg.textContent = t('noResults')
    // Status / Nav buttons
    const prevBtn = document.getElementById('btn-prev')
    const nextBtn = document.getElementById('btn-next')
    if (prevBtn) {
      prevBtn.textContent = t('prevEntry')
      prevBtn.title       = t('prevTitle')
    }
    if (nextBtn) {
      nextBtn.textContent = t('nextEntry')
      nextBtn.title       = t('nextTitle')
    }

    if (this.btnTranslateText) {
      this.btnTranslateText.textContent = t('autoTranslate')
    }

    const btnFind = document.getElementById('btn-find-replace')
    if (btnFind) btnFind.textContent = t('findReplace')

    const btnMerge = document.getElementById('btn-merge')
    if (btnMerge) btnMerge.textContent = t('mergeUpdate')

    const btnBatch = document.getElementById('btn-batch-translate')
    if (btnBatch) btnBatch.textContent = t('batchTranslate')

    const btnStats = document.getElementById('btn-stats')
    if (btnStats) btnStats.textContent = t('stats')

    // Karşılama ekranını güncelle
    this.welcomeScreen.refreshDynamicStrings()

    // Sayfalandırmayı güncelle
    this.pagination.render()

    // Sözlük panelini güncelle
    this.dictionaryPanel.refreshTexts()

    // Ayarlar panelini güncelle
    this.settings.refreshTexts()

    // Bul ve Değiştir modalını güncelle
    this.findReplaceModal.refreshTexts()

    // Birleştirme modalını güncelle
    this.mergeModal.refreshTexts()

    // İstatistik modalını güncelle
    this.statsModal.refreshTexts()

    // Toplu çeviri modalını güncelle
    this.batchModal.refreshTexts()


    // Aktif çevirideki sözlük önerilerini ve vurguları güncelle
    if (this.currentKey) {
      this.renderSourceContent(this.currentKey)
      this.renderGlossaryMatches(this.currentKey)
    }
  }
}
